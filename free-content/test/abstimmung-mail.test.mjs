import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { abstimmungMail, berlinJetzt, wacheSatz } from '../src/abstimmung-mail.js';

// 04.11.2026 ist Winterzeit: 08:30 Berlin = 07:30 UTC
const MORGEN = new Date('2026-11-04T07:35:00Z');
function welt(ok = () => true) {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE abstimmung (id INTEGER PRIMARY KEY, titel TEXT, wer TEXT, status TEXT DEFAULT 'offen', wieder_am TEXT, created_at TEXT DEFAULT '2026-11-04');
          CREATE TABLE abstimmung_stand (schluessel TEXT PRIMARY KEY, wert TEXT DEFAULT '', am TEXT DEFAULT (datetime('now')));`);
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    all: async () => ({ results: s.prepare(sql).all(...args) }),
    first: async () => s.prepare(sql).get(...args) ?? null,
    run: async () => s.prepare(sql).run(...args),
  });
  const post = [];
  const versand = async (env, an, name, mail, absender) => { if (!ok(an)) return false; post.push({ an, mail, absender }); return true; };
  return { s, post, versand, env: { DB: { prepare: (q) => prep(q) }, NOTIFY_TO: 'a@x.de, b@x.de' } };
}
const frisch = (w, am = '2026-11-04 07:00:00') => w.s.prepare(`INSERT INTO abstimmung_stand (schluessel, am) VALUES ('wache_zuletzt', ?)`).run(am);

test('deutsche Uhrzeit in Winter und Sommer', () => {
  assert.equal(berlinJetzt(new Date('2026-11-04T07:30:00Z')).uhr, '08:30');
  assert.equal(berlinJetzt(new Date('2026-07-04T06:30:00Z')).uhr, '08:30');
});

test('um 8:30 genau eine Mail an beide, danach nie wieder an diesem Tag', async () => {
  const w = welt(); frisch(w);
  w.s.exec(`INSERT INTO abstimmung (titel, wer) VALUES ('Leads', 'sebi'), ('<b>Sperrliste</b>', 'beide')`);
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'gesendet 2');
  assert.deepEqual(w.post.map((p) => p.an), ['a@x.de', 'b@x.de']);
  assert.equal(w.post[0].mail.subject, 'Abstimmung: Sebi 1, gemeinsam 1');
  assert.match(w.post[0].mail.htmlContent, /&lt;b&gt;Sperrliste/);
  assert.equal(await abstimmungMail(w.env, new Date('2026-11-04T07:40:00Z'), w.versand), 'gesendet 0');
  assert.equal(w.post.length, 2);
});

test('vor 8:30 und nach 12 Uhr geht nichts raus (Schwelle am echten Wert)', async () => {
  const w = welt(); frisch(w); w.s.exec(`INSERT INTO abstimmung (titel, wer) VALUES ('Leads', 'sebi')`);
  assert.equal(await abstimmungMail(w.env, new Date('2026-11-04T07:29:00Z'), w.versand), 'nicht jetzt');
  assert.equal(await abstimmungMail(w.env, new Date('2026-11-04T11:00:00Z'), w.versand), 'nicht jetzt');
  assert.equal(w.post.length, 0);
});

test('scheitert eine Adresse, versucht der nächste Lauf nur diese', async () => {
  let kaputt = true;
  const w = welt((an) => !(kaputt && an === 'b@x.de')); frisch(w);
  w.s.exec(`INSERT INTO abstimmung (titel, wer) VALUES ('Leads', 'sebi')`);
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'gesendet 1');
  kaputt = false;
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'gesendet 1');
  assert.deepEqual(w.post.map((p) => p.an), ['a@x.de', 'b@x.de']);
});

test('nichts offen und Wache lebt: keine Mail', async () => {
  const w = welt(); frisch(w);
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'nichts an');
});

test('Mac im Flieger: Mail kommt trotzdem und sagt, seit wann niemand liest', async () => {
  const w = welt(); frisch(w, '2026-11-03 01:00:00');
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'gesendet 2');
  assert.match(w.post[0].mail.htmlContent, /seit 31 Stunden nichts gelesen/);
  assert.equal(wacheSatz('2026-11-04 00:00:00', MORGEN), '');  // 7,6 h: normal, kein Alarm
});

test('„Später“ bleibt bis zum Tag ausgeblendet, Entschiedenes zählt nicht', async () => {
  const w = welt(); frisch(w);
  w.s.exec(`INSERT INTO abstimmung (titel, wer, wieder_am) VALUES ('Morgen', 'sebi', '2026-11-05'); INSERT INTO abstimmung (titel, wer, status) VALUES ('Durch', 'sebi', 'entschieden');`);
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'nichts an');
});

test('fehlt die Tabelle, wirft der Cron nicht', async () => {
  const w = welt(); w.s.exec('DROP TABLE abstimmung');
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'fehler');
});

test('hängt am Cron', () => {
  assert.match(readFileSync(new URL('../src/index.js', import.meta.url), 'utf8'), /await abstimmungMail\(env\)/);
});
