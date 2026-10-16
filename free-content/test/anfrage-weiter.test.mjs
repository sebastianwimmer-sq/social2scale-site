import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleAnfrage, anfrageAusFunnel, pflichtFehler, anfrageMarkdown, anfrageProbe } from '../src/anfrage-weiter.js';

const GUT = { name: 'Anna', email: 'anna@beispiel.de', phone: '0171 2345678', business: 'Coach', status: 'Ganz am Anfang', goal: 'Mehr Anfragen', budget: '1.000–3.000 €', start: 'Sofort', turnstile: 'tok' };

// D1-Nachbau auf SQLite: prepare().bind().run()/first()/all() wie in Workers.
function d1() {
  const s = new DatabaseSync(':memory:');
  s.exec(`CREATE TABLE submissions (id INTEGER PRIMARY KEY, type TEXT, client_id INTEGER, name TEXT, email TEXT, payload TEXT, data TEXT, logo_key TEXT, rating INTEGER, status TEXT);
    CREATE TABLE clients (id INTEGER PRIMARY KEY, email TEXT, contact TEXT);
    CREATE TABLE formular_versuche (tag TEXT, formular TEXT, ergebnis TEXT, n INTEGER, PRIMARY KEY (tag, formular, ergebnis));
    CREATE TABLE free_intake_log (ip TEXT, created_at TEXT);`);
  const db = {
    prepare(sql) {
      let args = [];
      const st = { bind: (...a) => { args = a; return st; },
        run: async () => s.prepare(sql).run(...args),
        first: async () => s.prepare(sql).get(...args) ?? null,
        all: async () => ({ results: s.prepare(sql).all(...args) }) };
      return st;
    },
  };
  return { db, s };
}
function req(body, ohneOrigin = false) {
  return new Request('https://start.social2scale.com/api/anfrage', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...(ohneOrigin ? {} : { Origin: 'https://start.social2scale.com' }) }, body: JSON.stringify(body),
  });
}
// Turnstile-Prüfung läuft über globales fetch.
async function mitTurnstile(ok, fn) {
  const alt = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: ok }), { status: 200 });
  try { return await fn(); } finally { globalThis.fetch = alt; }
}
function umgebung() {
  const { db, s } = d1();
  const mails = [];
  const teile = { mx: async () => true, mail: async (env, to, name, m) => { mails.push({ to, m }); return true; } };
  return { env: { TURNSTILE_SECRET: 's', DB: db, NOTIFY_TO: 'sebastian@social2scale.com, philipp@social2scale.com' }, s, mails, teile };
}
const zaehler = (s) => Object.fromEntries(s.prepare('SELECT ergebnis, n FROM formular_versuche').all().map((r) => [r.ergebnis, r.n]));

test('Start-Zeitpunkt wandert ins Ziel, fremde Felder fallen weg', () => {
  const d = anfrageAusFunnel({ ...GUT, foto: 'x' });
  assert.equal(d.goal, 'Mehr Anfragen · Start: Sofort');
  assert.equal('foto' in d, false);
});

test('Telefon ist Pflicht (Erstgespräch läuft telefonisch)', () => {
  assert.equal(pflichtFehler(anfrageAusFunnel({ ...GUT, phone: '12' })), 'phone');
  assert.equal(pflichtFehler(anfrageAusFunnel(GUT)), '');
});

