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
    expect(html).toContain('Beispiel-Vorschau');                 // Vorschau-Hinweis
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
    expect(html).toContain('Beispiel-Vorschau'); // Vorschau-Hinweis auch im Reveal
    expect(html).toMatch(/f-1-|Welt|Farbwelt/); // Farbwelt-Switcher-Anker
    expect(html).toMatch(/<section id="reveal" hidden>/); // versteckt bis showReveal()
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
