import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { abstimmungMail, berlinJetzt, wacheSatz, mailBauen, personVon, fuerPerson } from '../src/abstimmung-mail.js';

// 04.11.2026 ist Winterzeit: 08:30 Berlin = 07:30 UTC
const MORGEN = new Date('2026-11-04T07:35:00Z');
function welt(ok = () => true) {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE abstimmung (id INTEGER PRIMARY KEY, titel TEXT, wer TEXT, stufe TEXT, empfehlung TEXT, antwort_sebi TEXT, antwort_phil TEXT, status TEXT DEFAULT 'offen', wieder_am TEXT, created_at TEXT DEFAULT '2026-11-04');
          CREATE TABLE nachrichten (id INTEGER PRIMARY KEY, titel TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')));
          CREATE TABLE tickets (id INTEGER PRIMARY KEY, title TEXT, owner TEXT, status TEXT DEFAULT 'offen', due TEXT);
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
  assert.equal(w.post[0].mail.subject, 'Heute: 2 Entscheidungen');
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

const SEBI = 'sebastian@social2scale.com', PHIL = 'philipp@social2scale.com';
const mitPersonen = (w) => { w.env.NOTIFY_TO = `${SEBI}, ${PHIL}`; frisch(w); return w; };

test('jeder bekommt seine eigene Mail: eigener Gruß, eigene Farbe, nur seine Fragen', async () => {
  const w = mitPersonen(welt());
  w.s.exec(`INSERT INTO abstimmung (titel, wer, empfehlung, stufe) VALUES ('Digistore: Anzahlung?', 'sebi', 'Später', NULL), ('Leads: Sperrliste?', 'beide', 'Ja', 'rot'), ('Kyra: Preis nennen?', 'phil', 'Nein', NULL)`);
  await abstimmungMail(w.env, MORGEN, w.versand);
  const [s, p] = w.post;
  assert.match(s.mail.htmlContent, /Guten Morgen, Sebi/);
  assert.match(s.mail.htmlContent, /border-top:3px solid #1FC998/);
  assert.match(s.mail.htmlContent, /Anzahlung/);
  assert.doesNotMatch(s.mail.htmlContent, /Preis nennen/);
  assert.match(p.mail.htmlContent, /Guten Morgen, Phil/);
  assert.match(p.mail.htmlContent, /border-top:3px solid #5FB4F0/);
  assert.match(p.mail.htmlContent, /Preis nennen/);
  assert.doesNotMatch(p.mail.htmlContent, /Anzahlung/);
  assert.match(s.mail.htmlContent, /nicht rückgängig/);
  assert.match(s.mail.htmlContent, /Empfehlung: Später/);
});

test('wer schon geantwortet hat, wird nicht noch einmal gefragt, und ohne Frage bleibt sein Postfach leer', async () => {
  const w = mitPersonen(welt());
  w.s.exec(`INSERT INTO abstimmung (titel, wer, antwort_sebi) VALUES ('Leads: Sperrliste?', 'beide', 'Ja')`);
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'gesendet 1');
  assert.deepEqual(w.post.map((p) => p.an), [PHIL]);
  assert.match(w.post[0].mail.htmlContent, /Sebi: Ja/);
});

test('Phil sieht, was er heute schreibt, Sebi nicht, und Fälliges des anderen fehlt', async () => {
  const w = mitPersonen(welt());
  w.s.exec(`INSERT INTO abstimmung (titel, wer) VALUES ('Leads: Sperrliste?', 'beide');
            INSERT INTO nachrichten (titel, status) VALUES ('An Kirsten: Konzept steht', 'entwurf'), ('An Sabine: alt', 'gesendet');
            INSERT INTO tickets (title, owner, due) VALUES ('Test-Abos kündigen', 'phil', '2026-10-29'), ('Storys posten', 'sebi', '2026-10-16'), ('Später', 'sebi', '2026-12-01'), ('Ohne Frist', 'sebi', '')`);
  await abstimmungMail(w.env, MORGEN, w.versand);
  const [s, p] = w.post;
  assert.match(p.mail.htmlContent, /Das schreibst du heute/);
  assert.match(p.mail.htmlContent, /An Kirsten/);
  assert.doesNotMatch(p.mail.htmlContent, /An Sabine/);
  assert.doesNotMatch(s.mail.htmlContent, /Das schreibst du heute/);
  assert.match(s.mail.htmlContent, /Storys posten/);
  assert.doesNotMatch(s.mail.htmlContent, /Test-Abos/);
  assert.match(p.mail.htmlContent, /Test-Abos/);
  assert.doesNotMatch(s.mail.htmlContent, /Ohne Frist|>Später</);
  assert.equal(p.mail.subject, 'Heute: 1 zu senden, 1 Entscheidung, 1 fällig');
});

test('was nach Zugangsdaten klingt, zählt mit, steht aber nicht in der Mail', () => {
  const m = mailBauen([{ titel: 'Leads: x?', wer: 'phil' }], '', 'phil', {
    entwuerfe: [{ titel: 'An Monika: neues Passwort abc123' }, { titel: 'An Peter: Ausgabe liegt' }],
    faellig: [{ title: 'Kennwort von Nicole ist xyz', owner: 'phil', due: '2026-11-01' }],
  });
  assert.doesNotMatch(m.htmlContent, /abc123|xyz/);
  assert.match(m.htmlContent, /An Peter/);
  assert.match(m.htmlContent, /Und 1 weiterer Entwurf/);
  assert.match(m.subject, /2 zu senden/);
});

test('fehlt eine Nebentabelle, geht die Mail trotzdem raus', async () => {
  const w = mitPersonen(welt());
  w.s.exec(`INSERT INTO abstimmung (titel, wer) VALUES ('Leads: x?', 'sebi'); DROP TABLE tickets`);
  assert.equal(await abstimmungMail(w.env, MORGEN, w.versand), 'gesendet 1');
});

test('Absender werden richtig zugeordnet, Fremde sehen alle Fragen ohne Namen im Gruß', () => {
  assert.equal(personVon(' Sebastian@social2scale.com'), 'sebi');
  assert.equal(personVon('philipp@social2scale.com'), 'phil');
  assert.equal(personVon('sebastianx@web.de'), null);
  assert.equal(fuerPerson([{ wer: 'phil' }, { wer: 'sebi' }], null).fragen.length, 2);
  assert.match(mailBauen([{ titel: 'x', wer: 'phil' }], '').htmlContent, /Guten Morgen</);
});

test('Akquise: Phil sieht nur Zahlen, Sebi nichts, leere Liste keinen Abschnitt', () => {
  const extra = { akquise: { antwort: 2, dran: 1, neu: 24 } };
  const phil = mailBauen([{ titel: 'x', wer: 'phil' }], '', 'phil', extra).htmlContent;
  assert.match(phil, /Akquise/);
  assert.match(phil, /2 Antworten warten/);
  assert.match(phil, /24 Vorschläge/);
  assert.doesNotMatch(mailBauen([{ titel: 'x', wer: 'sebi' }], '', 'sebi', extra).htmlContent, /Akquise/);
  assert.doesNotMatch(mailBauen([{ titel: 'x', wer: 'phil' }], '', 'phil', { akquise: { antwort: 0, dran: 0, neu: 0 } }).htmlContent, /Akquise/);
});
