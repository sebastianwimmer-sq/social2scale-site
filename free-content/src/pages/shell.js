/**
 * Gemeinsame HTML-Huelle fuer alle Free-Content-Erlebnis-Seiten (Formular, Build,
 * Reveal). Enthaelt Kopf (Meta, gehostete Fonts), Marken-Tokens und den
 * Cosmos/Scene-Hintergrund — 1:1 aus design/prototypes/form.html, nur die
 * @font-face-Quellen und das .photo-Hintergrundbild auf gehostete URLs
 * umgestellt (Spec Plan 3: kein eingebettetes Asset im Worker-HTML).
 */

const FONT_BASE = 'https://social2scale.com/fonts';
const ASSET_BASE = 'https://social2scale.com/assets';

/**
 * Der Funnel lieferte bis zum 28.07. GAR KEINE Sicherheits-Header — auf Seiten, die
 * von der Besucherin stammende Texte rendern (Name, Handle, Captions) und seit dem
 * 27.07. oeffentlich von der Startseite verlinkt sind.
 *
 * Bewusst OHNE Content-Security-Policy: die Seiten leben von Inline-Skripten und
 * binden Turnstile ein. Eine zu enge CSP wuerde den Funnel stillegen — und ein
 * kaputtes Formular kostet Leads, waehrend diese drei Header nichts kaputtmachen
 * koennen. CSP gehoert sauber getestet nachgezogen, nicht nachts nebenbei.
 */
// Content-Security-Policy fuer die Besucher-Seiten (Formular, Bestaetigung, Build,
// Reveal). Erlaubt genau die realen Quellen:
//  - inline <script>/<style> (der Funnel lebt davon)  -> 'unsafe-inline'
//  - Turnstile (Bot-Gate)   -> script/connect/frame challenges.cloudflare.com
//  - Fonts + Wordmark + Feed-Bilder liegen auf social2scale.com bzw. same-origin (R2 /img/)
// Bewusst ZUERST als Report-Only ausgeliefert: eine zu enge CSP legt den Funnel
// still, Report-Only blockiert NIE und meldet Verstoesse nur in der Konsole. Nach
// dem Gegentest an der echten Seite (Turnstile/R2/Fonts) wird auf durchsetzend geflippt.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  // blob: fuer die lokale Foto-Vorschau im Wizard (URL.createObjectURL -> <img>).
  "img-src 'self' data: blob: https://social2scale.com",
  "font-src 'self' https://social2scale.com",
  // Setting-Film nach dem Eintragen (film.js) liegt neben den Bildern auf social2scale.com/assets.
  "media-src https://social2scale.com",
  // closing. = Zaehler /api/pv (Trichter ohne Kennung, siehe form.js zaehlen()).
  "connect-src 'self' https://challenges.cloudflare.com https://closing.social2scale.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// 09.09.2026: Gegentest bestanden — die echten Seiten laden NUR von
// challenges.cloudflare.com (Turnstile) + social2scale.com (Fonts/Bilder), beide
// in der CSP-Whitelist. Deshalb von Report-Only auf DURCHSETZEND geflippt (wie im
// Kommentar oben vorgesehen). 'unsafe-inline' bleibt (der Funnel lebt von Inline-
// Skripten) → eigene Skripte laufen weiter, aber eingeschleustes Fremd-Markup nicht.
// Plus HSTS + Permissions-Policy, damit die Freebie-Fläche gleich hart ist wie CRM/Portal.
export const SICHERHEITS_HEADER = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()',
  'Content-Security-Policy': CSP,
};

