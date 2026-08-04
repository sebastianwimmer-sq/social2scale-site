/**
 * Baut EINE HTML-Seite mit allen 20 Frames. Rein: keine Bindings, kein I/O.
 *
 * Alle auf einer Seite, weil render.js sie in EINEM Browser-Durchlauf
 * abschiesst (Muster make-pdfs.cjs: element.screenshot pro Frame). Zwanzig
 * Browser-Starts waeren zwanzig Mal Kaltstart.
 */

import { LOOK_CSS } from './css.js';
import qrcode from 'qrcode-generator';

/** QR als eigenes SVG (volle Stil-Kontrolle: dunkle Module auf transparent, wird
 *  im Frame auf eine weisse Kachel gesetzt -> maximal scanbar). */
function qrSvg(url, px = 230) {
  const qr = qrcode(0, 'M'); // Typ automatisch, mittlere Fehlerkorrektur
  qr.addData(String(url || 'https://social2scale.com'));
  qr.make();
  const n = qr.getModuleCount();
  const cell = px / n;
  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 ${px} ${px}" width="${px}" height="${px}" fill="#0A0E14" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

const FONTS =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700' +
  '&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';

const WELTEN = [0, 1];
const POSTS = [1, 2, 3];
const SLIDES = [1, 2, 3];

/**
 * Reihenfolge = Render-Reihenfolge. render.js iteriert hierueber.
 * Pro Farbwelt w zuerst das Profil, dann Post p (1..3) mit je Slide s (1..3):
 * f-0-profil, f-0-p1-s1, f-0-p1-s2, f-0-p1-s3, f-0-p2-s1 … f-1-p3-s3 → GENAU 20.
 */
export const FRAME_IDS = [
  ...WELTEN.flatMap((w) => [
    `f-${w}-profil`,
    ...POSTS.flatMap((p) => SLIDES.map((s) => `f-${w}-p${p}-s${s}`)),
  ]),
  'f-share', // gebrandete Share-Card (farbwelt-unabhaengig, s2s-Gradient + Logo + QR)
];

/** Ihre Eingaben kommen aus einem OEFFENTLICHEN Formular. Nichts landet roh im HTML. */
function esc(v) {
  return String(v ?? '').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Story-Highlight-Icons — EINE kohaerente Linien-Ikonografie (accent = currentColor)
 *  statt zusammengewuerfelter Unicode-Zeichen. Fill none, stroke via .hl-c color. */
const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"';
const HL_ICONS = {
  person: `<svg ${SVG}><circle cx="12" cy="8.5" r="3.2"/><path d="M5.8 19.2c.5-3.3 3-5.1 6.2-5.1s5.7 1.8 6.2 5.1"/></svg>`,
  spark: `<svg ${SVG}><path d="M12 3.5l1.6 5a2 2 0 0 0 1.4 1.4l5 1.6-5 1.6a2 2 0 0 0-1.4 1.4l-1.6 5-1.6-5a2 2 0 0 0-1.4-1.4l-5-1.6 5-1.6a2 2 0 0 0 1.4-1.4z"/></svg>`,
  heart: `<svg ${SVG}><path d="M12 20s-6.6-4.2-6.6-9.1A3.6 3.6 0 0 1 12 8.3a3.6 3.6 0 0 1 6.6 2.6C18.6 15.8 12 20 12 20z"/></svg>`,
  chat: `<svg ${SVG}><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-7L8 19v-2.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/></svg>`,
};

/**
 * Palette als Inline-Tokens — Look B traegt jede Farbwelt (belegt: design/b-hell.png).
 *
 * Font-Familien MUESSEN einfach gequotet werden ('Space Grotesk', nicht "Space Grotesk"):
 * der Aufrufer setzt dies in ein HTML-Attribut style="…" mit doppelten Anfuehrungszeichen.
 * Ein eingebettetes " haette das Attribut vorzeitig geschlossen und --ff-display,
 * --ff-body sowie background stillschweigend verschluckt (verifiziert per
 * getComputedStyle waehrend der Sichtpruefung in Step 6 — Hintergrund blieb transparent,
 * Schrift fiel auf Times zurueck).
 */
function tokens(p) {
  return [
    `--paper:${p.paper}`, `--ink:${p.ink}`, `--ink-soft:${p.inkSoft}`,
    `--accent:${p.accent}`, `--rule:${p.rule}`,
    "--ff-display:'Space Grotesk',sans-serif", "--ff-body:'Plus Jakarta Sans',sans-serif",
    `background:${p.paper}`,
  ].join(';');
}

/**
 * DIE SPERRE (Spec §5a): unser Zeichen und IHR Handle in EINEM Element, das die
 * Grundlinie der Komposition traegt. Wer uns wegradiert, nimmt ihren Namen und die
 * Linie mit — das Loch sieht man sofort.
 * NIEMALS trennen. Das ist der ganze Punkt.
 */
function lock(clean) {
  return `<div class="lock wm-soft">
    <span class="handle">@${esc(clean.handle)}</span>
    <span class="spacer"></span>
    <span class="mark"><span class="dot"></span>erstellt mit <i class="wm-logo" role="img" aria-label="social2scale"></i></span>
  </div>`;
}

/** Kopfzeile jeder Slide: Kicker + Slide-Zaehler „0n / 03" INNERHALB des Posts. */
function slideTop(s, nr) {
  return `<div class="slide-top">
        <span class="eyebrow">${esc(s.eyebrow)}</span>
        <span class="idx"><b>0${nr}</b> / 03</span>
      </div>
      <div class="rule-top"></div>`;
}

/** hook: das grosse Cover-Statement (wie der bisherige Slide). */
function hookBody(s) {
  return `<div class="spacer-fill"></div>
      <h1 class="head">${esc(s.head)}<br><em>${esc(s.headAccent)}</em></h1>
      <p class="sub">${esc(s.sub)}</p>`;
}

/** value: nummern-/punktbetont — grosse Zahl + Kernaussage. */
function valueBody(s, nr) {
  return `<div class="spacer-fill"></div>
      <div class="big-num">0${nr}</div>
      <h1 class="head head-value">${esc(s.head)} <em>${esc(s.headAccent)}</em></h1>
      <p class="sub">${esc(s.sub)}</p>`;
}

/** cta: ruhiger Abschluss — Handle gross + „Folge für mehr". */
function ctaBody(s, clean) {
  return `<div class="spacer-fill"></div>
      <div class="cta-handle">@${esc(clean.handle)}</div>
      <h1 class="head head-cta">${esc(s.head)}<br><em>${esc(s.headAccent)}</em></h1>
      <p class="sub">${esc(s.sub)}</p>
      <div class="cta-follow"><span class="cta-plus">+</span> Folge für mehr</div>`;
}

/**
 * EINE Renderfunktion, `kind` steuert die Variante — so sehen die 3 Slides eines
 * Karussells nicht identisch aus. `s` = eine Slide aus copy.posts[i].slides,
 * `nr` = ihr Index 1..3 innerhalb des Posts.
 */
function slide(id, clean, s, p, nr) {
  const kind = s?.kind === 'value' || s?.kind === 'cta' ? s.kind : 'hook';
  const body = kind === 'value' ? valueBody(s, nr) : kind === 'cta' ? ctaBody(s, clean) : hookBody(s);
  return `<div class="frame grain" id="${id}" style="${tokens(p)}">
    <div class="slide slide-${kind}">
      ${slideTop(s, nr)}
      ${body}
    </div>
    ${lock(clean)}
  </div>`;
}

function profil(id, clean, copy, p) {
  const muster = ['c-fill','c-tint','c-accent','c-line','c-fill','c-tint','c-accent','c-line','c-fill'];
  const zellen = copy.cells
    .map((t, i) => `<div class="cell ${muster[i]}">${esc(t)}</div>`)
    .join('');
  const initial = esc((clean.name || clean.handle || '?').trim().charAt(0).toUpperCase());
  // Echtes Profilbild (data-URL, server-seitig via avatar.js geholt) mit
  // Story-Ring — das staerkste "das bin ja ich"-Signal. Ring in der Akzentfarbe,
  // NICHT der IG-Markengradient (Look-alike ja, Marken-Kopie nein). Ohne Bild:
  // Initial wie bisher.
  const avatarInhalt = clean.avatarUrl
    ? `<img class="pfp-img" src="${esc(clean.avatarUrl)}" alt="">`
    : initial;

  // Besucher-Perspektive wie in der echten IG-App: Back-Chevron + „···" im
  // Header, Folgen/Nachricht unter der Bio, Tab-Leiste ueberm Grid. Das ist der
  // Frame, den sie ihren Wunschkundinnen zeigt — er muss wie ein Screenshot
  // wirken, nicht wie eine Illustration. Kein IG-Logo-Asset (Look-alike, keine
  // Marken-Kopie).
  const S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
  const UI = {
    back: `<svg ${S} width="26" height="26"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>`,
    dots: `<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`,
    signal: `<svg viewBox="0 0 20 14" fill="currentColor" width="20" height="14"><rect x="0" y="9" width="3.4" height="5" rx="1"/><rect x="5.2" y="6" width="3.4" height="8" rx="1"/><rect x="10.4" y="3" width="3.4" height="11" rx="1"/><rect x="15.6" y="0" width="3.4" height="14" rx="1"/></svg>`,
    wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" width="19" height="16"><path d="M4 9.5a12 12 0 0 1 16 0"/><path d="M7 13a8 8 0 0 1 10 0"/><path d="M10 16.5a4 4 0 0 1 4 0"/><circle cx="12" cy="19.4" r="1.15" fill="currentColor" stroke="none"/></svg>`,
    batt: `<svg viewBox="0 0 27 14" width="25" height="14"><rect x=".8" y=".8" width="22" height="12.4" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1.2"/><rect x="2.6" y="2.6" width="15" height="8.8" rx="1.8" fill="currentColor"/><path d="M24.6 4.8v4.4a2.4 2.4 0 0 0 0-4.4z" fill="currentColor" fill-opacity=".5"/></svg>`,
    grid: `<svg ${S} width="27" height="27"><rect x="3.5" y="3.5" width="17" height="17" rx="1.2"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/></svg>`,
    reels: `<svg ${S} width="26" height="26"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M3.5 8.6h17M8.6 3.5l2.6 5.1M14.2 3.5l2.6 5.1"/><path d="M10.4 12.2l4.6 2.7-4.6 2.7z" fill="currentColor" stroke="none"/></svg>`,
    tag: `<svg ${S} width="26" height="26"><circle cx="12" cy="9.6" r="2.6"/><path d="M6.9 16.8c.5-2.4 2.6-3.7 5.1-3.7s4.6 1.3 5.1 3.7"/><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/></svg>`,
  };

  return `<div class="frame grain" id="${id}" style="${tokens(p)}">
    <div class="phone-pad"><div class="shell"><div class="device">
      <div class="ios"><span>9:41</span><span class="ios-ic">${UI.signal}${UI.wifi}${UI.batt}</span></div>
      <div class="ig-top"><span class="ig-back">${UI.back}</span><span>${esc(clean.handle)}</span><span class="ig-more">${UI.dots}</span></div>
      <div class="prof">
        <div class="prof-top">
          <div class="pfp-ring"><div class="avatar">${avatarInhalt}</div></div>
          <div class="stats">
            <div class="stat"><b>9</b><span>Beiträge</span></div>
            <div class="stat"><b>1.240</b><span>Follower</span></div>
            <div class="stat"><b>318</b><span>Gefolgt</span></div>
          </div>
        </div>
        <div class="bio">
          <div class="n">${esc(clean.name)}</div>
          <div class="l"><b>${esc(copy.bio)}</b></div>
        </div>
        <div class="cta-row">
          <span class="btn-follow">Folgen</span>
          <span class="btn-msg">Nachricht</span>
        </div>
        <div class="hl">
          <div class="hl-i"><div class="hl-c">${HL_ICONS.person}</div>Über mich</div>
          <div class="hl-i"><div class="hl-c">${HL_ICONS.spark}</div>Angebot</div>
          <div class="hl-i"><div class="hl-c">${HL_ICONS.heart}</div>Stimmen</div>
          <div class="hl-i"><div class="hl-c">${HL_ICONS.chat}</div>Fragen</div>
        </div>
        <div class="tabs">
          <span class="tab on">${UI.grid}</span><span class="tab">${UI.reels}</span><span class="tab">${UI.tag}</span>
        </div>
        <div class="grid3">${zellen}</div>
      </div>
    </div></div></div>
    ${lock(clean)}
  </div>`;
}

/**
 * Gebrandete Share-Card (`f-share`) — farbwelt-unabhaengig, im s2s-Markenlook
 * (Gradient-Wash + Logo), mit QR → Funnel. Zweck: eine Followerin sieht den vom
 * Kunden geposteten Post, scannt den QR (im Feed/Story sind Text-Links tot) und
 * landet im Funnel -> viraler Loop. shareUrl kommt aus env.PUBLIC_ORIGIN.
 */
function shareFrame(clean, copy, shareUrl) {
  // Kundenbezug + Mehrwert: NICHT eine generische s2s-Anzeige, sondern der ECHTE
  // beste Hook der Kundin als Held. Wenn SIE das teilt, zeigt es ihren stärksten
  // Content (Proof, macht sie gut aussehen -> sie WILL teilen); s2s ist nur die
  // dezente Signatur + QR drunter (viraler Loop). Hook = 1. Slide (kind:'hook')
  // des 1. Posts; Fallback auf die Profil-Headline, nie leer.
  const hook = (Array.isArray(copy?.posts) && copy.posts[0] && copy.posts[0].slides && copy.posts[0].slides[0]) || {};
  const kicker = esc(hook.eyebrow || 'Der Post, der scrollen stoppt');
  const head = esc(hook.head || copy?.head || 'Dein Content,');
  const accent = esc(hook.headAccent || copy?.headAccent || 'der auffällt.');
  const sub = esc(hook.sub || '');
  // Ihr echtes Foto klein neben dem Handle: der geteilte Post wird persoenlich,
  // nicht generisch. Ohne Foto faellt der Block auf reinen Text zurueck.
  const sharePfp = clean.avatarUrl
    ? `<img class="share-pfp" src="${esc(clean.avatarUrl)}" alt="">`
    : '';
  return `<div class="frame share grain" id="f-share">
    <div class="share-grad"></div>
    <div class="share-inner">
      <div class="share-top">
        <div class="share-id">${sharePfp}<div class="share-who">
          <span class="share-at">@${esc(clean.handle)}</span>
          <span class="share-plat">Instagram · frische Vorschau</span>
        </div></div>
        <img class="share-mark" src="https://social2scale.com/assets/sig-avatar.png" alt="social2scale">
      </div>
      <div class="share-hero">
        <span class="share-kicker">${kicker}</span>
        <h1 class="share-hook">${head} <em>${accent}</em></h1>
        ${sub ? `<p class="share-hooksub">${sub}</p>` : ''}
      </div>
      <div class="share-foot">
        <div class="share-foot-l">
          <img class="share-logo" src="https://social2scale.com/assets/sig-wordmark.png" alt="social2scale">
          <span class="share-foot-t">Auch dein Feed — <em>gratis in Minuten.</em></span>
        </div>
        <div class="share-qr-wrap">
          <div class="share-qr">${qrSvg(shareUrl, 210)}</div>
          <span class="share-scan">Scan <span class="share-arrow">→</span></span>
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * @returns {string} eine HTML-Seite mit den Frames (2 Farbwelten × [Profil +
 *   3 Posts × 3 Slides] + 1 Share-Card). copy.posts liegt immer wohlgeformt vor —
 *   Fallback/Backfill in copy.js garantieren 3 Posts mit je 3 Slides.
 * @param {string} [shareUrl] Ziel des QR auf der Share-Card (Funnel-Einstieg).
 * @param {Set<string>} [onlyIds] Wenn gesetzt, werden NUR diese Frame-Ids gebaut.
 *   render.js verteilt die 21 Frames so auf mehrere Seiten (je ~7), damit keine
 *   Seite das volle DOM tragen muss (Speicher) und die Screenshots parallel laufen.
 */
export function buildPage(clean, copy, palettes, shareUrl, onlyIds) {
  const want = onlyIds ? (id) => onlyIds.has(id) : () => true;
  const posts = Array.isArray(copy.posts) ? copy.posts : [];
  const frames = palettes
    .map((p, w) => {
      const profId = `f-${w}-profil`;
      const profilFrame = want(profId) ? profil(profId, clean, copy, p) : '';
      const postFrames = posts
        .map((post, pi) =>
          (Array.isArray(post?.slides) ? post.slides : [])
            .map((s, si) => {
              const id = `f-${w}-p${pi + 1}-s${si + 1}`;
              return want(id) ? slide(id, clean, s, p, si + 1) : '';
            })
            .join('')
        )
        .join('');
      return profilFrame + postFrames;
    })
    .join('');

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>${LOOK_CSS}</style></head><body>${frames}${want('f-share') ? shareFrame(clean, copy, shareUrl) : ''}</body></html>`;
}
