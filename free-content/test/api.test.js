import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('health', () => {
  it('antwortet mit ok', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
