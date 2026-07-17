/**
 * Baut EINE HTML-Seite mit allen 8 Frames. Rein: keine Bindings, kein I/O.
 *
 * Alle 8 auf einer Seite, weil render.js sie in EINEM Browser-Durchlauf
 * abschiesst (Muster make-pdfs.cjs: element.screenshot pro Frame). Acht
 * Browser-Starts waeren acht Mal Kaltstart.
 */

import { LOOK_CSS } from './css.js';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700' +
  '&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';

/** Reihenfolge = Render-Reihenfolge. render.js iteriert hierueber. */
export const FRAME_IDS = [
  'f-0-profil', 'f-0-s1', 'f-0-s2', 'f-0-s3',
  'f-1-profil', 'f-1-s1', 'f-1-s2', 'f-1-s3',
];

/** Ihre Eingaben kommen aus einem OEFFENTLICHEN Formular. Nichts landet roh im HTML. */
function esc(v) {
  return String(v ?? '').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

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
    <span class="mark"><span class="dot"></span>erstellt mit <b>social2scale</b></span>
  </div>`;
}

function slide(id, clean, copy, p, nr) {
  return `<div class="frame grain" id="${id}" style="${tokens(p)}">
    <div class="slide">
      <div class="slide-top">
        <span class="eyebrow">${esc(copy.eyebrow)}</span>
        <span class="idx"><b>0${nr}</b> / 03</span>
      </div>
      <div class="rule-top"></div>
      <div class="spacer-fill"></div>
      <h1 class="head">${esc(copy.head)}<br><em>${esc(copy.headAccent)}</em></h1>
      <p class="sub">${esc(copy.sub)}</p>
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

  return `<div class="frame grain" id="${id}" style="${tokens(p)}">
    <div class="phone-pad"><div class="shell"><div class="device">
      <div class="ios"><span>9:41</span><span class="rechts">▮▮▮ ▰</span></div>
      <div class="ig-top"><span>@${esc(clean.handle)}</span></div>
      <div class="prof">
        <div class="prof-top">
          <div class="avatar">${initial}</div>
          <div class="stats">
            <div class="stat"><b>9</b><span>Beiträge</span></div>
            <div class="stat"><b>1.240</b><span>Follower</span></div>
            <div class="stat"><b>318</b><span>Folgt</span></div>
          </div>
        </div>
        <div class="bio">
          <div class="n">${esc(clean.name)}</div>
          <div class="l"><b>${esc(copy.bio)}</b></div>
        </div>
        <div class="hl">
          <div class="hl-i"><div class="hl-c">✳</div>Über mich</div>
          <div class="hl-i"><div class="hl-c">◆</div>Angebot</div>
          <div class="hl-i"><div class="hl-c">❞</div>Stimmen</div>
          <div class="hl-i"><div class="hl-c">?</div>Fragen</div>
        </div>
        <div class="grid3">${zellen}</div>
      </div>
    </div></div></div>
    ${lock(clean)}
  </div>`;
}

/**
 * @returns {string} eine HTML-Seite mit allen 8 Frames
 */
export function buildPage(clean, copy, palettes) {
  const frames = palettes
    .map((p, i) => [
      profil(`f-${i}-profil`, clean, copy, p),
      slide(`f-${i}-s1`, clean, copy, p, 1),
      slide(`f-${i}-s2`, clean, copy, p, 2),
      slide(`f-${i}-s3`, clean, copy, p, 3),
    ].join(''))
    .join('');

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>${LOOK_CSS}</style></head><body>${frames}</body></html>`;
}
