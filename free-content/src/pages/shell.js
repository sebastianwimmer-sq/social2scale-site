/**
 * Gemeinsame HTML-Huelle fuer alle Free-Content-Erlebnis-Seiten (Formular, Build,
 * Reveal). Enthaelt Kopf (Meta, gehostete Fonts), Marken-Tokens und den
 * Cosmos/Scene-Hintergrund — 1:1 aus design/prototypes/form.html, nur die
 * @font-face-Quellen und das .photo-Hintergrundbild auf gehostete URLs
 * umgestellt (Spec Plan 3: kein eingebettetes Asset im Worker-HTML).
 */

const FONT_BASE = 'https://social2scale.com/fonts';
const ASSET_BASE = 'https://social2scale.com/assets';

const SHARED_STYLE = `
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
    --mood:#1FA6E0; --mood-t:#123244; --mood-ti:#EAF4F8; --mood-2:#0E7C9C;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%}
  body{background:var(--bg-0);color:var(--ink);font-family:var(--ff-body);-webkit-font-smoothing:antialiased;line-height:1.5;overflow-x:hidden;overflow-y:auto}

  /* ── SZENE (echtes Marken-Foto + atmosphaerischer Wash) ── */
  .scene{position:fixed;inset:0;z-index:0;overflow:hidden;background:linear-gradient(150deg,#04140F,#05131C 52%,#03080D)}
  .photo{position:absolute;inset:0;background:url("${ASSET_BASE}/workspace-portrait.webp") center 22%/cover no-repeat;opacity:.42}
  .photo::after{content:"";position:absolute;inset:0;background:
    radial-gradient(86% 58% at 15% 2%,rgba(0,184,136,.30),transparent 55%),
    radial-gradient(84% 64% at 90% 98%,rgba(20,140,200,.24),transparent 58%),
    linear-gradient(180deg,rgba(3,8,13,.5),rgba(3,8,13,.72) 52%,rgba(3,8,13,.94))}
  .orb{position:absolute;border-radius:50%;filter:blur(78px);will-change:transform}
  .orb-a{width:56vmax;height:56vmax;left:-18vmax;top:-24vmax;opacity:.42;background:radial-gradient(circle,rgba(0,184,136,.34),transparent 66%);animation:dA 26s ease-in-out infinite}
  .orb-b{width:46vmax;height:46vmax;right:-15vmax;bottom:-16vmax;opacity:.3;background:radial-gradient(circle,var(--mood),transparent 64%);transition:background 1.3s var(--e-out);animation:dB 31s ease-in-out infinite}
  @keyframes dA{0%,100%{transform:translate(0,0)}50%{transform:translate(7vmax,5vmax)}}
  @keyframes dB{0%,100%{transform:translate(0,0)}50%{transform:translate(-6vmax,-4vmax)}}
  /* Lichtstrahl von oben-links */
  .ray{position:absolute;top:-30%;left:-10%;width:70%;height:120%;transform:rotate(18deg);filter:blur(30px);opacity:.5;background:linear-gradient(90deg,transparent,rgba(31,201,152,.10) 40%,rgba(31,166,224,.06) 60%,transparent);pointer-events:none}
  #dust{position:absolute;inset:0}
  /* Film-Grain (fixed, ueberlagert alles, keine Events) */
  .grain{position:fixed;inset:0;z-index:60;pointer-events:none;opacity:.05;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
  @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}.orb{opacity:.3}#dust{display:none}}
`;

const SCENE_MARKUP = `
<div class="scene">
  <div class="photo"></div>
  <div class="orb orb-a"></div><div class="orb orb-b"></div><div class="ray"></div>
  <canvas id="dust"></canvas>
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
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
