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
  pruefePosts(c.posts);
}

// posts = GENAU 3 Karussell-Posts, je 3 Slides (hook→value→cta) + Caption.
function pruefePosts(posts) {
  expect(Array.isArray(posts)).toBe(true);
  expect(posts).toHaveLength(3);
  for (const post of posts) {
    expect(typeof post.caption).toBe('string');
    expect(post.caption.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(post.slides)).toBe(true);
    expect(post.slides).toHaveLength(3);
    for (const s of post.slides) {
      for (const k of ['head', 'headAccent', 'sub']) {
        expect(typeof s[k], k).toBe('string');
        expect(s[k].trim().length, k).toBeGreaterThan(0);
      }
    }
  }
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

  // Ein vollstaendiger, valider Post fuer die Claude-Pfad-Tests.
  const postFixture = (marke) => ({
    slides: [
      { kind: 'hook', eyebrow: 'e', head: `${marke}-hook`, headAccent: 'a', sub: 's' },
      { kind: 'value', eyebrow: 'e', head: `${marke}-value`, headAccent: 'a', sub: 's' },
      { kind: 'cta', eyebrow: 'e', head: `${marke}-cta`, headAccent: 'a', sub: 's' },
    ],
    caption: `${marke}-caption mit Hashtags #test`,
  });
  // Profil-Kern OHNE posts (die kommen jetzt aus eigenen Calls).
  const kernOk = {
    eyebrow: 'In 90 Tagen', head: 'Sichtbar werden,', headAccent: 'ohne dich zu verbiegen.',
    sub: 'Die drei Fehler.', bio: 'Aus Erfahrung wird Wirkung.',
    cells: ['1','2','3','4','5','6','7','8','9'],
  };

  // Router-Mock: generateCopy feuert 4 PARALLELE Calls (1 deliver_profile +
  // 3 deliver_post). Der Mock liefert je nach angefordertem Tool die passende
  // tool_use-Antwort; die Post-Calls bekommen posts[] der Reihe nach.
  function claudeMock(profil, posts = []) {
    let i = 0;
    return vi.fn(async (_url, opts) => {
      const name = JSON.parse(opts.body).tool_choice.name;
      const input = name === 'deliver_profile' ? profil : (posts[i++] ?? postFixture('x'));
      return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name, input }] }) };
    });
  }

  it('nutzt Claudes Text, wenn die Antwort brauchbar ist', async () => {
    vi.stubGlobal('fetch', claudeMock(kernOk, [postFixture('p1'), postFixture('p2'), postFixture('p3')]));
    const c = await generateCopy(envOk, clean);
    expect(c.eyebrow).toBe('In 90 Tagen');
    pruefeCopyForm(c);
  });

  it('nutzt Claudes eigene posts, wenn sie die Form haben', async () => {
    vi.stubGlobal('fetch', claudeMock(kernOk, [postFixture('a'), postFixture('b'), postFixture('c')]));
    const c = await generateCopy(envOk, clean);
    expect(c.posts).toHaveLength(3);
    expect(c.posts[0].slides[0].head).toBe('a-hook');   // NICHT der Fallback
    expect(c.posts[2].caption).toContain('c-caption');
  });

  it('backfillt NUR den patzenden Post — Kern-Copy + gute Posts bleiben', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Kern gut; Post 1 kaputt (leere Slides / keine Caption), Post 2/3 gut.
    vi.stubGlobal('fetch', claudeMock(kernOk, [{ slides: [], caption: '' }, postFixture('b'), postFixture('c')]));
    const c = await generateCopy(envOk, clean);
    expect(c.eyebrow).toBe('In 90 Tagen');   // Kern-Copy NICHT weggeworfen
    pruefePosts(c.posts);                      // alle 3 valide (Post 1 aus Fallback)
    expect(c.posts[1].slides[0].head).toBe('b-hook');   // guter Post behalten
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

  it('faellt zurueck, wenn kein tool_use kommt (Claude ignoriert das Schema)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'nur Text, kein tool_use' }] }),
    })));
    pruefeCopyForm(await generateCopy(envOk, clean));
  });

  it('faellt zurueck, wenn das Profil die falsche Form liefert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // 4 statt 9 Zellen — wuerde das Grid zerreissen
    vi.stubGlobal('fetch', claudeMock({ eyebrow: 'x', head: 'y', headAccent: 'z', sub: 'a', bio: 'b', cells: ['1','2','3','4'] },
      [postFixture('a'), postFixture('b'), postFixture('c')]));
    const c = await generateCopy(envOk, clean);
    expect(c.cells).toHaveLength(9);
  });

  it('faellt zurueck, wenn die 9 Zellen leer sind — sonst rendert ein blankes Grid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', claudeMock({ eyebrow: 'x', head: 'y', headAccent: 'z', sub: 'a', bio: 'b', cells: ['','','','','','','','',''] },
      [postFixture('a'), postFixture('b'), postFixture('c')]));
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

  // Ein einzelner Claude-Blip (Netz weg, 529 overloaded) hat die Kundin bisher ihren
  // ganzen personalisierten Text gekostet: callClaude gab null zurueck, das Profil galt
  // als ausgefallen, sie bekam generische Fallback-Copy — bei ihrem einen Versuch, still.
  // renderAll ist ueber mitRetry() abgesichert, der Copy-Call war es nicht.
  it('wiederholt einen transienten Netzfehler — die Kundin bekommt echte Copy statt Fallback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const gut = claudeMock(kernOk, [postFixture('a'), postFixture('b'), postFixture('c')]);
    let erster = true;
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      if (erster) { erster = false; throw new Error('netz weg'); }
      return gut(url, opts);
    }));
    const c = await generateCopy(envOk, clean);
    expect(c.eyebrow).toBe('In 90 Tagen');   // Claudes Text, nicht der Fallback
    pruefeCopyForm(c);
  });

  it('wiederholt ein 529 (overloaded) — Claudes Auslastung darf ihren Text nicht kosten', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const gut = claudeMock(kernOk, [postFixture('a'), postFixture('b'), postFixture('c')]);
    let erster = true;
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      if (erster) { erster = false; return { ok: false, status: 529, text: async () => 'overloaded' }; }
      return gut(url, opts);
    }));
    const c = await generateCopy(envOk, clean);
    expect(c.eyebrow).toBe('In 90 Tagen');
    pruefeCopyForm(c);
  });

  // Ein 400 ist unser Fehler (kaputter Request), kein Blip — nochmal schicken bringt
  // dasselbe 400 und verbrennt nur Zeit, waehrend sie auf dem Build-Screen wartet.
  it('wiederholt NICHT bei 400 — bleibt bei genau 4 Calls', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn(async () => ({ ok: false, status: 400, text: async () => 'bad request' }));
    vi.stubGlobal('fetch', f);
    pruefeCopyForm(await generateCopy(envOk, clean));   // Fallback, aber vollstaendig
    expect(f.mock.calls.length).toBe(4);
  });

  it('feuert 4 parallele Calls, alle mit HWG-System + cache_control', async () => {
    const f = claudeMock(kernOk, [postFixture('a'), postFixture('b'), postFixture('c')]);
    vi.stubGlobal('fetch', f);
    await generateCopy(envOk, clean);
    expect(f.mock.calls.length).toBe(4);   // 1 Profil + 3 Posts, parallel
    // Jeder Call traegt System (HWG) + Caching auf System UND Tool.
    for (const call of f.mock.calls) {
      const body = JSON.parse(call[1].body);
      const systemText = Array.isArray(body.system) ? body.system.map((b) => b.text).join('') : body.system;
      expect(systemText).toMatch(/HWG/);
      expect(systemText).toMatch(/Heil/);
      expect(body.system[0].cache_control?.type).toBe('ephemeral');
      expect(body.tools[0].cache_control?.type).toBe('ephemeral');
      expect(body.model).toBe('claude-test');
    }
    // Genau ein Profil-Call, genau drei Post-Calls.
    const namen = f.mock.calls.map((c) => JSON.parse(c[1].body).tool_choice.name).sort();
    expect(namen).toEqual(['deliver_post', 'deliver_post', 'deliver_post', 'deliver_profile']);
  });

  // Der Backfill rettet die Seite, versteckt aber, DASS etwas fehlte. Genau so bekam
  // am 27.07. die erste echte Interessentin 2 von 3 Posts als Platzhalter, ohne dass
  // jemand alarmiert wurde. Ohne diese Markierung kann generate.js es nicht wissen.
  it('markiert, welche Posts aus dem Fallback stammen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Post 1 und 3 kaputt, Post 2 gut — exakt der reale Fall.
    vi.stubGlobal('fetch', claudeMock(kernOk, [
      { slides: [], caption: '' }, postFixture('b'), { slides: [], caption: '' },
    ]));
    const c = await generateCopy(envOk, clean);
    expect(c._backfilled).toEqual([1, 3]);
    pruefePosts(c.posts);   // trotzdem 3 vollstaendige Posts — die Seite bleibt heil
  });

  it('markiert nichts, wenn alle Posts echt sind', async () => {
    vi.stubGlobal('fetch', claudeMock(kernOk, [postFixture('a'), postFixture('b'), postFixture('c')]));
    const c = await generateCopy(envOk, clean);
    expect(c._backfilled ?? []).toEqual([]);
  });

  // Auf Sonnet 5 ist adaptives Denken AN, sobald `thinking` fehlt (auf 4.6 war es aus).
  // max_tokens deckelt Denken UND Antwort zusammen — ohne dieses Feld risse der
  // Tool-Call also mitten im Post ab, und zwar STILL: der Fallback faengt es auf und
  // die Kundin bekommt generische Texte. Deshalb explizit abschalten, nicht implizit.
  it('schaltet das Denken bei jedem Call explizit ab (sonst frisst es das Token-Budget)', async () => {
    const f = claudeMock(kernOk, [postFixture('a'), postFixture('b'), postFixture('c')]);
    vi.stubGlobal('fetch', f);
    await generateCopy(envOk, clean);
    expect(f.mock.calls.length).toBe(4);
    for (const call of f.mock.calls) {
      const body = JSON.parse(call[1].body);
      expect(body.thinking).toEqual({ type: 'disabled' });
    }
  });
});
