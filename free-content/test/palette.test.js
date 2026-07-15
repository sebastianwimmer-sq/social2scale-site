import { describe, it, expect } from 'vitest';
import { derivePalettes } from '../src/palette.js';

const istHex = (v) => /^#[0-9a-f]{6}$/i.test(v);

describe('derivePalettes', () => {
  it('liefert IMMER genau zwei Farbwelten', () => {
    for (const s of ['ruhig', 'kraftvoll', 'hell', 'unbekannt', '', null]) {
      expect(derivePalettes(s, '')).toHaveLength(2);
    }
  });

  it('liefert vollstaendige, gueltige Paletten', () => {
    for (const p of derivePalettes('ruhig', '')) {
      for (const key of ['paper', 'ink', 'inkSoft', 'accent', 'rule']) {
        expect(p[key], `${p.id}.${key}`).toBeTruthy();
      }
      expect(istHex(p.paper)).toBe(true);
      expect(istHex(p.ink)).toBe(true);
      expect(istHex(p.accent)).toBe(true);
      expect(p.id).toMatch(/^[a-z-]+$/);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('gibt den beiden Welten unterschiedliche ids', () => {
    const [a, b] = derivePalettes('ruhig', '');
    expect(a.id).not.toBe(b.id);
  });

  it('gibt "ruhig" KEIN Anthrazit — B traegt auch hell', () => {
    // Der ganze Sinn von "Palette aus ihren Antworten": wer ruhig/hell angibt,
    // darf keine Kachel bekommen, die nicht zu ihr passt.
    const [a, b] = derivePalettes('ruhig', '');
    for (const p of [a, b]) expect(p.paper.toLowerCase()).not.toBe('#0e1013');
  });

  it('gibt "kraftvoll" mindestens eine dunkle Welt', () => {
    const paletten = derivePalettes('kraftvoll', '');
    const dunkel = paletten.filter((p) => p.paper.toLowerCase() < '#888888');
    expect(dunkel.length).toBeGreaterThanOrEqual(1);
  });

  it('nimmt ihre Wunschfarbe als Akzent, wenn sie eine nennt', () => {
    const [a] = derivePalettes('ruhig', '#C2410C');
    expect(a.accent.toLowerCase()).toBe('#c2410c');
  });

  it('ignoriert eine unbrauchbare Wunschfarbe statt zu kippen', () => {
    for (const müll of ['blau', 'javascript:alert(1)', '#XYZ', '', null, undefined]) {
      const paletten = derivePalettes('ruhig', müll);
      expect(paletten).toHaveLength(2);
      for (const p of paletten) expect(istHex(p.accent)).toBe(true);
    }
  });

  it('ist deterministisch — gleiche Eingabe, gleiche Paletten', () => {
    expect(derivePalettes('kraftvoll', '#D9FF3D')).toEqual(derivePalettes('kraftvoll', '#D9FF3D'));
  });
});
