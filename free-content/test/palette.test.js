import { describe, it, expect } from 'vitest';
import { derivePalettes, contrastRatio } from '../src/palette.js';
import { ACCENT_MIN_CONTRAST } from '../src/constants.js';

const istHex = (v) => /^#[0-9a-f]{6}$/i.test(v);

/** Alle Stimmungen, die NACH_STIMMUNG kennt, plus der Standard-Fall. */
const ALLE_STIMMUNGEN = ['ruhig', 'natuerlich', 'hell', 'freundlich', 'kraftvoll', 'dunkel', 'edel', ''];

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

  it('nutzt ausschliesslich Farben aus den gerenderten Design-Belegen', () => {
    // Eine erfundene Palette ist eine, die nie jemand gesehen hat — und sie geht
    // trotzdem an echte Besucherinnen raus. Genau so ist die geloeschte "tinte"-Welt
    // entstanden. Diese Liste stammt aus design/.
    const BELEGT = new Set(['#0e1013','#14161a','#1b241f','#23201c','#2f6f5e','#5f6b62',
      '#6b645a','#767c86','#c2410c','#d9ff3d','#edf1ec','#f2f4f3','#f4f0e9','#fbfbfc']);

    // rgba() muss zurueckgerechnet werden: eine reine Hex-Pruefung SIEHT diese Werte
    // nicht — und genau darin hatte tinte ihr unbelegtes #EFF2F4 versteckt
    // (als rgba(239,242,244,.60)). Eine Pruefung, die wegschaut, ist keine.
    const alsHex = (v) => {
      const rgba = String(v).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!rgba) return String(v).toLowerCase();
      return '#' + rgba.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
    };

    for (const s of ['ruhig','natuerlich','hell','freundlich','kraftvoll','dunkel','edel','']) {
      for (const p of derivePalettes(s, '')) {
        // Alle vier Farbwerte, nicht drei — "jede Farbe" heisst jede.
        for (const key of ['paper', 'ink', 'accent', 'inkSoft', 'rule']) {
          const hex = alsHex(p[key]);
          expect(BELEGT.has(hex), `${p.id}.${key} = ${p[key]} → ${hex}`).toBe(true);
        }
      }
    }
  });
});

describe('Kontrast — ihre Wunschfarbe darf nicht unsichtbar werden', () => {
  it('laesst eine kontrastarme Wunschfarbe fallen statt sie unlesbar zu setzen', () => {
    // Sie waehlt exakt den Grund der Welt: der Akzent wuerde verschwinden.
    const [papier] = derivePalettes('hell', '#FBFBFC'); // papier.paper === '#FBFBFC'
    expect(papier.id).toBe('papier');
    expect(papier.accent.toLowerCase()).not.toBe('#fbfbfc');
    expect(papier.accent.toLowerCase()).toBe('#2f6f5e'); // eigener Akzent bleibt

    // Dasselbe andersrum: fast-schwarz auf der dunklen Welt.
    const [nacht] = derivePalettes('kraftvoll', '#0E1013'); // nacht.paper === '#0E1013'
    expect(nacht.id).toBe('nacht');
    expect(nacht.accent.toLowerCase()).toBe('#d9ff3d');
  });

  it('nimmt eine kontraststarke Wunschfarbe weiterhin an', () => {
    const [creme] = derivePalettes('ruhig', '#2F6F5E'); // 5.20:1 auf Creme
    expect(creme.accent.toLowerCase()).toBe('#2f6f5e');
  });

  it('entscheidet pro Welt — dieselbe Farbe kann hier tragen und dort nicht', () => {
    // Limette: 16.6:1 auf Nacht, aber 1.01:1 auf Creme. Kein Bug, sondern der Punkt:
    // die beiden Welten haben verschiedene Gruende.
    const [nacht, creme] = derivePalettes('kraftvoll', '#D9FF3D');
    expect(nacht.accent.toLowerCase()).toBe('#d9ff3d'); // getragen
    expect(creme.accent.toLowerCase()).toBe('#c2410c'); // zurueckgefallen
  });

  it('haelt jeden Eigen-Akzent ueber der Schwelle — der Fallback selbst muss lesbar sein', () => {
    // Faellt eine Wunschfarbe zurueck, landet sie hier. Waere DIESER Wert zu schwach,
    // waere der Schutz eine Attrappe.
    for (const s of ALLE_STIMMUNGEN) {
      for (const p of derivePalettes(s, '')) {
        const r = contrastRatio(p.accent, p.paper);
        expect(r, `${p.id}: ${p.accent} auf ${p.paper} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST);
      }
    }
  });

  it('rechnet den Kontrast nach WCAG — bekannte Eckwerte', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1); // symmetrisch
  });
});
