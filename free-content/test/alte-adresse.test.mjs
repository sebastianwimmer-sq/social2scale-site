import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alteAdresse } from '../src/alte-adresse.js';

test('alte workers.dev-Adresse leitet mit Pfad und Query um', () => {
  const r = alteAdresse(new Request('https://s2s-free-content.konto.workers.dev/r/abc?x=1'));
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://start.social2scale.com/r/abc?x=1');
});

test('Markenadresse wird nicht umgeleitet', () => {
  assert.equal(alteAdresse(new Request('https://start.social2scale.com/')), null);
});

test('POST auf alte Adresse läuft weiter statt umgeleitet', () => {
  assert.equal(alteAdresse(new Request('https://s2s-free-content.konto.workers.dev/api/x', { method: 'POST' })), null);
});
