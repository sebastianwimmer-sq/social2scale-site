import { describe, it, expect } from 'vitest';
import { parseFotoDataUrl, avatarKey, speichereAvatar, ladeAvatar } from '../src/avatar.js';

/** Gueltige data-URL oberhalb der Mindestgroesse (3000 Bytes dekodiert). */
const GUT = 'data:image/jpeg;base64,' + btoa('x'.repeat(3000));

/** Fake-R2 mit dem kleinen Ausschnitt der API, den avatar.js nutzt. */
function fakeR2() {
  const ablage = new Map();
  return {
    async put(key, bytes, opts) {
      ablage.set(key, { bytes, opts });
    },
    async get(key) {
      const obj = ablage.get(key);
      if (!obj) return null;
      return {
        httpMetadata: obj.opts?.httpMetadata,
        arrayBuffer: async () => obj.bytes.buffer.slice(0),
      };
    },
    _ablage: ablage,
  };
}

describe('parseFotoDataUrl', () => {
  it('nimmt jpeg/png/webp oberhalb der Mindestgroesse an', () => {
    for (const typ of ['jpeg', 'png', 'webp']) {
      const p = parseFotoDataUrl(`data:image/${typ};base64,` + btoa('x'.repeat(3000)));
      expect(p, typ).not.toBeNull();
      expect(p.typ).toBe(`image/${typ}`);
      expect(p.bytes.length).toBe(3000);
    }
  });

  it('lehnt fremde Typen, kaputtes Base64 und Nicht-data-URLs ab', () => {
    expect(parseFotoDataUrl('data:image/svg+xml;base64,' + btoa('x'.repeat(3000)))).toBeNull();
    expect(parseFotoDataUrl('data:text/html;base64,' + btoa('x'.repeat(3000)))).toBeNull();
    expect(parseFotoDataUrl('data:image/jpeg;base64,!!!nicht-base64!!!')).toBeNull();
    expect(parseFotoDataUrl('https://boese.example/bild.jpg')).toBeNull();
    expect(parseFotoDataUrl('')).toBeNull();
    expect(parseFotoDataUrl(null)).toBeNull();
  });

  it('lehnt Winzbilder unter der Mindestgroesse ab', () => {
    expect(parseFotoDataUrl('data:image/jpeg;base64,' + btoa('x'.repeat(100)))).toBeNull();
  });
});

describe('avatarKey', () => {
  it('liegt im Lead-Prefix, aber NICHT als .jpg — buildStatus zaehlt .jpg-Keys', () => {
    expect(avatarKey('abc123')).toBe('free/abc123/avatar.bin');
    expect(avatarKey('abc123').endsWith('.jpg')).toBe(false);
  });

  it('laesst nur Token-Zeichen in den Key', () => {
    expect(avatarKey('../boese')).toBe('free/boese/avatar.bin');
  });
});

describe('speichereAvatar + ladeAvatar', () => {
  it('legt ein gutes Foto ab und liefert es als data-URL zurueck', async () => {
    const env = { IMAGES: fakeR2() };
    expect(await speichereAvatar(env, 'tok1', GUT)).toBe(true);
    const url = await ladeAvatar(env, 'tok1');
    expect(url).toBe(GUT); // verlustfrei: gleicher Typ, gleiche Bytes
  });

  it('speichert nichts bei kaputtem Foto', async () => {
    const env = { IMAGES: fakeR2() };
    expect(await speichereAvatar(env, 'tok1', 'data:text/html;base64,' + btoa('x'.repeat(3000)))).toBe(false);
    expect(env.IMAGES._ablage.size).toBe(0);
  });

  it('ladeAvatar: null wenn kein Foto liegt', async () => {
    expect(await ladeAvatar({ IMAGES: fakeR2() }, 'tok1')).toBeNull();
  });

  it('ladeAvatar: null wenn R2 wirft — wirft selbst NIE', async () => {
    const env = { IMAGES: { get: async () => { throw new Error('r2 down'); } } };
    expect(await ladeAvatar(env, 'tok1')).toBeNull();
  });

  it('speichereAvatar: false wenn R2 wirft — wirft selbst NIE', async () => {
    const env = { IMAGES: { put: async () => { throw new Error('r2 down'); } } };
    expect(await speichereAvatar(env, 'tok1', GUT)).toBe(false);
  });
});
