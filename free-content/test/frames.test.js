import { describe, it, expect } from 'vitest';
import { buildPage, FRAME_IDS } from '../src/templates/frames.js';
import { derivePalettes } from '../src/palette.js';
import { buildFallback } from '../src/copy.js';

const clean = {
  name: 'Dorothea Beekman', handle: 'praxisfunke',
  branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen', stimmung: 'ruhig',
};
const palettes = derivePalettes('ruhig', '');
const copy = buildFallback(clean);
const html = buildPage(clean, copy, palettes);

describe('FRAME_IDS', () => {
  it('benennt genau 8 Frames — 4 je Farbwelt', () => {
    expect(FRAME_IDS).toHaveLength(8);
    expect(new Set(FRAME_IDS).size).toBe(8);   // keine Dubletten
  });
});

describe('buildPage', () => {
  it('liefert jeden Frame genau einmal', () => {
    for (const id of FRAME_IDS) {
      const treffer = html.split(`id="${id}"`).length - 1;
      expect(treffer, id).toBe(1);
    }
  });

  it('setzt ihren Handle und ihre Bio ein — der "das bin ja ich"-Moment', () => {
    expect(html).toContain('praxisfunke');
    expect(html).toContain('Dorothea Beekman');
  });

  it('traegt die Sperre in JEDEM Frame — das Wasserzeichen ist nicht optional', () => {
    expect(html.split('class="lock').length - 1).toBe(8);
    expect(html.split('social2scale').length - 1).toBeGreaterThanOrEqual(8);
  });

  it('nutzt das dezente Wasserzeichen, nicht das verworfene laute', () => {
    expect(html).toContain('wm-soft');
    expect(html).not.toContain('wm-loud');
  });

  it('setzt beide Paletten als Tokens', () => {
    for (const p of palettes) {
      expect(html).toContain(p.paper);
      expect(html).toContain(p.accent);
    }
  });

  it('escaped ihre Eingaben — sie kommen aus einem oeffentlichen Formular', () => {
    const boese = { ...clean, name: '<script>alert(1)</script>', handle: 'x' };
    const h = buildPage(boese, copy, palettes);
    expect(h).not.toContain('<script>alert(1)</script>');
    expect(h).toContain('&lt;script&gt;');
  });

  it('escaped auch die generierten Texte', () => {
    // Der Payload muss als UNAUSFUEHRBARER Text landen: '<' und '>' escaped,
    // sodass kein <img>-Tag im Markup entsteht. Der Rest des Textes ('onerror=…')
    // bleibt danach zwangslaeufig als inerte Zeichenkette stehen — jede Standard-
    // HTML-Escaping (auch das etablierte esc() aus src/mail.js) tut genau das.
    // Pruefung folgt dem Muster aus dem Handle/Bio-Test oben und aus
    // test/mail.test.js ('escaped HTML im Namen (XSS)'): das volle Tag mit
    // spitzen Klammern darf nicht mehr vorkommen, die escapte Form schon.
    const boeseCopy = { ...copy, head: '<img src=x onerror=alert(1)>' };
    const h = buildPage(clean, boeseCopy, palettes);
    expect(h).not.toContain('<img src=x onerror=alert(1)>');
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('laedt die Schriften, auf denen der Look steht', () => {
    expect(html).toContain('Space+Grotesk');
    expect(html).toContain('Plus+Jakarta+Sans');
  });

  it('haelt das IG-Format fest', () => {
    expect(html).toContain('1080px');
    expect(html).toContain('1350px');
  });
});
