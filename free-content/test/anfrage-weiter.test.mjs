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
    CREATE TABLE free_intake_log (ip TEXT, created_at TEXT);
    CREATE TABLE events (id INTEGER PRIMARY KEY, client_id INTEGER, title TEXT, date TEXT, time TEXT, type TEXT, note TEXT, done INTEGER);`);
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
  const teile = { mx: async () => true, mail: async (env, to, name, m, absender) => { mails.push({ to, m, absender }); return true; } };
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
  assert.equal(u.mails[1].m.subject, 'Deine Anfrage ist bei mir angekommen');
  // kommt von Phil: Antworten an ihn, seine Nummer im Text
  assert.equal(u.mails[1].m.replyTo.email, 'philipp@social2scale.com');
  assert.match(u.mails[1].m.htmlContent, /tel:\+491515914278/);
  assert.match(u.mails[1].absender, /^Phil/);
  // Founder-Mail: Antworten an die Anfragende, Anruf-Link
  assert.equal(u.mails[0].m.replyTo.email, 'anna@beispiel.de');
  assert.match(u.mails[0].m.htmlContent, /href="tel:01712345678"/);
  // Anruf-Termin fuer heute im CRM
  const ev = u.s.prepare('SELECT * FROM events').all();
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, 'call');
  assert.match(ev[0].title, /Anrufen: Erstgespräch-Anfrage Anna/);
  assert.match(ev[0].note, /0171 2345678/);
  assert.match(u.mails[1].m.htmlContent, /start\.social2scale\.com\/\?weg=a/);
  // und Phils Calendly mit vorbefülltem Namen + E-Mail
  assert.match(u.mails[1].m.htmlContent, /calendly\.com\/philipplibowicz\/neues-meeting\?name=Anna&amp;email=anna%40beispiel\.de/);
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

import { buchungsLink, ERSTGESPRAECH_URL } from '../src/constants.js';
test('Buchungslink kodiert Leerzeichen als %20 und Sonderzeichen sicher', () => {
  assert.equal(buchungsLink('Anna Maria Müller', 'a+b@x.de'), ERSTGESPRAECH_URL + '?name=Anna%20Maria%20M%C3%BCller&email=a%2Bb%40x.de');
  assert.equal(buchungsLink('', ''), ERSTGESPRAECH_URL);
});

// Englische Website (/en/contact/, Ticket #353): dieselbe Anfrage, kenntlich als englisch.
function reqVon(body, origin) {
  return new Request('https://start.social2scale.com/api/anfrage', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', Origin: origin }, body: JSON.stringify(body),
  });
}
const EN = { name: 'Jane Doe', email: 'jane@example.com', phone: '+1 415 555 0100', business: 'Coach', goal: 'More inquiries', sprache: 'en', turnstile: 'tok' };

test('englische Anfrage: CRM und Phils Mail sagen Englisch, Bestätigung auf Englisch, als echt gezählt', () => mitTurnstile(true, async () => {
  const u = umgebung();
  const r = await handleAnfrage(reqVon(EN, 'https://social2scale.com'), { ...u.env, ALLOW_ORIGIN: 'https://social2scale.com', TURNSTILE_SECRET_WEBSITE: 'w' }, {}, u.teile);
  assert.equal(r.status, 200);
  const z = u.s.prepare('SELECT * FROM submissions').get();
  assert.match(z.payload, /\*\*Sprache:\*\* Englisch/);
  assert.match(z.payload, /Gefunden über:\*\* Link: en-contact/);
  assert.equal(JSON.parse(z.data).herkunft.von, 'en-contact');
  assert.match(u.mails[0].m.subject, /^\[EN\] Neue Erstgespräch-Anfrage: Jane Doe/);
  assert.match(u.mails[0].m.htmlContent, /Sprache:<\/b> Englisch/);
  assert.equal(u.mails[1].to, 'jane@example.com');
  assert.equal(u.mails[1].m.subject, 'Your inquiry has reached me');
  assert.match(u.mails[1].m.htmlContent, /Thanks, Jane/);
  assert.match(u.mails[1].m.htmlContent, /calendly\.com\/philipplibowicz\/neues-meeting\?name=Jane%20Doe/);
  assert.doesNotMatch(u.mails[1].m.htmlContent, /Gratis-Vorschau|Danke/);
  const ev = u.s.prepare('SELECT * FROM events').get();
  assert.match(ev.note, /Englisch/);
  assert.deepEqual(zaehler(u.s), { angekommen: 1 });
}));

test('unbekannte Sprache wird ignoriert (deutsch), Herkunft bleibt vorschau-b', () => {
  const d = anfrageAusFunnel({ ...GUT, sprache: '<script>' });
  assert.equal(d.sprache, '');
  assert.match(anfrageMarkdown(d), /Link: vorschau-b/);
  assert.doesNotMatch(anfrageMarkdown(d), /Sprache/);
});

// Eigenes Turnstile-Widget fuer die Website (Sebi 20.10.: Funnel und Website nicht mischen).
async function mitTurnstileSecret(fn) {
  const alt = globalThis.fetch; const genutzt = [];
  globalThis.fetch = async (url, init) => { genutzt.push(String(init.body).match(/secret=([^&]+)/)?.[1]); return new Response(JSON.stringify({ success: true }), { status: 200 }); };
  try { await fn(); return genutzt; } finally { globalThis.fetch = alt; }
}
test('Website-Anfrage prüft mit dem Website-Secret, der Funnel mit seinem', async () => {
  const u = umgebung();
  const env = { ...u.env, ALLOW_ORIGIN: 'https://social2scale.com', TURNSTILE_SECRET_WEBSITE: 'web' };
  const web = await mitTurnstileSecret(() => handleAnfrage(reqVon(EN, 'https://social2scale.com'), env, {}, u.teile));
  assert.deepEqual(web, ['web']);
  const funnel = await mitTurnstileSecret(() => handleAnfrage(reqVon(GUT, 'https://start.social2scale.com'), env, {}, u.teile));
  assert.deepEqual(funnel, ['s']);
});
test('Website-Anfrage ohne Website-Secret: abgelehnt, nicht mit dem Funnel-Secret durchgewunken', () => mitTurnstile(true, async () => {
  const u = umgebung();
  const r = await handleAnfrage(reqVon(EN, 'https://social2scale.com'), { ...u.env, ALLOW_ORIGIN: 'https://social2scale.com' }, {}, u.teile);
  assert.equal(r.status, 403);
  assert.equal(u.s.prepare('SELECT COUNT(*) AS c FROM submissions').get().c, 0);
}));

// Calendly-Vorbereitungsfeld (a1, 20.10.2026): was sie im Formular schrieb, steht schon drin.
import { buchungsNotiz } from '../src/constants.js';
import { formPage } from '../src/pages/form.js';
test('buchungsNotiz: Felder in fester Reihenfolge, leere fallen weg, englische Etiketten', () => {
  assert.equal(buchungsNotiz({ goal: 'Mehr Anfragen', business: '', budget: 'unter 1.000 €', phone: '0171 2345678' }, 'de'),
    'Ziel: Mehr Anfragen\nRahmen: unter 1.000 €\nRückruf: 0171 2345678');
  assert.equal(buchungsNotiz({ goal: 'More leads', start: 'Sofort' }, 'en'), 'Goal: More leads\nStart: Right away');
  assert.equal(buchungsNotiz({}, 'de'), '');
  assert.equal(buchungsNotiz({ goal: 'x'.repeat(900) }, 'de').length, 600);
});
test('Buchungslink trägt die Notiz als a1, ohne Notiz bleibt er wie bisher', () => {
  assert.equal(buchungsLink('Anna', 'a@x.de', 'Ziel: A B'), ERSTGESPRAECH_URL + '?name=Anna&email=a%40x.de&a1=Ziel%3A%20A%20B');
  assert.equal(buchungsLink('Anna', 'a@x.de'), ERSTGESPRAECH_URL + '?name=Anna&email=a%40x.de');
});
test('Bestätigungsmail verlinkt Calendly mit vorbefülltem Ziel', () => mitTurnstile(true, async () => {
  const u = umgebung();
  await handleAnfrage(req(GUT), u.env, {}, u.teile);
  assert.match(u.mails[1].m.htmlContent, /a1=Ziel%3A%20Mehr%20Anfragen/);
}));
test('Funnel Weg B rechnet im Browser denselben Link wie der Worker', async () => {
  const html = await formPage({ TURNSTILE_SITE_KEY: 'x' }).text();
  const von = html.indexOf("const ERSTGESPRAECH_URL='"), bis = html.indexOf('// „Passt du zu uns?“', von);
  assert.ok(von > 0 && bis > von, 'eingesetzte Funktionen nicht gefunden');
  const imBrowser = new Function(html.slice(von, bis) + '\nreturn {buchungsLink, buchungsNotiz};')();
  const p = { name: 'Anna Müller', email: 'a+b@x.de', goal: 'Mehr Anfragen', phone: '0171 2345678' };
  assert.equal(imBrowser.buchungsLink(p.name, p.email, imBrowser.buchungsNotiz(p, 'de')), buchungsLink(p.name, p.email, buchungsNotiz(p, 'de')));
  assert.match(html, /\$\('#termin-b'\)\.href=buchungsLink\(payload\.name,payload\.email,buchungsNotiz\(payload,'de'\)\)/);
});

import { WAHL_EN } from '../src/constants.js';
import { readFileSync } from 'node:fs';
test('EN-Mail: Rahmen/Start erscheinen so, wie sie sie auf der EN-Seite angeklickt hat', () => {
  const seite = readFileSync(new URL('../../en/contact/index.html', import.meta.url), 'utf8');
  const paare = [...seite.matchAll(/name="(?:budget|start)" value="([^"]*)"><span>([^<]*)/g)].map((m) => [m[1], m[2]]);
  assert.ok(paare.length >= 7, 'Radios nicht gefunden');
  for (const [wert, text] of paare) assert.equal(WAHL_EN[wert], text, wert);
  assert.equal(buchungsNotiz({ budget: 'unter 1.000 €', start: 'Sofort' }, 'en'), 'Budget: under €1,000\nStart: Right away');
  assert.equal(buchungsNotiz({ budget: 'unter 1.000 €' }, 'de'), 'Rahmen: unter 1.000 €');
});
