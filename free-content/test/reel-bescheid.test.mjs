import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { reelBescheid, mailBauen, ABSENDER } from '../src/reel-bescheid.js';

// D1-Hülle um echtes SQLite (wie reel-waechter.test.mjs): dieselbe SQL, keine Attrappe der Abfrage
function welt() {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE clients (id INTEGER PRIMARY KEY, name TEXT, email TEXT, slug TEXT, notes TEXT, reels_enabled INTEGER, reel_bescheid INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE reel_auftrag (client_id INTEGER, code TEXT, thema TEXT, status TEXT, fehler TEXT, bescheid_am TEXT);
    CREATE TABLE reel_upload (client_id INTEGER, code TEXT, satz TEXT, status TEXT, fehler TEXT, teil_nr INTEGER DEFAULT 1, bescheid_am TEXT);`);
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    all: async () => ({ results: s.prepare(sql).all(...args) }),
    first: async () => s.prepare(sql).get(...args) ?? null,
    run: async () => { const r = s.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  const post = [];
  const versand = async (env, to, name, mail, absender) => { post.push({ to, name, mail, absender }); return true; };
  return { s, env: { DB: { prepare: (sql) => prep(sql) } }, post, versand };
}

test('fertiges Reel → genau EINE Mail, Absender Phil, danach nie wieder', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Sabine Rühl', 'sabine@example.org', 'sabine', '', 1, 1);
            INSERT INTO reel_auftrag VALUES (1, 'wa-1', 'Bildungsgutschein', 'fertig', NULL, NULL);`);
  assert.equal(await reelBescheid(w.env, w.versand), 'gesendet 1');
  assert.equal(w.post.length, 1);
  assert.equal(w.post[0].absender, ABSENDER);
  assert.match(w.post[0].mail.subject, /Dein Reel ist fertig/);
  assert.match(w.post[0].mail.htmlContent, /Hallo Sabine/);
  assert.match(w.post[0].mail.htmlContent, /mein\.social2scale\.com\/sabine-kit\/hub\//);
  assert.equal(await reelBescheid(w.env, w.versand), 'ruhig', 'zweiter Lauf schickt nichts');
  assert.equal(w.post.length, 1);
});

test('mehrere Reels einer Kundin → eine Mail; rot mit ihrer Erklärung', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Eva', 'eva@example.org', 'eva', '', 1, 1);
            INSERT INTO reel_auftrag VALUES (1, 'wa-1', 'Thema A', 'fertig', NULL, NULL), (1, 'wa-2', 'Thema B', 'fehler', 'Es stand zu wenig Konkretes drin.', NULL);
            INSERT INTO reel_upload VALUES (1, 'c-1', 'Mein Satz', 'fertig', NULL, 1, NULL);`);
  await reelBescheid(w.env, w.versand);
  assert.equal(w.post.length, 1);
  assert.match(w.post[0].mail.subject, /Deine Reels sind fertig/);
  assert.match(w.post[0].mail.htmlContent, /zu wenig Konkretes/);
  assert.match(w.post[0].mail.htmlContent, /Mein Satz/);
});

test('abgeschaltet, Testkonto, ohne Mail, nicht freigeschaltet → keine Mail; abgehakt, damit nichts nachkommt', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Aus', 'a@example.org', 'a', '', 1, 0), (2, 'Test', 't@example.org', 'pruefkonto', '[TEST] Prüfkonto', 1, 1),
              (3, 'Ohne', '', 'o', '', 1, 1), (4, 'Gesperrt', 'g@example.org', 'g', '', 0, 1);
            INSERT INTO reel_auftrag VALUES (1, 'wa-1', 'x', 'fertig', NULL, NULL), (2, 'wa-2', 'y', 'fertig', NULL, NULL), (3, 'wa-3', 'z', 'fehler', 'f', NULL), (4, 'wa-4', 'q', 'fertig', NULL, NULL);
            INSERT INTO reel_upload VALUES (1, 'c-1', '', 'fertig', NULL, 1, NULL);`);
  await reelBescheid(w.env, w.versand);
  assert.equal(w.post.length, 0, JSON.stringify(w.post.map((p) => p.to)));
  const offen = w.s.prepare(`SELECT code FROM reel_auftrag WHERE bescheid_am IS NULL UNION ALL SELECT code FROM reel_upload WHERE bescheid_am IS NULL`).all().map((r) => r.code);
  assert.deepEqual(offen, ['wa-4'], 'nur die gesperrte Kundin bleibt offen (wird nach dem Freischalten benachrichtigt)');
});

test('Testkonto mit eigener Adresse bekommt die Mail, mit fremder nicht', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (37, 'Sebastian', 'info@vegetarianhulk.de', 'sebastian', '[TEST · Sebi selbst]', 1, 1), (2, 'Test', 't@example.org', 'pruefkonto', '[TEST] Prüfkonto', 1, 1);
            INSERT INTO reel_auftrag VALUES (37, 'wa-1', 'x', 'fehler', 'f', NULL), (2, 'wa-2', 'y', 'fertig', NULL, NULL);`);
  await reelBescheid(w.env, w.versand);
  assert.deepEqual(w.post.map((p) => p.to), ['info@vegetarianhulk.de']);
});

test('Versand scheitert → bleibt offen, nächster Lauf versucht es wieder', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Nicole', 'n@example.org', 'nicole', '', 1, 1); INSERT INTO reel_auftrag VALUES (1, 'wa-1', 'x', 'fertig', NULL, NULL);`);
  await reelBescheid(w.env, async () => false);
  assert.equal(w.s.prepare('SELECT count(*) n FROM reel_auftrag WHERE bescheid_am IS NULL').get().n, 1);
  await reelBescheid(w.env, w.versand);
  assert.equal(w.post.length, 1);
});

test('Text in der Mail wird entschärft (kein HTML aus Thema oder Erklärung)', () => {
  const m = mailBauen({ name: '<b>X</b>', slug: 's' }, [{ titel: '<script>', status: 'fehler', fehler: '<img src=x>' }]);
  assert.doesNotMatch(m.htmlContent, /<script>|<img/);
});
