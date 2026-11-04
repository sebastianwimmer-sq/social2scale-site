import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { cleanupInactive } from '../src/leads.js';

// D1-Hülle um echtes SQLite (wie reel-bescheid.test.mjs): dieselbe SQL, keine Attrappe der Abfrage
const JETZT = new Date('2027-11-03T12:00:00Z');
const vorTagen = (n) => new Date(JETZT.getTime() - n * 864e5).toISOString().replace('T', ' ').slice(0, 19);

function welt() {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE free_leads (id INTEGER PRIMARY KEY, email_norm TEXT, token TEXT, status TEXT,
            created_at TEXT, confirmed_at TEXT, generated_at TEXT, last_sent_at TEXT);
          CREATE TABLE funnel_events (id INTEGER PRIMARY KEY, event TEXT, token TEXT, created_at TEXT);
          CREATE TABLE clients (id INTEGER PRIMARY KEY, email TEXT);`);
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    all: async () => ({ results: s.prepare(sql).all(...args) }),
    first: async () => s.prepare(sql).get(...args) ?? null,
    run: async () => { const r = s.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  const r2 = new Map();
  let r2kaputt = false;
  const images = {
    list: async ({ prefix }) => {
      if (r2kaputt) throw new Error('R2 weg');
      return { objects: [...r2.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
    },
    delete: async (key) => { r2.delete(key); },
  };
  const lead = (id, tage, { bestaetigt = true, email = `l${id}@example.org` } = {}) => {
    const t = vorTagen(tage);
    s.prepare('INSERT INTO free_leads VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, email, `tok${id}`, bestaetigt ? 'ready' : 'pending', t, bestaetigt ? t : null, bestaetigt ? t : null, t);
    r2.set(`free/tok${id}/avatar.bin`, 1);
  };
  const ids = () => s.prepare('SELECT id FROM free_leads ORDER BY id').all().map((r) => r.id);
  return { s, db: { prepare: (sql) => prep(sql) }, images, r2, lead, ids, kaputt: () => { r2kaputt = true; } };
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

test('Kundin, später Kontakt und unbestätigte Anfrage bleiben unberührt', async () => {
  const w = welt();
  w.lead(1, 500, { email: 'kundin@example.org' });
  w.s.prepare('INSERT INTO clients (email) VALUES (?)').run(' Kundin@Example.org ');
  w.lead(2, 500);
  w.s.prepare('INSERT INTO funnel_events (event, token, created_at) VALUES (?, ?, ?)').run('cta_call', 'tok2', vorTagen(10));
  w.lead(3, 500, { bestaetigt: false });
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 0);
  assert.deepEqual(w.ids(), [1, 2, 3]);
});

test('später Bau oder spätere Mail zählt als Kontakt', async () => {
  const w = welt();
  w.lead(1, 500);
  w.s.prepare('UPDATE free_leads SET last_sent_at = ? WHERE id = 1').run(vorTagen(30));
  w.lead(2, 500);
  w.s.prepare('UPDATE free_leads SET generated_at = ? WHERE id = 2').run(vorTagen(30));
  w.lead(3, 500);
  w.s.prepare('UPDATE free_leads SET generated_at = NULL WHERE id = 3').run();
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 1, 'NULL-Feld darf max() nicht kippen');
  assert.deepEqual(w.ids(), [1, 2]);
});

test('R2 fällt aus → Zeile bleibt, der nächste Lauf findet den Token wieder', async () => {
  const w = welt();
  w.lead(1, 400);
  w.kaputt();
  assert.equal(await cleanupInactive(w.db, JETZT, w.images), 0);
  assert.deepEqual(w.ids(), [1]);
});
