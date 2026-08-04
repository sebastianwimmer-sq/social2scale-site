import { describe, it, expect } from 'vitest';
import { holeAvatar } from '../src/avatar.js';

const PIXEL = new Uint8Array(3000).fill(7); // > AVATAR_MIN_BYTES

function fakeFetch({ status = 200, type = 'image/jpeg', body = PIXEL } = {}) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? type : null) },
    arrayBuffer: async () => body.buffer,
  });
}

describe('holeAvatar', () => {
  it('liefert eine data-URL bei gutem Bild', async () => {
    const url = await holeAvatar('yogamitanna', fakeFetch());
    expect(url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('null bei 404 (unavatar fallback=false: lieber ehrlich keins als ein fremdes Standardgesicht)', async () => {
    expect(await holeAvatar('x', fakeFetch({ status: 404 }))).toBeNull();
  });

  it('null bei falschem Content-Type (HTML-Fehlerseite)', async () => {
    expect(await holeAvatar('x', fakeFetch({ type: 'text/html' }))).toBeNull();
  });

  it('null bei Winzbild unter der Mindestgroesse', async () => {
    expect(await holeAvatar('x', fakeFetch({ body: new Uint8Array(100) }))).toBeNull();
  });

  it('null bei leerem Handle, ohne Fetch-Aufruf', async () => {
    let aufgerufen = false;
    const spion = async () => {
      aufgerufen = true;
    };
    expect(await holeAvatar('', spion)).toBeNull();
    expect(aufgerufen).toBe(false);
  });

  it('null wenn der Fetch wirft (Timeout/Netz) — wirft selbst NIE', async () => {
    const kaputt = async () => {
      throw new Error('network');
    };
    expect(await holeAvatar('x', kaputt)).toBeNull();
  });
});
