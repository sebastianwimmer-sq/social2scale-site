import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { reelWaechter, TITEL } from '../src/reel-waechter.js';

// D1-Hülle um echtes SQLite: dieselbe SQL-Semantik (datetime('now', '-30 minutes')), keine Attrappe der Abfrage
function d1() {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE reel_upload (code TEXT, client_id INTEGER, status TEXT, updated_at TEXT);
          CREATE TABLE reel_auftrag (code TEXT, client_id INTEGER, status TEXT, updated_at TEXT);
          CREATE TABLE tickets (id INTEGER PRIMARY KEY, client_id INTEGER, type TEXT, title TEXT, body TEXT, status TEXT,
            priority TEXT, source TEXT, owner TEXT, updated_at TEXT, done_at TEXT, done_note TEXT);`);
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    all: async () => ({ results: s.prepare(sql).all(...args) }),
    first: async () => s.prepare(sql).get(...args) ?? null,
    run: async () => { const r = s.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  return { s, DB: { prepare: (sql) => prep(sql) } };
}
const vor = (min) => `datetime('now', '-${min} minutes')`;

test('frischer Auftrag (10 min) ist ruhig — kein Fehlalarm', async () => {
  const { s, DB } = d1();
  s.exec(`INSERT INTO reel_auftrag VALUES ('wa-1', 37, 'da', ${vor(10)})`);
  assert.equal(await reelWaechter({ DB }), 'ruhig');
  assert.equal(s.prepare('SELECT count(*) n FROM tickets').get().n, 0);
});

test('wartet > 30 min → genau EIN Ticket, auch über mehrere Cron-Läufe', async () => {
  const { s, DB } = d1();
  s.exec(`INSERT INTO reel_upload VALUES ('cm1', 37, 'da', ${vor(45)})`);
  assert.equal(await reelWaechter({ DB }), 'gemeldet');
  assert.equal(await reelWaechter({ DB }), 'schon gemeldet');
  const t = s.prepare('SELECT * FROM tickets').all();
  assert.equal(t.length, 1);
  assert.equal(t[0].title, TITEL);
  assert.match(t[0].body, /cm1/);
});

test('in_arbeit 50 min ist noch kein Hänger, 70 min schon', async () => {
  const { s, DB } = d1();
  s.exec(`INSERT INTO reel_auftrag VALUES ('wa-2', 37, 'in_arbeit', ${vor(50)})`);
  assert.equal(await reelWaechter({ DB }), 'ruhig');
  s.exec(`UPDATE reel_auftrag SET updated_at = ${vor(70)}`);
  assert.equal(await reelWaechter({ DB }), 'gemeldet');
});

test('Stau weg → Wächter schließt sein Ticket mit Beleg', async () => {
  const { s, DB } = d1();
  s.exec(`INSERT INTO reel_upload VALUES ('cm1', 37, 'da', ${vor(45)})`);
  await reelWaechter({ DB });
  s.exec(`UPDATE reel_upload SET status = 'fertig'`);
  assert.equal(await reelWaechter({ DB }), 'geschlossen');
  const t = s.prepare('SELECT status, done_note FROM tickets').get();
  assert.equal(t.status, 'erledigt');
  assert.match(t.done_note, /Cron-Messung/);
});

test('kaputte DB wirft nie (Funnel-Cron läuft weiter)', async () => {
  assert.equal(await reelWaechter({ DB: { prepare: () => { throw new Error('weg'); } } }), 'fehler');
});
