import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('Bindings', () => {
  it('kennt den R2-Bucket fuer die Bilder', () => {
    expect(env.IMAGES).toBeDefined();
    expect(typeof env.IMAGES.put).toBe('function');
  });
});
