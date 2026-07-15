import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { isHoneypotTripped, isTooFast } from '../src/protect.js';

describe('health', () => {
  it('antwortet mit ok', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('protect: Honeypot', () => {
  it('schlaegt an, wenn das versteckte Feld gefuellt ist', () => {
    expect(isHoneypotTripped({ website: 'http://spam.example' })).toBe(true);
  });

  it('schlaegt bei leerem/fehlendem Feld nicht an', () => {
    expect(isHoneypotTripped({ website: '' })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
  });
});

describe('protect: Mindest-Ausfuellzeit', () => {
  it('weist zu schnelle Eingaben ab', () => {
    expect(isTooFast({ elapsed: 200 })).toBe(true);
  });

  it('laesst menschliche Geschwindigkeit durch', () => {
    expect(isTooFast({ elapsed: 9000 })).toBe(false);
  });

  it('laesst eine fehlende Messung durch (fail-open)', () => {
    expect(isTooFast({})).toBe(false);
  });
});
