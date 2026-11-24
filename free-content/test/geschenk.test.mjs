import test from 'node:test';
import assert from 'node:assert/strict';
import { geschenk, geschenkEinsetzen, geschenkLink } from '../src/geschenk.js';
import { START, einsetzen } from '../src/scale-week.js';

const BEFUND = "<a class='knopf klein' href='x'>T</a><div class='weg'><p>Phil</p><a class='knopf' href='k'>Termin</a></div><div class='weg'><a class='knopf' href='v'>V</a></div>";

test('Geschenk: aus heißt byte-gleich, an heißt genau einmal vor Scale Week und Knopf', () => {
  assert.equal(geschenkEinsetzen(BEFUND, 'de', false), BEFUND);
  const s = geschenkEinsetzen(einsetzen(BEFUND, 'de', START), 'de', true);
  assert.equal(s.split('data-geschenk').length, 2);
  assert.ok(s.indexOf('data-geschenk') < s.indexOf('data-scale-week') && s.indexOf('data-scale-week') < s.indexOf("href='k'"));
  assert.equal(geschenkEinsetzen('<p>leer</p>', 'de', true), '<p>leer</p>');
});

test('Geschenk: Werte wie vereinbart, Erklärzeile, kein Streichpreis und keine Knappheit', () => {
  for (const [l, w] of [['de', ['129 €', '89 €', '69 €', '1.297,10 €', 'nicht zu kaufen']], ['en', ['€129', '€89', '€69', '€1,297.10', 'not sold separately']]]) {
    const h = geschenk(l).replace(/ /g, ' ');
    for (const x of w) assert.ok(h.includes(x), x);
    assert.equal(h.split('calendly.com').length, 4);
    assert.doesNotMatch(h, /<s>|<del|line-through|nur noch|only \d|garantier|<script/i);
  }
});

test('Geschenk: Phil liest die Wahl im Kalender, keine persönlichen Daten im Link', () => {
  const u = new URL(geschenkLink('de', 'Farben und Ton').replaceAll('&amp;', '&'));
  assert.equal(u.searchParams.get('a1'), 'Ich habe meinen Reel-Befund. Mein Geschenk: Farben und Ton. Mein Profil: @');
  assert.deepEqual([...u.searchParams.keys()], ['utm_source', 'utm_medium', 'a1']);
});
