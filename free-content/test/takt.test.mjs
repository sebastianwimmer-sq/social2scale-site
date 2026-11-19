import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istFuenfterTakt } from '../src/takt.js';

const um = (iso) => ({ scheduledTime: Date.parse(iso) });

test('zur fünften Minute laufen die Aufgaben, dazwischen nicht', () => {
  assert.equal(istFuenfterTakt(um('2026-11-19T10:05:00Z')), true);
  assert.equal(istFuenfterTakt(um('2026-11-19T10:00:00Z')), true);
  assert.equal(istFuenfterTakt(um('2026-11-19T10:04:00Z')), false);
  assert.equal(istFuenfterTakt(um('2026-11-19T10:06:00Z')), false);
});

test('ohne Zeitangabe laufen sie (Aufruf von Hand, alte Tests)', () => {
  assert.equal(istFuenfterTakt(undefined), true);
  assert.equal(istFuenfterTakt({}), true);
});
