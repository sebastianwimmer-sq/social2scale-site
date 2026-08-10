import { describe, it, expect, vi } from 'vitest';
import { pruefeFoto } from '../src/moderate-foto.js';

const FOTO = 'data:image/jpeg;base64,' + btoa('x'.repeat(3000));

function fakeClaude(inhalt) {
  return async () => ({
    ok: true,
    json: async () => ({ content: [{ type: 'tool_use', name: 'bewerte_foto', input: inhalt }] }),
  });
}

describe('pruefeFoto — Bildmoderation vor dem Render', () => {
  it('laesst ein unbedenkliches Foto durch', async () => {
    const env = { ANTHROPIC_API_KEY: 'k' };
    const r = await pruefeFoto(env, FOTO, fakeClaude({ ablehnen: false }));
    expect(r.ok).toBe(true);
  });

  it('lehnt ein gemeldetes Motiv ab — mit Grund', async () => {
    const env = { ANTHROPIC_API_KEY: 'k' };
    const r = await pruefeFoto(env, FOTO, fakeClaude({ ablehnen: true, grund: 'gewalt' }));
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('gewalt');
  });

  it('FAIL-OPEN: API-Fehler blockiert kein legitimes Foto (Founder-Sichtung faengt den Rest)', async () => {
    const env = { ANTHROPIC_API_KEY: 'k' };
    const kaputt = async () => { throw new Error('529'); };
    const r = await pruefeFoto(env, FOTO, kaputt);
    expect(r.ok).toBe(true);
    expect(r.ungeprueft).toBe(true);
  });

  it('ohne API-Key: fail-open, als ungeprueft markiert', async () => {
    const r = await pruefeFoto({}, FOTO, async () => { throw new Error('nie aufgerufen'); });
    expect(r.ok).toBe(true);
    expect(r.ungeprueft).toBe(true);
  });
});
