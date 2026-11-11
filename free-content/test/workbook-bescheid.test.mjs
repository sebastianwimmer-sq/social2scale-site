import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { workbookBescheid, mailBauen, heftTitel, ABSENDER } from '../src/workbook-bescheid.js';

// D1-Hülle um echtes SQLite (wie reel-bescheid.test.mjs): dieselbe SQL, keine Attrappe der Abfrage
function welt() {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE clients (id INTEGER PRIMARY KEY, name TEXT, email TEXT, slug TEXT, notes TEXT, workbook_enabled INTEGER, reel_bescheid INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE workbook_auftrag (client_id INTEGER, code TEXT, thema TEXT, gliederung TEXT, status TEXT, fehler TEXT, bescheid_am TEXT);`);
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
const offen = (w) => w.s.prepare(`SELECT code FROM workbook_auftrag WHERE bescheid_am IS NULL ORDER BY code`).all().map((r) => r.code);

test('fertiges Workbook → genau EINE Mail mit dem Titel des Hefts, Absender social2scale, danach nie wieder', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Eva Fichtinger', 'eva@example.org', 'eva', '', 1, 1);
            INSERT INTO workbook_auftrag VALUES (1, 'wb-1', 'rohes thema', '{"titel":"Ein freundliches Nein","seiten":[]}', 'fertig', NULL, NULL);`);
  assert.equal(await workbookBescheid(w.env, w.versand), 'gesendet 1');
  assert.equal(w.post.length, 1);
  assert.equal(w.post[0].absender, ABSENDER);
  assert.equal(w.post[0].to, 'eva@example.org');
  assert.equal(w.post[0].mail.subject, 'Dein Workbook ist fertig');
  assert.match(w.post[0].mail.htmlContent, /Hallo Eva,/);
  assert.match(w.post[0].mail.htmlContent, /Ein freundliches Nein/);
  assert.doesNotMatch(w.post[0].mail.htmlContent, /rohes thema/);
  assert.match(w.post[0].mail.htmlContent, /mein\.social2scale\.com\/eva-kit\/workbook\//);
  assert.match(w.post[0].mail.htmlContent, /Das social2scale-Team/);
  assert.match(w.post[0].mail.htmlContent, /weil du in deinem Social Hub ein Workbook bestellt hast/);
  assert.equal(await workbookBescheid(w.env, w.versand), 'ruhig', 'zweiter Lauf schickt nichts');
  assert.equal(w.post.length, 1);
});

test('rot: nie der rohe Fehlertext; Einspruch bekommt seinen festen Satz; mehrere Hefte → eine Mail', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Eva', 'eva@example.org', 'eva', '', 1, 1);
            INSERT INTO workbook_auftrag VALUES (1, 'wb-1', 'Thema A', '{"titel":"Heft A"}', 'fertig', NULL, NULL),
              (1, 'wb-2', 'Thema B', '{"titel":"Heft B"}', 'fertig', NULL, NULL),
              (1, 'wb-3', 'Burnout heilen', NULL, 'fehler', 'einspruch:heil · thema: „Burnout heilen“ (Stelle: burnout)', NULL),
              (1, 'wb-4', 'Thema D', NULL, 'fehler', 'Bau: BAU ROT · Seiten /Users/x/out', NULL);`);
  await workbookBescheid(w.env, w.versand);
  assert.equal(w.post.length, 1);
  const html = w.post[0].mail.htmlContent;
  assert.equal(w.post[0].mail.subject, 'Deine Workbooks sind fertig');
  assert.match(html, /In deinem Social Hub steht, warum/);
  assert.match(html, /Wir sehen es uns an und melden uns/);
  assert.doesNotMatch(html, /einspruch:|Stelle:|BAU ROT|\/Users\//);
  assert.deepEqual(offen(w), []);
  assert.equal(mailBauen({ name: 'Eva', slug: 'eva' }, [{ status: 'fehler', thema: 'x', fehler: 'einspruch:heil' }]).subject, 'Zu deinem Workbook gibt es eine Rückmeldung');
});

test('abgeschaltet, Testkonto mit fremder Adresse, ohne Mail, nicht freigeschaltet → keine Mail, abgehakt; Testkonto mit eigener Adresse bekommt sie', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Aus', 'a@example.org', 'a', '', 1, 0), (2, 'Test', 't@example.org', 'pruefkonto', '[TEST] Prüfkonto', 1, 1),
              (3, 'Ohne', '', 'o', '', 1, 1), (4, 'Gesperrt', 'g@example.org', 'g', '', 0, 1), (5, 'Sebi', 'sebi@vegetarianhulk.de', 'sebastian', '[TEST · Sebi selbst', 1, 1);
            INSERT INTO workbook_auftrag VALUES (1, 'wb-1', 'x', NULL, 'fertig', NULL, NULL), (2, 'wb-2', 'y', NULL, 'fertig', NULL, NULL),
              (3, 'wb-3', 'z', NULL, 'fehler', 'f', NULL), (4, 'wb-4', 'q', NULL, 'fertig', NULL, NULL), (5, 'wb-5', 'Testheft', NULL, 'fertig', NULL, NULL),
              (5, 'wb-6', 'läuft noch', NULL, 'pruefen', NULL, NULL);`);
  await workbookBescheid(w.env, w.versand);
  assert.deepEqual(w.post.map((p) => p.to), ['sebi@vegetarianhulk.de']);
  assert.deepEqual(offen(w), ['wb-6'], 'nur der laufende Auftrag steht noch an');
});

