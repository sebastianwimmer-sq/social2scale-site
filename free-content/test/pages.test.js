import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';
import { nextAction } from '../src/pages/result.js';
import { BUILDING_TIMEOUT_MINUTES } from '../src/constants.js';

describe('Formular-Seite', () => {
  it('GET / liefert HTML mit Formular, gehosteten Assets und Turnstile', async () => {
    const req = new Request('https://start.social2scale.com/');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('/api/free-content');                 // postet richtig
    expect(html).toContain('social2scale.com/fonts/hanken');     // gehostete Schrift
    expect(html).toContain('0x4AAAAAAD5FwCxWtZhzGlpX');           // Turnstile-Sitekey
    expect(html).not.toContain('base64');                        // KEINE eingebetteten Assets
    // Erwartungssteuerung MUSS da sein (dass es ein Entwurf ist) — der Wortlaut darf
    // sich aendern, die Aussage nicht.
    expect(html).toContain('Schnellentwurf');
  });

  it('enthaelt die zwei optionalen Personalisierungs-Steps (Foto + Markenfarbe)', async () => {
    const req = new Request('https://start.social2scale.com/');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    const html = await res.text();
    // Foto-Step
    expect(html).toContain('id="f-foto"');
    expect(html).toContain('Profilbild');
    // Markenfarbe-Step: Chips aus FARB_CHIPS + Eigene
    expect(html).toContain('id="farbe"');
    expect(html).toContain('data-hex="#c2410c"');
    expect(html).toContain('Terracotta');
    expect(html).toContain('id="farb-eigene"');
    // Renumbering: Mail-Step ist auf 9 gerueckt, Done auf 10, Zaehler auf 9
    expect(html).toContain('data-step="9"');
    expect(html).toContain('data-step="10"');
    expect(html).toContain('1/9');
    expect(html).toContain('const TOTAL=9');
  });
});

// Bis zum 28.07. lieferte der Funnel GAR KEINE Sicherheits-Header — auf Seiten,
// die von der Besucherin stammende Texte rendern und seit dem 27.07. oeffentlich
// von der Startseite verlinkt sind.
describe('Sicherheits-Header', () => {
  it('liegen auf den HTML-Seiten an', async () => {
    for (const pfad of ['/', '/r/deadbeefdead']) {
      const res = await worker.fetch(
        new Request('https://start.social2scale.com' + pfad),
        env,
        createExecutionContext()
      );
      expect(res.headers.get('X-Content-Type-Options'), pfad).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options'), pfad).toBe('DENY');
      expect(res.headers.get('Referrer-Policy'), pfad).toBe('strict-origin-when-cross-origin');
    }
  });
});

describe('Build-Screen /r/:token', () => {
  it('GET /r/:token liefert Build-Screen-HTML, das /api/status pollt', async () => {
    const req = new Request('https://start.social2scale.com/r/deadbeefdead');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('/api/status/deadbeefdead');   // pollt den richtigen Token
    expect(html).toContain('/img/deadbeefdead/');         // Bild-Pfad-Präfix
    expect(html).not.toContain('Wird gebaut (Plan 2)');   // Platzhalter ersetzt
    expect(html).not.toContain('base64');
  });

  it('das ausgelieferte /r/-Inline-Script ist syntaktisch gueltiges JS', async () => {
    // Regressionsschutz: bootstrap + PAGE_SCRIPT + REVEAL_SCRIPT werden als EIN
    // <script> ausgeliefert. Ein Syntaxfehler dort (z. B. ein echter Zeilenumbruch
    // in einem einfach gequoteten String, weil im Template-Literal \n statt \\n stand)
    // bricht die GESAMTE Reveal-/Build-Logik im Browser — und rutscht an reinen
    // Markup-Assertions vorbei. new Function() parst den Body (fuehrt ihn nicht aus)
    // und wirft genau bei so einem Fehler.
    const html = await (
      await worker.fetch(
        new Request('https://start.social2scale.com/r/deadbeefdead'),
        env,
        createExecutionContext()
      )
    ).text();
    const m = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    expect(() => new Function(m[1])).not.toThrow();
  });

  it('Reveal-Markup ist in /r/:token vorhanden (versteckt bis ready) mit beiden CTAs', async () => {
    const html = await (
      await worker.fetch(
        new Request('https://start.social2scale.com/r/deadbeefdead'),
        env,
        createExecutionContext()
      )
    ).text();
    expect(html).toContain('https://social2scale.com/anfrage/'); // primärer CTA-Ziel
    expect(html).toContain('Vorschau speichern'); // sekundärer CTA
    expect(html).toContain('Schnellentwurf'); // Erwartungssteuerung auch im Reveal
    expect(html).toMatch(/f-1-|Welt|Farbwelt/); // Farbwelt-Switcher-Anker
    expect(html).toMatch(/<section id="reveal" hidden>/); // versteckt bis showReveal()
  });

  it('Reveal zeigt 3 vertikal gestapelte Post-Karussells mit je 3 Slides, Dots und Caption+Kopieren', async () => {
    const html = await (
      await worker.fetch(
        new Request('https://start.social2scale.com/r/deadbeefdead'),
        env,
        createExecutionContext()
      )
    ).text();

    // 3 Post-Bloecke (vertikal gestapelt im rv-posts-stack)
    expect(html).toContain('class="rv-posts-stack"');
    expect(html).toContain('data-post="1"');
    expect(html).toContain('data-post="2"');
    expect(html).toContain('data-post="3"');

    // Jeder Post = horizontales Slide-Karussell mit 3 Slides (data-post/data-slide-Vertrag).
    expect(html).toContain('class="rv-track"');
    for (const p of [1, 2, 3]) {
      for (const s of [1, 2, 3]) {
        expect(html).toContain(`data-post="${p}" data-slide="${s}"`);
      }
    }

    // Dots-Indikator (● ○ ○) je Karussell — erste Slide aktiv.
    expect(html).toContain('class="rv-dots"');
    expect(html).toContain('class="rv-dot act"');

    // Caption + Kopieren pro Post: eine Caption pro Post-Index 0..2.
    expect(html).toContain('data-cap="0"');
    expect(html).toContain('data-cap="1"');
    expect(html).toContain('data-cap="2"');
    expect(html.match(/class="rv-cap-copy" data-cap="\d"/g)?.length).toBe(3);

    // Kein Rest der alten flachen Struktur mehr (data-slot / rv-post-shot).
    expect(html).not.toContain('data-slot=');
    expect(html).not.toContain('rv-post-shot');
  });

  it('Build-Screen zieht die 3 echten Kacheln aus der ersten Slide jedes Posts und pollt gegen total:21', async () => {
    const html = await (
      await worker.fetch(
        new Request('https://start.social2scale.com/r/deadbeefdead'),
        env,
        createExecutionContext()
      )
    ).text();
    // Erste Slide (Hook) jedes Posts als echte Build-Kachel.
    expect(html).toContain('data-frame="f-0-p1-s1"');
    expect(html).toContain('data-frame="f-0-p2-s1"');
    expect(html).toContain('data-frame="f-0-p3-s1"');
    // Gesamtzahl = FRAME_IDS.length (21 = 20 Feed-Frames + 1 Share-Card), nicht mehr hart 8.
    expect(html).toContain('0 / 21');
    expect(html).toContain('TOTAL_DEFAULT=21');
  });
});

