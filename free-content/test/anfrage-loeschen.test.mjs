import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { anfragenAufraeumen } from '../src/anfrage-loeschen.js';

// D1-Hülle um echtes SQLite (wie reel-bescheid.test.mjs): dieselbe SQL, keine Attrappe der Abfrage
const JETZT = new Date('2027-11-03T12:00:00Z');
const vorTagen = (n) => new Date(JETZT.getTime() - n * 864e5).toISOString().replace('T', ' ').slice(0, 19);

function welt(brevo = {}) {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE submissions (id INTEGER PRIMARY KEY, type TEXT, client_id INTEGER, email TEXT, created_at TEXT);
          CREATE TABLE events (id INTEGER PRIMARY KEY, client_id INTEGER, title TEXT, note TEXT);
          CREATE TABLE clients (id INTEGER PRIMARY KEY, email TEXT, contact TEXT);`);
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    all: async () => ({ results: s.prepare(sql).all(...args) }),
    run: async () => s.prepare(sql).run(...args),
  });
  const batch = async (l) => { for (const b of l) await b.run(); };
  const rufe = [];
  const holen = async (url, o = {}) => {
    const mail = decodeURIComponent(url.split('/').pop());
    rufe.push(`${o.method || 'GET'} ${mail}`);
    const k = brevo[mail] ?? { status: 404 };
    if ((o.method || 'GET') === 'DELETE') return { ok: (k.loeschen ?? 204) < 300, status: k.loeschen ?? 204 };
    return { ok: k.status < 300, status: k.status, json: async () => k };
  };
  const anfrage = (email, tage, clientId = null) =>
    s.prepare("INSERT INTO submissions (type, client_id, email, created_at) VALUES ('anfrage', ?, ?, ?)").run(clientId, email, vorTagen(tage));
  const termin = (mail) => s.prepare("INSERT INTO events (client_id, title, note) VALUES (NULL, 'Anrufen: Erstgespräch-Anfrage Simone', ?)").run('0151 · ' + mail);
  const env = { DB: { prepare: (q) => prep(q), batch }, BREVO_API_KEY: 'k' };
  const n = (t) => s.prepare(`SELECT count(*) n FROM ${t}`).get().n;
  return { s, env, holen, rufe, anfrage, termin, n };
}

test('Grenze: 366 Tage geht samt Termin und Brevo-Kontakt, 364 Tage bleibt', async () => {
  const w = welt({ 'alt@example.org': { status: 200, listIds: [] } });
  w.anfrage('Alt@Example.org', 366); w.termin('alt@example.org');
  w.anfrage('neu@example.org', 364); w.termin('neu@example.org');
  assert.equal(await anfragenAufraeumen(w.env, JETZT, w.holen), 1);
  assert.deepEqual(w.s.prepare('SELECT email FROM submissions').all().map((r) => r.email), ['neu@example.org']);
  assert.equal(w.n('events'), 1);
  assert.ok(w.rufe.includes('DELETE alt@example.org'));
  assert.ok(!w.rufe.some((r) => r.includes('neu@')));
});

test('spätere zweite Anfrage und jede CRM-Karte halten sie', async () => {
  const w = welt();
  w.anfrage('zwei@example.org', 500); w.anfrage('zwei@example.org', 10);
  w.anfrage('karte@example.org', 500); w.s.prepare('INSERT INTO clients (email) VALUES (?)').run('karte@example.org');
  w.anfrage('kontakt@example.org', 500); w.s.prepare('INSERT INTO clients (contact) VALUES (?)').run('Kontakt@example.org');
  w.anfrage('zugeordnet@example.org', 500, 23);
  assert.equal(await anfragenAufraeumen(w.env, JETZT, w.holen), 0);
  assert.equal(w.n('submissions'), 5);
  assert.deepEqual(w.rufe, []);
});

test('Brevo: Listen-Kontakt bleibt, 404 ist fertig, Fehler lässt die Zeilen stehen', async () => {
  const w = welt({ 'liste@example.org': { status: 200, listIds: [3] }, 'kaputt@example.org': { status: 500 }, 'nein@example.org': { status: 200, listIds: [], loeschen: 500 } });
  w.anfrage('liste@example.org', 400); w.anfrage('fehlt@example.org', 400);
  w.anfrage('kaputt@example.org', 400); w.anfrage('nein@example.org', 400);
  assert.equal(await anfragenAufraeumen(w.env, JETZT, w.holen), 2);
  assert.ok(!w.rufe.includes('DELETE liste@example.org'));
  assert.deepEqual(w.s.prepare('SELECT email FROM submissions ORDER BY email').all().map((r) => r.email), ['kaputt@example.org', 'nein@example.org']);
});

test('fremder Termin und andere Einsendungen bleiben; ohne Brevo-Zugang kein Lauf', async () => {
  const w = welt();
  w.anfrage('a@example.org', 400); w.termin('a@example.org'); w.termin('b@example.org');
  w.s.prepare("INSERT INTO submissions (type, email, created_at) VALUES ('briefing', 'a@example.org', ?)").run(vorTagen(400));
  assert.equal(await anfragenAufraeumen({ ...w.env, BREVO_API_KEY: '' }, JETZT, w.holen), 0);
  assert.equal(w.n('submissions'), 2);
  assert.equal(await anfragenAufraeumen(w.env, JETZT, w.holen), 1);
  assert.equal(w.n('events'), 1);
  assert.deepEqual(w.s.prepare('SELECT type FROM submissions').all().map((r) => r.type), ['briefing']);
});