const SHARED_STYLE = `
  /* Logo-Link: 44 px Trefferflaeche (kern.md), das Bild bleibt 30 px hoch. Der negative
     Aussenabstand nimmt die 14 px wieder heraus — am iPhone SE rutschte sonst der erste Knopf. */
  a:has(> .wm-logo){display:inline-flex;align-items:center;min-height:44px;margin-block:-7px}
  @font-face { font-family:"Hanken Grotesk"; font-weight:400 600; font-style:normal; font-display:block; src:url(${FONT_BASE}/hanken-latin.woff2) format("woff2"); }
  @font-face { font-family:"Archivo"; font-weight:400 800; font-style:normal; font-display:block; src:url(${FONT_BASE}/archivo-latin.woff2) format("woff2"); }
  @font-face { font-family:"Fraunces"; font-weight:300 600; font-style:normal; font-display:block; src:url(${FONT_BASE}/fraunces-normal-latin.woff2) format("woff2"); }
  :root{
    --bg-0:#03080D; --ink:#F4F5F3; --muted:#9EA4A2; --faint:#6E7573;
    --emerald:#00B888; --emerald-soft:#1FC998; --teal:#1FA6E0; --emerald-ink:#04201A;
    --flow:linear-gradient(135deg,var(--emerald-soft),var(--emerald) 52%,var(--teal));
    --hair:rgba(255,255,255,.09); --hair-2:rgba(255,255,255,.14);
    --ff-body:"Hanken Grotesk",system-ui,sans-serif; --ff-label:"Archivo",sans-serif; --ff-serif:"Fraunces",Georgia,serif;
    --ff-ios:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    --e-out:cubic-bezier(.16,1,.3,1); --e-spring:cubic-bezier(.32,.72,0,1);
    /* Dauer-Skala wie social2scale.com (motion-loop 06.10.2026) */
    --dur-1:.15s; --dur-2:.24s; --dur-3:.45s; --dur-4:.8s;
    --mood:#1FA6E0; --mood-t:#123244; --mood-ti:#EAF4F8; --mood-2:#0E7C9C;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%}
  body{background:var(--bg-0);color:var(--ink);font-family:var(--ff-body);-webkit-font-smoothing:antialiased;line-height:1.5;overflow-x:hidden;overflow-y:auto}

  /* ── SZENE wie das Hero von social2scale.com (16.10.2026, Sebi: „vom Design-System der Hero-Landing-
     page bleiben, selbst im Funnel“): derselbe Grund (Emerald-Licht oben links, Teal unten rechts) und
     dieselbe Lichtlinie mit Punkte-Feld (hero-linie). Vorher ein Raum-Foto mit Pflanzen und drei
     schwebende Licht-Blobs, die es auf der Website nicht gibt. ── */
  .scene{position:fixed;inset:0;z-index:0;overflow:hidden;background:
    radial-gradient(95% 75% at 14% 6%,rgba(0,184,136,.34),transparent 55%),
    radial-gradient(98% 82% at 90% 92%,rgba(20,140,200,.30),transparent 56%),
    linear-gradient(150deg,#04140F 0%,#05131C 52%,#03080D 100%)}
  .photo{position:absolute;inset:0;background:url("${ASSET_BASE}/hero-linie-1600.webp") 62% 88%/cover no-repeat;opacity:.55;
    -webkit-mask-image:radial-gradient(90% 80% at 70% 70%,#000 40%,transparent 100%);mask-image:radial-gradient(90% 80% at 70% 70%,#000 40%,transparent 100%)}
  @media (min-width:701px){.photo{background-image:url("${ASSET_BASE}/hero-linie-2880.webp");background-position:center 80%;opacity:.6}}
  .photo::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,13,.35),rgba(3,8,13,.55) 58%,rgba(3,8,13,.8))}
  /* ── Lichtstudio-Bruecke (27.10.2026, Richtung E): die Website ist jetzt ein Studio mit Verlaufslicht.
     Der Funnel nimmt dieses Licht auf — dieselbe Wand, derselbe Kegel, derselbe Boden — statt der
     Lichtlinie, die es auf der Website nicht mehr gibt. Das Licht geht beim Ankommen EINMAL an. ── */
  .scene.studio{background:radial-gradient(60% 70% at 50% 24%,#0E2A24 0%,#071512 42%,#03080D 78%)}
  .studio .kegel{position:absolute;inset:0;mix-blend-mode:screen;animation:kegelAn 1.6s .3s cubic-bezier(.2,.7,.2,1) both;
    background:conic-gradient(from 0deg at 50% -14%,transparent 0 150deg,rgba(31,201,152,.09) 160deg,rgba(31,201,152,.36) 170deg,
      rgba(31,166,224,.33) 183deg,rgba(47,190,234,.16) 194deg,transparent 206deg);
    -webkit-mask-image:linear-gradient(180deg,#000 30%,transparent 92%);mask-image:linear-gradient(180deg,#000 30%,transparent 92%)}
  .studio .boden{position:absolute;left:0;right:0;bottom:0;height:40%;background:linear-gradient(180deg,#081310,#020507 70%,#03080D)}
  .studio .boden::before{content:"";position:absolute;inset:0;mix-blend-mode:screen;animation:kegelAn 1.8s .5s both;
    background:radial-gradient(34% 54% at 50% 0%,rgba(31,201,152,.24),rgba(31,166,224,.08) 55%,transparent 75%)}
  @keyframes kegelAn{from{opacity:0}}
  @media print{.studio .kegel,.studio .boden{display:none}}
  /* Film-Grain (fixed, ueberlagert alles, keine Events) */
  .grain{position:fixed;inset:0;z-index:60;pointer-events:none;opacity:.05;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
  @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}}
`;

const SCENE_MARKUP = `
<div class="scene studio" aria-hidden="true">
  <div class="boden"></div>
  <div class="kegel"></div>
</div>
<div class="grain"></div>`;

/**
 * Baut das komplette HTML-Dokument fuer eine Free-Content-Seite.
 * @param {{title:string, head?:string, body:string}} params
 * @returns {Response}
 */
export function htmlDoc({ title, head = '', body }) {
  const html =
    '<!doctype html><html lang="de"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="dark light">' +
    `<title>${title}</title>` +
    `<style>${SHARED_STYLE}</style>` +
    head +
    '</head><body>' +
    SCENE_MARKUP +
    body +
    '</body></html>';

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...SICHERHEITS_HEADER },
  });
}