test('gültige Anfrage: Eingang im CRM wie aus /anfrage/, Mail an beide, gezählt', () => mitTurnstile(true, async () => {
  const u = umgebung();
  const r = await handleAnfrage(req(GUT), u.env, {}, u.teile);
  assert.equal(r.status, 200);
  const z = u.s.prepare('SELECT * FROM submissions').all();
  assert.equal(z.length, 1);
  assert.equal(z[0].type, 'anfrage');
  assert.equal(z[0].status, 'new');
  assert.match(z[0].payload, /^# Erstgespräch-Anfrage/);
  assert.match(z[0].payload, /\*\*Telefon:\*\* 0171 2345678/);
  assert.match(z[0].payload, /Gefunden über:\*\* Link: vorschau-b/);
  assert.equal(JSON.parse(z[0].data).herkunft.von, 'vorschau-b');
  assert.equal(u.mails.length, 2);
  assert.match(u.mails[0].to, /philipp@/);
  assert.match(u.mails[0].m.subject, /Erstgespräch-Anfrage: Anna/);
  // Bestätigung an die Anfragende, mit Weg zur Vorschau
  assert.equal(u.mails[1].to, 'anna@beispiel.de');
  assert.equal(u.mails[1].m.subject, 'Deine Anfrage ist angekommen');
  assert.match(u.mails[1].m.htmlContent, /start\.social2scale\.com\/\?weg=a/);
  assert.deepEqual(zaehler(u.s), { angekommen: 1 });
}));

test('bekannte Kundin wird per E-Mail zugeordnet', () => mitTurnstile(true, async () => {
  const u = umgebung();
  u.s.prepare("INSERT INTO clients (id, email) VALUES (42, 'Anna@Beispiel.de ')").run();
  await handleAnfrage(req(GUT), u.env, {}, u.teile);
  assert.equal(u.s.prepare('SELECT client_id FROM submissions').get().client_id, 42);
}));

test('ohne gültiges Turnstile: nichts gespeichert, keine Mail, als captcha gezählt', () => mitTurnstile(false, async () => {
  const u = umgebung();
  const r = await handleAnfrage(req(GUT), u.env, {}, u.teile);
  assert.equal(r.status, 403);
  assert.equal(u.s.prepare('SELECT COUNT(*) AS c FROM submissions').get().c, 0);
  assert.equal(u.mails.length, 0);
  assert.deepEqual(zaehler(u.s), { captcha: 1 });
}));

test('Mail-Domain ohne Mailserver → Hinweis statt Danke', () => mitTurnstile(true, async () => {
  const u = umgebung();
  const r = await handleAnfrage(req(GUT), u.env, {}, { ...u.teile, mx: async () => false });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error, 'email_domain');
  assert.equal(u.s.prepare('SELECT COUNT(*) AS c FROM submissions').get().c, 0);
}));

test('Honeypot antwortet wie Erfolg, speichert aber nichts', () => mitTurnstile(true, async () => {
  const u = umgebung();
  const r = await handleAnfrage(req({ ...GUT, website: 'x' }), u.env, {}, u.teile);
  assert.equal(r.status, 200);
  assert.equal(u.s.prepare('SELECT COUNT(*) AS c FROM submissions').get().c, 0);
  assert.deepEqual(zaehler(u.s), { spam_falle: 1 });
}));

test('CRM kaputt, Mail geht → trotzdem Danke (Anfrage ist sicher)', () => mitTurnstile(true, async () => {
  const u = umgebung();
  u.s.exec('DROP TABLE submissions');
  const r = await handleAnfrage(req(GUT), u.env, {}, u.teile);
  assert.equal(r.status, 200);
  assert.equal(u.mails.length, 2);
}));

test('Steuerzeichen im Namen kommen nicht in den Betreff', () => mitTurnstile(true, async () => {
  const u = umgebung();
  await handleAnfrage(req({ ...GUT, name: 'Anna\r\nBcc: x@y.de' }), u.env, {}, u.teile);
  assert.doesNotMatch(u.mails[0].m.subject, /[\r\n]/);
}));

test('Brevo-Kontakt wird angelegt, ohne Liste', () => mitTurnstile(true, async () => {
  const u = umgebung();
  let body;
  await handleAnfrage(req(GUT), { ...u.env, BREVO_API_KEY: 'k' }, {}, { ...u.teile, holen: async (url, init) => { body = JSON.parse(init.body); return new Response(null, { status: 201 }); } });
  assert.equal(body.email, 'anna@beispiel.de');
  assert.equal(body.attributes.QUELLE, 'vorschau-b');
  assert.equal('listIds' in body, false);
}));

test('CRM UND Mail kaputt → kein Danke', () => mitTurnstile(true, async () => {
  const u = umgebung();
  u.s.exec('DROP TABLE submissions');
  const r = await handleAnfrage(req(GUT), u.env, {}, { ...u.teile, mail: async () => false });
  assert.equal(r.status, 500);
}));

test('Markdown nennt nur befüllte Felder', () => {
  const md = anfrageMarkdown(anfrageAusFunnel({ name: 'Bo', email: 'b@b.de', phone: '0171 1234567' }));
  assert.doesNotMatch(md, /Budget|Status|Ziel/);
});

test('Probe: ok mit Tabellen und Mail-Schlüssel, sonst Grund', async () => {
  const u = umgebung();
  assert.equal(await anfrageProbe({ ...u.env, BREVO_API_KEY: 'k' }), 'ok');
  assert.equal(await anfrageProbe(u.env), 'mail');
  u.s.exec('DROP TABLE formular_versuche');
  assert.equal(await anfrageProbe({ ...u.env, BREVO_API_KEY: 'k' }), 'crm');
});

test('Versuch ohne Funnel-Origin zählt als fremd (x_), nie als echte Ablehnung', () => mitTurnstile(false, async () => {
  const u = umgebung();
  await handleAnfrage(req(GUT, true), u.env, {}, u.teile);
  assert.deepEqual(zaehler(u.s), { x_captcha: 1 });
}));
