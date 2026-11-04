import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { cleanupInactive } from '../src/leads.js';

// D1-Hülle um echtes SQLite (wie reel-bescheid.test.mjs): dieselbe SQL, keine Attrappe der Abfrage
const JETZT = new Date('2027-11-03T12:00:00Z');
const vorTagen = (n) => new Date(JETZT.getTime() - n * 864e5).toISOString().replace('T', ' ').slice(0, 19);
const AUTO = 'Automatisch aus Free-Content-Funnel · Ziel: mehr';

function welt() {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE free_leads (id INTEGER PRIMARY KEY, email TEXT, email_norm TEXT, token TEXT, status TEXT,
            created_at TEXT, confirmed_at TEXT, generated_at TEXT, last_sent_at TEXT);
          CREATE TABLE funnel_events (id INTEGER PRIMARY KEY, event TEXT, token TEXT, created_at TEXT);
          CREATE TABLE clients (id INTEGER PRIMARY KEY, email TEXT, contact TEXT, status TEXT, notes TEXT);
          CREATE TABLE submissions (id INTEGER PRIMARY KEY, type TEXT, client_id INTEGER, email TEXT);
          CREATE TABLE activity (client_id INTEGER, text TEXT);
          CREATE TABLE events (client_id INTEGER);
          CREATE TABLE tickets (client_id INTEGER);
          CREATE TABLE nachrichten (client_id INTEGER);
          CREATE TABLE payments (client_id INTEGER);
          CREATE TABLE beitraege (client_id INTEGER);
          CREATE TABLE reel_auftrag (client_id INTEGER);`);
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    all: async () => ({ results: s.prepare(sql).all(...args) }),
    first: async () => s.prepare(sql).get(...args) ?? null,
    run: async () => { const r = s.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  const batch = async (liste) => {
    s.exec('BEGIN');
    try { for (const b of liste) await b.run(); s.exec('COMMIT'); } catch (e) { s.exec('ROLLBACK'); throw e; }
  };
  const r2 = new Map();
  let r2kaputt = false;
  const images = {
    list: async ({ prefix }) => {
      if (r2kaputt) throw new Error('R2 weg');
      return { objects: [...r2.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
    },
    delete: async (key) => { r2.delete(key); },
  };
  const lead = (id, tage, { bestaetigt = true, email = `l${id}@example.org`, norm = email.toLowerCase() } = {}) => {
    const t = vorTagen(tage);
    s.prepare('INSERT INTO free_leads VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, email, norm, `tok${id}`, bestaetigt ? 'ready' : 'pending', t, bestaetigt ? t : null, bestaetigt ? t : null, t);
    r2.set(`free/tok${id}/avatar.bin`, 1);
  };
  const karte = (id, contact, status, notes) =>
    s.prepare('INSERT INTO clients (id, contact, status, notes) VALUES (?, ?, ?, ?)').run(id, contact, status, notes);
  const spiegel = (type, clientId, email) =>
    s.prepare('INSERT INTO submissions (type, client_id, email) VALUES (?, ?, ?)').run(type, clientId, email);
  const zaehle = (tabelle) => s.prepare(`SELECT count(*) n FROM ${tabelle}`).get().n;
  const ids = () => s.prepare('SELECT id FROM free_leads ORDER BY id').all().map((r) => r.id);
  return { s, db: { prepare: (sql) => prep(sql), batch }, images, r2, lead, karte, spiegel, zaehle, ids, kaputt: () => { r2kaputt = true; } };
}

test('Grenze 12 Monate: 364 Tage bleibt, 366 Tage geht samt Bildern', async () => {
  const w = welt();
  w.lead(1, 364);
  w.lead(2, 366);
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 1);
  assert.deepEqual(w.ids(), [1]);
  assert.ok(w.r2.has('free/tok1/avatar.bin'));
  assert.ok(!w.r2.has('free/tok2/avatar.bin'), 'R2-Ablage mitgelöscht');
});

test('Kundin über E-Mail, später Klick und unbestätigte Anfrage bleiben', async () => {
  const w = welt();
  w.lead(1, 500, { email: 'kundin@example.org' });
  w.s.prepare('INSERT INTO clients (email, status) VALUES (?, ?)').run(' Kundin@Example.org ', 'arbeit');
  w.lead(2, 500);
  w.s.prepare('INSERT INTO funnel_events (event, token, created_at) VALUES (?, ?, ?)').run('cta_call', 'tok2', vorTagen(10));
  w.lead(3, 500, { bestaetigt: false });
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 0);
  assert.deepEqual(w.ids(), [1, 2, 3]);
});

test('später Bau oder spätere Mail zählt als Kontakt, NULL kippt max() nicht', async () => {
  const w = welt();
  w.lead(1, 500);
  w.s.prepare('UPDATE free_leads SET last_sent_at = ? WHERE id = 1').run(vorTagen(30));
  w.lead(2, 500);
  w.s.prepare('UPDATE free_leads SET generated_at = ? WHERE id = 2').run(vorTagen(30));
  w.lead(3, 500);
  w.s.prepare('UPDATE free_leads SET generated_at = NULL WHERE id = 3').run();
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 1);
  assert.deepEqual(w.ids(), [1, 2]);
});

test('R2 fällt aus → nichts wird gelöscht, der nächste Lauf findet den Token wieder', async () => {
  const w = welt();
  w.lead(1, 400);
  w.spiegel('free_content', null, 'l1@example.org');
  w.kaputt();
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 0);
  assert.deepEqual(w.ids(), [1]);
  assert.equal(w.zaehle('submissions'), 1);
});

test('überall gelöscht: Spiegel mit +Tag und leere Auto-Karte samt Verlauf, Fremdes bleibt', async () => {
  const w = welt();
  w.lead(1, 400, { email: 'Sim+vorschau@example.org', norm: 'sim@example.org' });
  w.karte(50, 'Sim+vorschau@example.org', 'briefing', AUTO);
  w.spiegel('free_content', 50, 'Sim+vorschau@example.org');
  w.spiegel('anfrage', null, 'Sim+vorschau@example.org');
  w.s.prepare('INSERT INTO activity VALUES (50, ?)').run('Gratis-Vorschau erstellt');
  w.s.exec('INSERT INTO events VALUES (50)');
  w.karte(60, 'andere@example.org', 'briefing', AUTO);
  w.s.prepare('INSERT INTO activity VALUES (60, ?)').run('fremd');
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 1);
  assert.deepEqual(w.ids(), []);
  assert.deepEqual(w.s.prepare('SELECT id FROM clients').all().map((r) => r.id), [60]);
  assert.deepEqual(w.s.prepare('SELECT type FROM submissions').all().map((r) => r.type), ['anfrage']);
  assert.deepEqual(w.s.prepare('SELECT client_id FROM activity').all().map((r) => r.client_id), [60]);
  assert.equal(w.zaehle('events'), 0);
});

test('Karte mit Arbeit dran hält den Lead: anderer Status, eigene Notiz oder Ticket', async () => {
  const w = welt();
  w.lead(1, 400); w.karte(51, 'l1@example.org', 'closing', AUTO);
  w.lead(2, 400); w.karte(52, 'l2@example.org', 'briefing', 'Phil: hat angerufen');
  w.lead(3, 400); w.karte(53, 'l3@example.org', 'briefing', AUTO); w.s.exec('INSERT INTO tickets VALUES (53)');
  w.lead(4, 400); w.karte(54, 'neu@example.org', 'arbeit', ''); w.spiegel('free_content', 54, 'l4@example.org');
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 0);
  assert.deepEqual(w.ids(), [1, 2, 3, 4]);
  assert.equal(w.zaehle('clients'), 4);
  assert.ok(w.r2.has('free/tok1/avatar.bin'), 'Bilder bleiben ebenfalls');
});
