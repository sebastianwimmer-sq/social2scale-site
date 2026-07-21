import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

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
