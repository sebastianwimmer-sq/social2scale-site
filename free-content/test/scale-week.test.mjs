import test from 'node:test';
import assert from 'node:assert/strict';
import { START, ENDE, absatz, einsetzen } from '../src/scale-week.js';

const BEFUND = "<nav><a class='knopf klein' href='x'>Termin</a></nav><div class='weg'><h3>Sprich mit Phil</h3><p>Er geht ihn durch.</p><a class='knopf' href='k'>Termin wählen</a></div><div class='weg'><a class='knopf' href='v'>Vorschau</a></div>";

test('Scale Week: genau einmal, vor dem Knopf von Phil', () => {
  const s = einsetzen(BEFUND, 'de', START);
  assert.equal(s.split('data-scale-week').length, 2);
  assert.ok(s.indexOf('Er geht ihn durch') < s.indexOf('data-scale-week') && s.indexOf('data-scale-week') < s.indexOf('Termin wählen'));
  assert.equal(s.replace(absatz('de'), ''), BEFUND);
});

test('Scale Week: an der Frist auf die Millisekunde', () => {
  assert.equal(einsetzen(BEFUND, 'de', START - 1), BEFUND);
  assert.notEqual(einsetzen(BEFUND, 'de', ENDE - 1), BEFUND);
  assert.equal(einsetzen(BEFUND, 'de', ENDE), BEFUND);
});

test('Scale Week: ohne die Stelle bleibt der Befund, wie er ist', () => {
  for (const x of ['', '<p>leer</p>', "<a class='knopf' href='k'>ohne Weg</a>"]) assert.equal(einsetzen(x, 'de', START), x);
});

test('Scale Week: Bedingungen vollständig, keine Platz- oder Streichpreis-Aussage', () => {
  const [de, en] = ['de', 'en'].map((s) => absatz(s).replace(/\u00a0/g, ' '));
  for (const x of ['30. November, 23:59', 'WACHSTUM', '1.297,10 €', 'BASIS', '300 Token', '/scale-week/']) assert.ok(de.includes(x), x);
  for (const x of ['30 November, 11:59 pm', 'GROWTH', '€1,297.10', 'BASIS', '300 tokens', '/en/scale-week/']) assert.ok(en.includes(x), x);
  for (const x of [de, en]) assert.doesNotMatch(x, /nur noch|Plätze|only \d|spots|<s>|line-through|garantier/i);
});

test('Terminknopf im Befund: Herkunft und fester Satz, keine persönlichen Daten', async () => {
  const { reelCheckStandSeite } = await import('../src/pages/reel-check.js');
  const token = 'a'.repeat(48), url = 'https://calendly.com/philipplibowicz/neues-meeting';
  for (const [sprache, wort] of [['de', 'Reel-Befund'], ['en', 'reel report']]) {
    const s = await reelCheckStandSeite({ status: 'fertig', sprache, token, befund: `<a class='knopf klein' href='${url}'>x</a><a class='knopf' href='${url}'>y</a>` }).text();
    assert.equal(s.split('utm_source=reel-check').length, 3);
    assert.ok(decodeURIComponent(s).includes(wort));
    assert.ok(!s.includes(token) && !s.includes(`href='${url}'`));
  }
});
