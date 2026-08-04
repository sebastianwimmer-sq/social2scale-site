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
  it('benennt genau 21 Frames — je Farbwelt 1 Profil + 3 Posts × 3 Slides, plus 1 Share-Card', () => {
    expect(FRAME_IDS).toHaveLength(21);
    expect(new Set(FRAME_IDS).size).toBe(21);   // keine Dubletten
  });

  it('haelt die exakte Render-Reihenfolge (Profil, dann p1/p2/p3 je s1..s3), Share-Card zuletzt', () => {
    expect(FRAME_IDS).toEqual([
      'f-0-profil',
      'f-0-p1-s1', 'f-0-p1-s2', 'f-0-p1-s3',
      'f-0-p2-s1', 'f-0-p2-s2', 'f-0-p2-s3',
      'f-0-p3-s1', 'f-0-p3-s2', 'f-0-p3-s3',
      'f-1-profil',
      'f-1-p1-s1', 'f-1-p1-s2', 'f-1-p1-s3',
      'f-1-p2-s1', 'f-1-p2-s2', 'f-1-p2-s3',
      'f-1-p3-s1', 'f-1-p3-s2', 'f-1-p3-s3',
      'f-share',
    ]);
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

  it('traegt die Sperre in JEDEM Content-Frame — das Wasserzeichen ist nicht optional (Share-Card ist separat s2s-gebrandet)', () => {
    expect(html.split('class="lock').length - 1).toBe(20);
    expect(html.split('social2scale').length - 1).toBeGreaterThanOrEqual(20);
  });

  it('rendert alle drei Slide-Layouts (hook/value/cta)', () => {
    // Auf die Frame-Markup-Klasse zaehlen, nicht auf den blossen String: das
    // inline-CSS erwaehnt z. B. `.slide-cta` ebenfalls und wuerde mitgezaehlt.
    // Je Farbwelt 3 Posts -> pro Layout genau 6 Slides (2 Welten × 3 Posts).
    expect(html.split('class="slide slide-hook"').length - 1).toBe(6);
    expect(html.split('class="slide slide-value"').length - 1).toBe(6);
    expect(html.split('class="slide slide-cta"').length - 1).toBe(6);
  });

  it('setzt den Slide-Zaehler „0n / 03" innerhalb jedes Posts', () => {
    expect(html).toContain('/ 03');
    expect(html).toContain('<b>01</b>');
    expect(html).toContain('<b>03</b>');
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
    // Die sichtbaren Slide-Texte kommen jetzt aus copy.posts[].slides[] — der
    // Payload gehoert also in eine Slide-Headline, nicht mehr ins Top-Level head.
    const boesePosts = copy.posts.map((post, i) =>
      i === 0
        ? { ...post, slides: post.slides.map((s, j) => (j === 0 ? { ...s, head: '<img src=x onerror=alert(1)>' } : s)) }
        : post
    );
    const h = buildPage(clean, { ...copy, posts: boesePosts }, palettes);
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

describe('Avatar im Profil-Frame', () => {
  it('rendert das echte Profilbild mit Story-Ring, wenn avatarUrl da ist', () => {
    const mitFoto = buildPage({ ...clean, avatarUrl: 'data:image/jpeg;base64,QUJD' }, copy, palettes, 'https://x.de');
    expect(mitFoto).toContain('class="pfp-img"');
    expect(mitFoto).toContain('data:image/jpeg;base64,QUJD');
    expect(mitFoto).toContain('pfp-ring');
  });

  it('faellt ohne avatarUrl auf das Initial zurueck — kein img, kein leerer src', () => {
    // Auf die Markup-Klasse pruefen, nicht den blossen String: das Inline-CSS
    // enthaelt .pfp-img als Selektor immer (siehe Slide-Layout-Test oben).
    expect(html).not.toContain('class="pfp-img"');
    expect(html).toContain('class="avatar"');
    expect(html).toContain('>D</div>'); // Initial von "Dorothea"
  });

  it('Share-Card zeigt das Foto klein neben dem Handle', () => {
    const mitFoto = buildPage({ ...clean, avatarUrl: 'data:image/jpeg;base64,QUJD' }, copy, palettes, 'https://x.de');
    expect(mitFoto).toContain('class="share-pfp"');
    // Ohne Foto: kein leeres <img> auf der Share-Card
    expect(html).not.toContain('class="share-pfp"');
  });
});
