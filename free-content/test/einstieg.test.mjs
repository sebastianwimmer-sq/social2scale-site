import { test } from 'node:test';
import assert from 'node:assert/strict';
import { einstiegUmleiten } from '../src/einstieg.js';
const u = (p, m = 'GET') => einstiegUmleiten(new Request('https://start.social2scale.com' + p, { method: m }));

test('nackter Aufruf führt in den Reel-Check, Sprache und Herkunft bleiben', () => {
  assert.equal(u('/'), 'https://start.social2scale.com/reel-check/');
  assert.equal(u('/en/'), 'https://start.social2scale.com/en/reel-check/');
  assert.equal(u('/?von=facebook'), 'https://start.social2scale.com/reel-check/?von=facebook');
});

test('Wege mit Kennung, andere Pfade und andere Methoden bleiben', () => {
  for (const p of ['/?weg=a', '/?weg=b', '/en/?weg=b', '/?von=check&rc=abc', '/reel-check/', '/rc/abc', '/api/health', '/c/abc']) assert.equal(u(p), null, p);
  assert.equal(u('/', 'HEAD'), null);
  assert.equal(u('/', 'POST'), null);
});
