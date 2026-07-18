import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildFallback, generateCopy } from '../src/copy.js';

const clean = {
  name: 'Dorothea Beekman', handle: 'praxisfunke',
  branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen über Instagram', stimmung: 'ruhig',
};

function pruefeCopyForm(c) {
  for (const k of ['eyebrow', 'head', 'headAccent', 'sub', 'bio']) {
    expect(typeof c[k], k).toBe('string');
    expect(c[k].length, k).toBeGreaterThan(0);
  }
  expect(Array.isArray(c.cells)).toBe(true);
  expect(c.cells).toHaveLength(9);   // das 3x3-Grid — nie mehr, nie weniger
  for (const z of c.cells) expect(typeof z).toBe('string');
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('buildFallback', () => {
  it('baut vollstaendige Texte ohne Netz', () => {
    pruefeCopyForm(buildFallback(clean));
  });

  it('kippt nicht bei duennen Angaben', () => {
    pruefeCopyForm(buildFallback({ branche: '', ziel: '', stimmung: '', handle: 'x', name: '' }));
    pruefeCopyForm(buildFallback({}));
  });

  // §5a: Claudes HWG-Absicherung (der Compliance-System-Prompt) laeuft NUR im
  // Claude-Pfad. Faellt Claude aus, greift nur noch Schicht 1 (moderate.js) —
  // eine grobe Wortliste, die einen milden Gesundheitsclaim ohne Trigger-Wort
  // NICHT faengt. Renderte der Fallback branche/ziel verbatim, laeuft ihr
  // roher Claim ungefiltert unter unser Logo. Deshalb: branche/ziel duerfen
  // NIE in der gerenderten Fallback-Copy auftauchen.
  it('rendert einen claim-verdaechtigen "branche"-Text NICHT verbatim (§5a HWG)', () => {
    const claimHaft = {
      ...clean,
      branche: 'Ernährung, die deinen Reizdarm beruhigt',
      ziel: 'Menschen von ihren Schmerzen befreien',
    };
    const c = buildFallback(claimHaft);
    const alles = JSON.stringify(c);
    expect(alles).not.toContain('Reizdarm beruhigt');
    expect(alles).not.toContain('Schmerzen befreien');
  });

  it('rendert branche/ziel generell nie verbatim, auch harmlose', () => {
    const c = buildFallback(clean);
    const alles = JSON.stringify(c);
    expect(alles).not.toContain('Coaching für Coaches');
    expect(alles).not.toContain('Mehr Anfragen über Instagram');
  });

  it('personalisiert weiterhin ueber Name/Handle — nur die claim-traechtigen Felder sind tabu', () => {
    const c = buildFallback(clean);
    const alles = JSON.stringify(c).toLowerCase();
    // Name/Handle sind KEINE Claims — sie duerfen (muessen aber nicht) auftauchen.
    // Wir pruefen hier nur, dass die Copy nicht komplett generisch-anonym ist:
    // mindestens ein personalisiertes Feld enthaelt Name ODER Handle.
    const personalisiert = alles.includes(clean.name.toLowerCase()) || alles.includes(clean.handle.toLowerCase());
    expect(personalisiert).toBe(true);
  });

  it('bleibt komplett/valide, wenn Name und Handle leer sind', () => {
    pruefeCopyForm(buildFallback({ ...clean, name: '', handle: '' }));
  });
});

describe('generateCopy', () => {
  const envOk = { ANTHROPIC_API_KEY: 'k', AI_MODEL: 'claude-test' };

  const antwort = (obj) => ({
    ok: true, status: 200,
    json: async () => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] }),
  });

  it('nutzt Claudes Text, wenn die Antwort brauchbar ist', async () => {
    const echt = {
      eyebrow: 'In 90 Tagen', head: 'Sichtbar werden,', headAccent: 'ohne dich zu verbiegen.',
      sub: 'Die drei Fehler.', bio: 'Aus Erfahrung wird Wirkung.',
      cells: ['1','2','3','4','5','6','7','8','9'],
    };
    vi.stubGlobal('fetch', vi.fn(async () => antwort(echt)));
    const c = await generateCopy(envOk, clean);
    expect(c.eyebrow).toBe('In 90 Tagen');
    pruefeCopyForm(c);
  });

  it('faellt zurueck, wenn Claude nicht erreichbar ist — nie eine kaputte Seite', async () => {
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('netz weg'); }));
    pruefeCopyForm(await generateCopy(envOk, clean));
    expect(fehler).toHaveBeenCalled();   // nie still
  });

  it('faellt zurueck bei nicht-200', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 529, text: async () => 'overloaded' })));
    pruefeCopyForm(await generateCopy(envOk, clean));
  });

  it('faellt zurueck bei kaputtem JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'kein json {{' }] }),
    })));
    pruefeCopyForm(await generateCopy(envOk, clean));
  });

  it('faellt zurueck, wenn Claude die falsche Form liefert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // 4 statt 9 Zellen — wuerde das Grid zerreissen
    vi.stubGlobal('fetch', vi.fn(async () => antwort({ eyebrow: 'x', head: 'y', headAccent: 'z', sub: 'a', bio: 'b', cells: ['1','2','3','4'] })));
    const c = await generateCopy(envOk, clean);
    expect(c.cells).toHaveLength(9);
  });

  it('faellt zurueck, wenn die 9 Zellen leer sind — sonst rendert ein blankes Grid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () =>
      antwort({ eyebrow: 'x', head: 'y', headAccent: 'z', sub: 'a', bio: 'b', cells: ['','','','','','','','',''] })));
    const c = await generateCopy(envOk, clean);
    // Fallback greift -> die Zellen tragen wieder echten Text.
    expect(c.cells.every((z) => z.trim().length > 0)).toBe(true);
  });

  it('faellt ohne API-Key zurueck, ohne zu werfen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    pruefeCopyForm(await generateCopy({}, clean));
    expect(f).not.toHaveBeenCalled();   // kein sinnloser Call
  });

  it('schickt die HWG-Regeln mit — sie sind der Grund fuer den Prompt', async () => {
    const f = vi.fn(async () => antwort({ eyebrow: 'a', head: 'b', headAccent: 'c', sub: 'd', bio: 'e', cells: Array(9).fill('x') }));
    vi.stubGlobal('fetch', f);
    await generateCopy(envOk, clean);
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.system).toMatch(/HWG/);
    expect(body.system).toMatch(/Heil/);
    expect(body.model).toBe('claude-test');   // aus env, nicht hartkodiert
  });
});