// Plan 3 Task 5: buildStatus() (generate.js) liefert state:'failed' fuer JEDEN
// Fehlerfall — Moderationsablehnung und Render-Fehler kollabieren beide auf
// denselben DB-Status. Der Unterschied kommt ueber `grund` (fail_reason,
// migrate-v14.sql) mit. nextAction() ist die reine Entscheidung, die daraus
// macht, was der Build-Screen als naechstes tut — insb.: eine Ablehnung
// bekommt KEINEN Retry (dasselbe Thema = derselbe Reject = eine Schleife).
describe('nextAction (Poller-Entscheidung, keine Sackgassen)', () => {
  it('ready -> Reveal', () => {
    expect(nextAction({ state: 'ready', images: [] })).toEqual({ kind: 'reveal' });
  });

  it('failed + grund:moderation -> Fehler OHNE Retry (dasselbe Thema wuerde wieder abgelehnt)', () => {
    expect(nextAction({ state: 'failed', grund: 'moderation' })).toEqual({
      kind: 'error', reason: 'moderation', retry: false,
    });
  });

  it('failed + grund:render (oder leer) -> Fehler MIT Retry', () => {
    expect(nextAction({ state: 'failed', grund: 'render' })).toEqual({
      kind: 'error', reason: 'render', retry: true,
    });
    expect(nextAction({ state: 'failed', grund: '' })).toEqual({
      kind: 'error', reason: 'render', retry: true,
    });
    expect(nextAction({ state: 'failed' })).toEqual({
      kind: 'error', reason: 'render', retry: true,
    });
  });

  it('not_found -> Fehler zurueck zum Formular, kein Retry', () => {
    expect(nextAction({ state: 'not_found' })).toEqual({
      kind: 'error', reason: 'not_found', retry: false,
    });
  });

  it('building/pending/confirmed -> weiter pollen', () => {
    expect(nextAction({ state: 'building', done: 3 })).toEqual({ kind: 'poll' });
    expect(nextAction({ state: 'pending' })).toEqual({ kind: 'poll' });
    expect(nextAction({ state: 'confirmed' })).toEqual({ kind: 'poll' });
  });

  it('Building-Timeout: laenger als BUILDING_TIMEOUT_MINUTES ohne Endzustand -> Fehler ohne Retry, kein Endlos-Spinner', () => {
    const knappDrunter = BUILDING_TIMEOUT_MINUTES * 60 * 1000 - 1;
    const drueber = BUILDING_TIMEOUT_MINUTES * 60 * 1000 + 1;
    expect(nextAction({ state: 'building' }, knappDrunter)).toEqual({ kind: 'poll' });
    expect(nextAction({ state: 'building' }, drueber)).toEqual({
      kind: 'error', reason: 'timeout', retry: false,
    });
  });
});

describe('Reveal-Ausbau 10.08. (Experten-Zeilen + Floating-CTA)', () => {
  async function revealHtml() {
    const req = new Request('https://start.social2scale.com/r/' + 'a'.repeat(64));
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    return res.text();
  }

  it('traegt zu jedem der 3 Posts eine Warum-Begruendung', async () => {
    const html = await revealHtml();
    expect(html.split('class="rv-why rv"').length - 1).toBe(3);
    expect(html).toContain('Der Aufmacher.');
    expect(html).toContain('Die Substanz.');
    expect(html).toContain('Die Nähe.');
  });

  it('hat den Floating-CTA (versteckt, mit Schliessen-Knopf)', async () => {
    const html = await revealHtml();
    expect(html).toContain('id="rv-float"');
    expect(html).toContain('Lass uns starten');
    expect(html).toContain('id="rv-float-x"');
  });
});
