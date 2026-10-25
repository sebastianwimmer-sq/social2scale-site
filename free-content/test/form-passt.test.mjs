import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formPage } from '../src/pages/form.js';

// „Passt du zu uns?“ (16.10.2026): erst der Check, dann Ergebnis und Wahl.
const html = await formPage({ TURNSTILE_SITE_KEY: 'x' }).text();

test('Einstieg fragt „Passt du zu uns?“ statt sofort einen Weg zu waehlen', () => {
  const schritt0 = html.slice(html.indexOf('class="q on" data-step="0"'), html.indexOf('class="q" data-step="1"'));
  assert.match(schritt0, /Passt du zu <em>uns<\/em>\?/);
  assert.match(schritt0, /id="checkStart"/);
  assert.doesNotMatch(schritt0, /data-weg=/);
});

test('Schritte stehen in DOM-Reihenfolge 0…18 (qs[n] greift per Position)', () => {
  const folge = [...html.matchAll(/class="q[^"]*" data-step="(\d+)"/g)].map((m) => +m[1]);
  assert.deepEqual(folge, Array.from({ length: 19 }, (_, i) => i));
});

test('Ergebnis-Schirm hat beide Wege, die Zeit-Frage fuehrt dorthin, Zurueck aus A/B zum Ergebnis', () => {
  const s17 = html.slice(html.indexOf('class="q" data-step="17"'), html.indexOf('class="q" data-step="18"'));
  assert.match(s17, /data-weg="a"/);
  assert.match(s17, /data-weg="b"/);
  assert.match(html, /data-req="zeit" data-go="18"/);
  const s7 = html.slice(html.indexOf('class="q" data-step="7"'), html.indexOf('class="q" data-step="8"'));
  const s12 = html.slice(html.indexOf('class="q" data-step="12"'), html.indexOf('class="q" data-step="13"'));
  assert.match(s7, /class="back" data-go="17"/);
  assert.match(s12, /class="back" data-go="17"/);
});

test('Zaehlpfade des Checks sind die, die das Portal zulaesst (siteviews.js VORSCHAU_CHECK)', () => {
  assert.match(html, /'\/vorschau\/check\/zeit\/'/);
  assert.match(html, /'\/vorschau\/passt\/'/);
  assert.match(html, /'\/vorschau\/check\/mitbringen\/'/);
  assert.doesNotMatch(html, /\/vorschau\/c\/empfehlung\//);
});

test('Keine erfundene Knappheit: keine Platz-, Wartelisten- oder Countdown-Zahl (UWG §5)', () => {
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  assert.doesNotMatch(sichtbar, /nur noch \d|Platz \d+ von|Warteliste|noch \d+ (Plätze|Plaetze)|Countdown/i);
});

test('Commitment fragt die echten Voraussetzungen von /ablauf/ ab und fuehrt zum Ergebnis', () => {
  const s18 = html.slice(html.indexOf('class="q" data-step="18"'), html.indexOf('<p class="legal">'));
  for (const w of ['Eine halbe Stunde', 'Zugang zum Account', 'Bildmaterial', 'Die Rechte bleiben bei dir. Immer.']) assert.ok(s18.includes(w), w);
  assert.match(s18, /class="next" data-go="17"/);
  assert.match(s18, /class="back" data-go="16"/);
});

// Ein Regex im eingesetzten Skript steht im Quelltext in einem Template-Literal: dort wird
// aus `\s` ein `s`. 25.10.2026: der Steckbrief strich so jedes „s“ aus dem Instagram-Namen
// („@sebastian“ → „@ebatian“), DE und EN. Gesucht wird das, was AUSGELIEFERT wird.
import { formPageEn } from '../src/pages/form-en.js';
import { resultPage } from '../src/pages/result.js';
import { resultPageEn } from '../src/pages/result-en.js';
const skripte = (h) => [...h.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
export const verloreneEscapes = (js) => [...js.matchAll(/(?:replace|match|split|test)\(\/((?:[^/\\\n]|\\.)+)\/[gimsuy]*/g)]
  .map((m) => m[1]).filter((r) => /(^|[^\\\w])[sdwSDW][+*?{]/.test(r));
test('Eingesetzte Skripte: kein Regex hat seinen Backslash verloren (DE, EN, Ergebnis)', async () => {
  const seiten = { de: html, en: await (await formPageEn({ TURNSTILE_SITE_KEY: 'x' })).text(),
    ergebnis: await resultPage('t').text(), ergebnisEn: await (await resultPageEn('t')).text() };
  for (const [name, h] of Object.entries(seiten)) assert.deepEqual(verloreneEscapes(skripte(h)), [], name);
});
test('Gegenprobe: ein verlorener Backslash wird gesehen, ein richtiger nicht', () => {
  assert.deepEqual(verloreneEscapes("v.replace(/s+/g,'')"), ['s+']);
  assert.deepEqual(verloreneEscapes("v.replace(/\\s+/g,'')"), []);
  assert.deepEqual(verloreneEscapes("v.replace(/^@+/,'')"), []);
});

// Keine erfundenen Follower-Zahlen auf IHREM Profil (25.10.2026: 1.240 / 1.2k / 318 standen seit August
// in Bild und Ergebnis) — wir kennen ihre echten Zahlen nicht, eine Zahl dort liest sich als Versprechen.
import { buildPage } from '../src/templates/frames.js';
import { buildFallback } from '../src/copy.js';
const PAL = [{ a: '#5FA88C', t: '#1B2C24', ti: '#E7EFE9' }, { a: '#1FA6E0', t: '#123244', ti: '#EAF4F8' }];
export const erfundeneZahlen = (h) => [...h.matchAll(/<b>([^<]*)<\/b><span>(Follower|Gefolgt|followers|following)<\/span>/g)]
  .filter((m) => m[1] !== '–').map((m) => `${m[1]} ${m[2]}`);
test('Ergebnis und Profilbild zeigen keine erfundenen Follower-Zahlen (DE und EN)', async () => {
  const seiten = [await resultPage('t').text(), await (await resultPageEn('t')).text(),
    ...['de', 'en'].map((sprache) => buildPage({ name: 'Anna', handle: 'anna.yoga', sprache }, buildFallback({ name: 'Anna' }), PAL, 'https://start.social2scale.com'))];
  for (const h of seiten) assert.deepEqual(erfundeneZahlen(String(h)), []);
  assert.ok(seiten.every((h) => /<b>–<\/b><span>(Follower|followers)<\/span>/.test(String(h))), 'Follower-Feld muss da sein (sonst prueft der Test nichts)');
});
test('Gegenprobe: eine erfundene Follower-Zahl wird gesehen', () => {
  assert.deepEqual(erfundeneZahlen('<b>1.2k</b><span>Follower</span><b>–</b><span>Gefolgt</span>'), ['1.2k Follower']);
});
