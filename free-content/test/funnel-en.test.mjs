import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formPage } from '../src/pages/form.js';
import { formPageEn, uebersetzen, TABELLE } from '../src/pages/form-en.js';
import { deutscheReste as reste } from './deutsch-reste.mjs';

// Englischer Funnel = die deutsche Seite, uebersetzt (Sebi 23.10.2026: „immer beides 1/1“).
const de = await formPage({ TURNSTILE_SITE_KEY: 'x' }).text();
const en = await (await formPageEn({ TURNSTILE_SITE_KEY: 'x' })).text();

// Was an den Server geht oder intern bleibt, darf deutsch sein — nichts davon sieht die Besucherin.
const INTERN = new Set(['Ziel', 'Rückruf', 'Stand', 'Rahmen', 'Mehr Anfragen', 'Mehr Sichtbarkeit', 'Mehr Umsatz',
  'Weniger Zeit für Content', 'Meine Marke stärken', 'Ganz am Anfang', 'Poste unregelmäßig', 'Aktiv, will mehr', 'ist-empf',
  // Setting-Film (#378): Schlüssel der Zeitleiste, Wortmarke und Klassennamen — Code, kein sichtbarer Text
  'von', 'nicht', 'ist', '.film-nochmal']);
test('EN-Funnel: kein sichtbares Deutsch', () => {
  assert.deepEqual(reste(en, INTERN), []);
});
test('Gegenprobe: das Tor sieht Deutsch auf der deutschen Seite und in einer vergessenen Zeile', () => {
  assert.ok(reste(de, INTERN).length > 50);
  const ohneZeile = uebersetzen(de, TABELLE.filter(([alt]) => alt !== '<span class="lab">Weiter</span>'));
  assert.ok(reste(ohneZeile, INTERN).includes('Weiter'));
});
test('jede Tabellenzeile trifft die deutsche Seite (sonst bricht der Bau ab)', () => {
  assert.throws(() => uebersetzen(de, [['§§ kommt nirgends vor §§', 'x']]), /nicht in der deutschen Seite/);
  for (const [alt] of TABELLE) assert.ok(de.includes(alt), alt.slice(0, 60));
});
test('EN-Funnel ist englisch ausgezeichnet und verweist auf die deutsche Schwester', () => {
  assert.match(en, /<html lang="en">/);
  assert.match(en, /<a class="sprache" href="\/" hreflang="de"/);
  assert.match(de, /<a class="sprache" href="\/en\/" hreflang="en"/);
  for (const h of [de, en]) {
    assert.match(h, /hreflang="de" href="https:\/\/start\.social2scale\.com\/"/);
    assert.match(h, /hreflang="en" href="https:\/\/start\.social2scale\.com\/en\/"/);
  }
});
test('EN-Anfragen tragen sprache:en, Calendly-Notiz auf Englisch', () => {
  assert.match(en, /elapsed:Date\.now\(\)-START,sprache:'en'\}/);
  assert.match(en, /source:'formular',\n\s*sprache:'en',/);
  assert.match(en, /buchungsNotiz\(payload,'en'\)/);
  assert.doesNotMatch(de, /sprache:'en'/);
});
test('EN-Skript laesst sich einlesen', () => {
  for (const m of en.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]);
});

// ── Ergebnisseite, Mails, Bilder (Leads aus /en/) ──
import { resultPage } from '../src/pages/result.js';
import { resultPageEn, TABELLE_RESULT } from '../src/pages/result-en.js';
import { buildConfirmMail, buildResultMail } from '../src/mail.js';
import { buildPage } from '../src/templates/frames.js';
import { buildFallback } from '../src/copy.js';

test('EN-Ergebnisseite: kein sichtbares Deutsch, jede Zeile trifft', async () => {
  const deR = await resultPage('abcdef12').text();
  for (const [alt] of TABELLE_RESULT) assert.ok(deR.includes(alt), alt.slice(0, 60));
  const enR = await (await resultPageEn('abcdef12')).text();
  assert.deepEqual(reste(enR), []);
  assert.ok(reste(deR).length > 20, 'Gegenprobe: die deutsche Seite muss rot sein');
});
const ANSCHRIFT = new Set(['social2scale &mdash; Philipp Libowicz · Johannes-Hess-Straße 1, 84489 Burghausen &middot;']);
test('EN-Mails: Bestaetigung und Ergebnis ohne Deutsch, deutsche bleiben deutsch', () => {
  const lead = { name: 'Anna Smith', token: 'abc123', sprache: 'en' };
  for (const m of [buildConfirmMail(lead, 'https://x'), buildResultMail(lead, 'https://x')]) {
    // Die Anschrift ist ein Eigenname (Johannes-Hess-Straße), kein Text zum Uebersetzen.
    assert.deepEqual(reste(m.htmlContent, ANSCHRIFT), [], m.subject);
    assert.doesNotMatch(m.subject, /[äöü]|dein|Klick/);
  }
  assert.match(buildConfirmMail({ ...lead, sprache: 'de' }, 'https://x').subject, /Klick/);
});
test('EN-Bilder: Profil, Slides und Share-Card ohne Deutsch; QR fuehrt in den EN-Funnel', () => {
  const clean = { name: 'Anna', handle: 'anna.yoga', sprache: 'en' };
  const pal = [{ a: '#5FA88C', t: '#1B2C24', ti: '#E7EFE9' }, { a: '#1FA6E0', t: '#123244', ti: '#EAF4F8' }];
  const en = buildPage(clean, buildFallback(clean), pal, 'https://start.social2scale.com');
  assert.deepEqual(reste(en), []);
  const de = buildPage({ ...clean, sprache: 'de' }, buildFallback({ name: 'Anna' }), pal, 'https://start.social2scale.com');
  assert.ok(reste(de).length > 5, 'Gegenprobe: deutsche Bilder muessen rot sein');
});

