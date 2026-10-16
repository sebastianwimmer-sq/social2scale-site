import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formPage } from '../src/pages/form.js';

// „Passt du zu uns?“ (16.10.2026): erst der Check, dann Ergebnis und Wahl.
const html = await formPage({ TURNSTILE_SITE_KEY: 'x' }).text();

test('Einstieg fragt „Passt du zu uns?“ statt sofort einen Weg zu waehlen', () => {
  const schritt0 = html.slice(html.indexOf('data-step="0"'), html.indexOf('data-step="1"'));
  assert.match(schritt0, /Passt du zu <em>uns<\/em>\?/);
  assert.match(schritt0, /id="checkStart"/);
  assert.doesNotMatch(schritt0, /data-weg=/);
});

test('Schritte stehen in DOM-Reihenfolge 0…17 (qs[n] greift per Position)', () => {
  const folge = [...html.matchAll(/class="q[^"]*" data-step="(\d+)"/g)].map((m) => +m[1]);
  assert.deepEqual(folge, Array.from({ length: 18 }, (_, i) => i));
});

test('Ergebnis-Schirm hat beide Wege, die Zeit-Frage fuehrt dorthin, Zurueck aus A/B zum Ergebnis', () => {
  const s17 = html.slice(html.indexOf('data-step="17"'), html.indexOf('<p class="legal">'));
  assert.match(s17, /data-weg="a"/);
  assert.match(s17, /data-weg="b"/);
  assert.match(html, /data-req="zeit" data-go="17"/);
  const s7 = html.slice(html.indexOf('data-step="7"'), html.indexOf('data-step="8"'));
  const s12 = html.slice(html.indexOf('data-step="12"'), html.indexOf('data-step="13"'));
  assert.match(s7, /class="back" data-go="17"/);
  assert.match(s12, /class="back" data-go="17"/);
});

test('Zaehlpfade des Checks sind die, die das Portal zulaesst (siteviews.js VORSCHAU_CHECK)', () => {
  assert.match(html, /'\/vorschau\/check\/zeit\/'/);
  assert.match(html, /'\/vorschau\/passt\/'/);
  assert.doesNotMatch(html, /\/vorschau\/c\/empfehlung\//);
});

test('Keine erfundene Knappheit: keine Platz-, Wartelisten- oder Countdown-Zahl (UWG §5)', () => {
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  assert.doesNotMatch(sichtbar, /nur noch \d|Platz \d+ von|Warteliste|noch \d+ (Plätze|Plaetze)|Countdown/i);
});