test('Versand scheitert → bleibt offen, nächster Lauf versucht es wieder; wirft nie', async () => {
  const w = welt();
  w.s.exec(`INSERT INTO clients VALUES (1, 'Eva', 'eva@example.org', 'eva', '', 1, 1);
            INSERT INTO workbook_auftrag VALUES (1, 'wb-1', 'x', NULL, 'fertig', NULL, NULL);`);
  assert.equal(await workbookBescheid(w.env, async () => false), 'gesendet 0');
  assert.deepEqual(offen(w), ['wb-1']);
  assert.equal(await workbookBescheid(w.env, w.versand), 'gesendet 1');
  assert.equal(await workbookBescheid({ DB: { prepare: () => { throw new Error('D1 weg'); } } }, w.versand), 'fehler');
});

test('Titel: aus dem geprüften Aufbau, sonst ihr Thema; HTML in ihrem Thema wird entschärft', () => {
  assert.equal(heftTitel({ thema: 'roh', gliederung: '{"titel":" Mein Platz "}' }), 'Mein Platz');
  assert.equal(heftTitel({ thema: 'roh', gliederung: 'kaputt{' }), 'roh');
  const html = mailBauen({ name: 'Eva', slug: 'eva' }, [{ status: 'fertig', thema: '<b>x</b>', gliederung: null }]).htmlContent;
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

test('Vorschautext im Postfach wiederholt nicht die Anrede (Gmail zeigte 11.11. „Hallo Sebastian, Hallo Sebastian,“)', () => {
  const vorschauVon = (html) => html.match(/<div style="display:none;[^"]*">([^<]*)<\/div>/)[1];
  const fertig = mailBauen({ name: 'Sebastian', slug: 'sebastian' }, [{ status: 'fertig', thema: 'Pausen', gliederung: JSON.stringify({ titel: 'Pausen ohne Reue' }) }]);
  assert.match(vorschauVon(fertig.htmlContent), /^„Pausen ohne Reue“ liegt fertig/);
  assert.doesNotMatch(vorschauVon(fertig.htmlContent), /Hallo/);
  const rot = mailBauen({ name: 'Sebastian', slug: 'sebastian' }, [{ status: 'fehler', thema: 'Streit', fehler: 'x' }]);
  assert.doesNotMatch(vorschauVon(rot.htmlContent), /Hallo/);
});

test('Mail trägt ihren Tag, damit das CRM sie im Website-Reiter zählen kann', () => {
  const m = mailBauen({ name: 'Sebastian', slug: 'sebastian' }, [{ status: 'fertig', thema: 'Pausen' }]);
  assert.deepEqual(m.tags, ['workbook-bescheid']);
});