import { checkInput } from '../src/moderate.js';
test('Themen-Filter kennt englische Versprechen, laesst normale englische Themen durch', () => {
  for (const branche of ['I cure anxiety naturally', 'Healing your gut', 'Pain-free in 7 days', 'Selling drugs online'])
    assert.equal(checkInput({ branche, ziel: 'Mehr Anfragen' }).ok, false, branche);
  for (const branche of ['Yoga for busy professionals', 'Healthy recipes for families', 'Leadership coaching for founders'])
    assert.equal(checkInput({ branche, ziel: 'Mehr Anfragen' }).ok, true, branche);
});

// Zaehlung getrennt (Ticket #372): der echte Zaehl-Code beider Seiten, mit nachgebautem Browser.
import vm from 'node:vm';
function gemeldet(html, lang) {
  const code = html.slice(html.indexOf('const GEZAEHLT'), html.indexOf('function show(n){'));
  const raus = [];
  const ctx = {
    document: { documentElement: { lang }, referrer: '' }, window: {},
    navigator: { doNotTrack: '0', sendBeacon: (_u, b) => raus.push(b) },
    matchMedia: () => ({ matches: true }), Blob: class { constructor([s]) { this.s = s; } }, JSON, Set,
  };
  vm.runInNewContext(code + ';[0,16,17,"b",15,"termin"].forEach(zaehlen);', ctx);
  return raus.map((b) => JSON.parse(b.s).p);
}
test('EN-Funnel meldet seine Schritte unter /en/, der deutsche ohne — eigener Trichter im CRM', () => {
  assert.deepEqual(gemeldet(de, 'de'), ['/vorschau/', '/vorschau/check/zeit/', '/vorschau/passt/', '/vorschau/weg/b/', '/vorschau/b/gesendet/', '/vorschau/b/termin/']);
  assert.deepEqual(gemeldet(en, 'en'), ['/en/vorschau/', '/en/vorschau/check/zeit/', '/en/vorschau/passt/', '/en/vorschau/weg/b/', '/en/vorschau/b/gesendet/', '/en/vorschau/b/termin/']);
});

// Team und Prueflaeufe zaehlen nicht (26.10.2026): ?zaehlen=aus merkt sich das Geraet.
function gemeldetMit(html, search, speicher) {
  const code = html.slice(html.indexOf('const GEZAEHLT'), html.indexOf('function show(n){'));
  const raus = [];
  const ctx = {
    document: { documentElement: { lang: 'de' }, referrer: '' }, window: {}, location: { search },
    localStorage: { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => { speicher[k] = v; }, removeItem: (k) => { delete speicher[k]; } },
    URLSearchParams, navigator: { doNotTrack: '0', sendBeacon: (_u, b) => raus.push(b) },
    matchMedia: () => ({ matches: true }), Blob: class { constructor([s]) { this.s = s; } }, JSON, Set,
  };
  vm.runInNewContext(code + ';zaehlen(0);', ctx);
  return raus.length;
}
test('Funnel: ?zaehlen=aus zaehlt nicht und bleibt aus, ?zaehlen=an zaehlt wieder', () => {
  const speicher = {};
  assert.equal(gemeldetMit(de, '', speicher), 1, 'normal zaehlt');
  assert.equal(gemeldetMit(de, '?zaehlen=aus', speicher), 0);
  assert.equal(gemeldetMit(de, '', speicher), 0, 'bleibt aus');
  assert.equal(gemeldetMit(de, '?zaehlen=an', speicher), 1);
});

// Richter-Loop 01.11.2026: wer englisch einwilligt, bekommt die englische Erklärung (Art. 12 DSGVO).
test('EN-Funnel verlinkt die englische Datenschutzerklärung, die deutsche Seite die deutsche', () => {
  assert.equal((en.match(/social2scale\.com\/datenschutz\//g) ?? []).length, 0);
  assert.equal((en.match(/social2scale\.com\/en\/privacy\//g) ?? []).length, (de.match(/social2scale\.com\/datenschutz\//g) ?? []).length);
  assert.ok((de.match(/social2scale\.com\/datenschutz\//g) ?? []).length >= 3);
});
