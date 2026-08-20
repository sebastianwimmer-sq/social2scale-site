#!/usr/bin/env node
// ============================================================
// Smart-Studio-Dankesseiten-Generator
// ------------------------------------------------------------
// Eine Config → 7 statische Seiten unter /danke/studio/…
// (6 Produkt-Seiten + 1 Fallback). Nach Config-Änderung:
//   node scripts/build-danke-studio.mjs
// dann committen — main = Pages-Deploy.
//
// System: Jede Digistore-Dankesseite bestätigt die Gutschrift,
// führt in 3 Schritten zum ersten Beitrag und zeigt EIN
// produktspezifisches, zeitlich begrenztes Anschluss-Angebot
// (Post-Purchase-Upsell). Pain-Point je Produkt, Countdown ab
// erstem Seitenbesuch (localStorage), abgelaufen = ruhiger
// Normalzustand.
//
// ⚠️ WAHRHEITSPFLICHT (UWG): Der Countdown ist nur zulässig,
// wenn das Angebot danach WIRKLICH nicht mehr gilt. Die
// Bonus-Token-Produkte müssen in Digistore als eigene Produkte
// existieren (IDs unten eintragen) und dürfen nirgendwo sonst
// dauerhaft verlinkt sein. Keine Fake-Verknappung.
//
// TODO(Sebi/Phil) vor Launch:
//   1. PREISE final eintragen (price/priceNote je Produkt).
//   2. Digistore-Produkt-IDs in UPSELL.id eintragen
//      (Bonus-Varianten = eigene Produkte, Token-Zahl inkl.
//      Bonus kommt mit in DIGISTORE_TOKEN_PRODUCTS im Portal).
//   3. In Digistore je Produkt diese Seite als Dankesseite
//      hinterlegen + "Parameter an Dankeseite übergeben" an
//      (dann greift die E-Mail-Weitergabe an den Upsell-Link).
// ============================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STUDIO_URL = "https://mein.social2scale.com";
const SUPPORT_MAIL = "info@social2scale.com";
const COUNTDOWN_MINUTES = 15;

// Digistore-Bestellformular-Basis. ID_TBD wird beim Launch ersetzt.
const ds = (id) => "https://www.digistore24.com/product/" + id;

// ------------------------------------------------------------
// BONUS-UPSELL (Higgsfield-Style, Sebi 19.08.): „Kauf JETZT nochmal →
// Bonus-Token obendrauf" mit echtem Countdown. Erst aktiv, wenn Phil die
// exklusiven Bonus-Produkte in Digistore angelegt hat (IDs hier eintragen,
// dann node scripts/build-danke-studio.mjs + deploy). Leer = ruhiger
// Service-Upsell ohne Countdown — UWG: Verknappung nur, wenn sie real ist.
// ------------------------------------------------------------
const BONUS_ABO_ID = ""; // „Rundum-Service-Abo + 100 Bonus-Token (nur Dankesseite)" · 49 €/Mon
const BONUS_250_ID = ""; // „250 Token + 50 Bonus-Token (nur Dankesseite)" · 47 € einmalig

// Paket-Seiten: Abo-Upsell — mit Bonus+Countdown, sobald das Bonus-Produkt existiert.
function aboUpsell(pain, lead) {
  if (BONUS_ABO_ID) {
    return {
      id: BONUS_ABO_ID,
      eyebrow: "Einmaliges Dankeschön · nur auf dieser Seite",
      pain,
      lead: lead + " Und nur hier legen wir dir 100 Bonus-Token auf den ersten Monat obendrauf.",
      title: "Smart Studio — Rundum-Service",
      big: "Wir übernehmen. Du wählst aus.",
      bonus: "+100 Bonus-Token im 1. Monat — nur über diese Seite",
      bullets: [
        "Laufend fertige Beiträge in deiner Marke — ohne dass du starten musst",
        "Du markierst deine Favoriten, wir kümmern uns um den Rest",
        "Monatlich kündbar über Digistore24 — ohne Mindestlaufzeit",
      ],
      price: "49 € / Monat",
      cta: "Rundum-Service mit Bonus sichern",
    };
  }
  return {
    id: "722974",
    eyebrow: "Wenn du magst · dein nächster Schritt",
    pain,
    lead,
    title: "Smart Studio — Rundum-Service",
    big: "Wir übernehmen. Du wählst aus.",
    bonus: null,
    bullets: [
      "Laufend fertige Beiträge in deiner Marke — ohne dass du starten musst",
      "Du markierst deine Favoriten, wir kümmern uns um den Rest",
      "Monatlich kündbar über Digistore24 — ohne Mindestlaufzeit",
    ],
    price: "49 € / Monat",
    cta: "Rundum-Service starten",
    noCountdown: true,
  };
}

// Abo-Seite: Token-Vorrat-Upsell — nur mit echtem Bonus-Produkt, sonst keiner.
function aboPageUpsell() {
  if (!BONUS_250_ID) return null;
  return {
    id: BONUS_250_ID,
    eyebrow: "Einmaliger Start-Vorteil · nur auf dieser Seite",
    pain: "Für die Wochen, in denen du <em>selbst</em> kreativ sein willst.",
    lead: "Dein Service läuft ab jetzt automatisch. Fürs Selbermachen zwischendurch: Sichere dir jetzt einmalig den Token-Vorrat mit 50 Bonus-Token obendrauf — er verfällt nie.",
    title: "Smart Studio — 250 Token",
    big: "250 + 50 Bonus-Token",
    bonus: "+50 Bonus-Token — nur über diese Seite",
    bullets: [
      "12 eigene Beiträge, wann immer du magst",
      "Verfällt nie — dein Vorrat wartet auf dich",
      "Einmalzahlung, kein weiteres Abo",
    ],
    price: "47 € einmalig",
    cta: "Vorrat mit Bonus sichern",
  };
}


// ------------------------------------------------------------
// PRODUKT-CONFIG — die einzige Stelle, an der gepflegt wird.
// tokens = was der Kauf gutschreibt · upsell = das EINE Angebot.
// ------------------------------------------------------------
const PRODUCTS = [
  // Reale Digistore-Produkte (Phil, 16.08.): 100T=722966 · 250T=722970 ·
  // 500T=722971 · Service-Abo=722974. Das Abo ist NICHT token-basiert
  // (Sebi 19.08.): Rundum-Service — wir erstellen laufend, Kundin kuratiert.
  // Kein Countdown/Bonus, solange keine exklusiven Bonus-Produkte existieren
  // (UWG: Verknappung nur, wenn sie real ist).
  {
    slug: "paket-100",
    label: "100 Token",
    isAbo: false,
    tokens: 100,
    heroSub: "Deine <b>100 Token</b> sind auf dem Weg in dein Smart Studio — in der Regel siehst du sie in Sekunden. Genug für 4 komplette Beiträge.",
    upsell: aboUpsell(
      "Selbst erstellen ist stark. <em>Gar nicht dran denken müssen</em> ist stärker.",
      "Mit dem Rundum-Service läuft dein Content automatisch weiter: Wir erstellen dir laufend Beiträge in deiner Marke, du wählst nur noch deine Favoriten aus — den Rest übernehmen wir."
    ),
  },
  {
    slug: "paket-250",
    label: "250 Token",
    isAbo: false,
    tokens: 250,
    heroSub: "Deine <b>250 Token</b> sind auf dem Weg in dein Smart Studio — in der Regel siehst du sie in Sekunden. Genug für 10 komplette Beiträge.",
    upsell: aboUpsell(
      "Dein Rhythmus steht schon — mach ihn jetzt <em>automatisch</em>.",
      "250 Token heißt: du meinst es ernst mit deiner Sichtbarkeit. Der Rundum-Service nimmt dir den letzten Handgriff ab — wir erstellen laufend, du wählst nur noch aus."
    ),
  },
  {
    slug: "paket-500",
    label: "500 Token",
    isAbo: false,
    tokens: 500,
    heroSub: "Deine <b>500 Token</b> sind auf dem Weg in dein Smart Studio — in der Regel siehst du sie in Sekunden. Dein Content-Vorrat für Monate.",
    upsell: aboUpsell(
      "Du planst groß. Mach aus dem Vorrat ein <em>System</em>.",
      "Mit dem Rundum-Service musst du nie wieder auf den Kontostand schauen: Wir erstellen dir laufend Beiträge in deiner Marke — du wählst nur noch deine Favoriten aus."
    ),
  },
  {
    slug: "abo",
    label: "Rundum-Service",
    isAbo: true,
    tokens: null,
    h1: "Willkommen im <em>Rundum-Service</em>.",
    heroSub: "Ab jetzt läuft dein Content <b>automatisch</b>: Wir erstellen dir laufend Beiträge in deiner Marke, du wählst nur noch deine Favoriten aus — den Rest übernehmen wir. <b>Wir melden uns innerhalb von 24 Stunden persönlich bei dir</b> und richten alles ein.",
    stepsEyebrow: "So geht es jetzt weiter",
    steps: [
      { b: "Wir melden uns", t: "innerhalb von 24 Stunden — kurz abstimmen, was deine Marke gerade braucht." },
      { b: "Dein Studio füllt sich", t: "wir erstellen dir laufend fertige Beiträge in deiner Markenwelt." },
      { b: "Du wählst aus", t: "Herz drücken bei deinen Favoriten — wir planen und veröffentlichen für dich." },
    ],
    upsell: aboPageUpsell(),
  },
];

// ------------------------------------------------------------
// BONUS-VARIANTEN (Upsell-Käufe) — Ende der Kette: Bestätigung
// mit Bonus-Rechnung, bewusst KEIN weiterer Upsell.
// ------------------------------------------------------------
const BONUS_PRODUCTS = [
  // Bewusst leer: exklusive Bonus-Produkte existieren (noch) nicht in
  // Digistore. Erst wieder befüllen, wenn Phil sie anlegt — sonst wären
  // Countdown/Bonus-Versprechen UWG-Risiko.
];

// Fallback-Seite, wenn ein Kauf ohne produktspezifische URL landet.
const FALLBACK = {
  slug: "",
  label: "Token",
  isAbo: false,
  tokens: null,
  heroSub: "Dein Token-Guthaben ist auf dem Weg in dein Smart Studio — in der Regel siehst du es in Sekunden.",
  upsell: null,
};

// ------------------------------------------------------------
// Template
// ------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function upsellHtml(p) {
  const u = p.upsell;
  if (!u) return "";
  const href = u.id ? ds(u.id) : u.href;
  const countdown = u.noCountdown
    ? ""
    : `<div class="cd" id="cd" role="timer" aria-label="Verbleibende Zeit für dieses Angebot">
        <span class="cd-k">Angebot endet in</span>
        <span class="cd-t" id="cd-t">${String(COUNTDOWN_MINUTES).padStart(2, "0")}:00</span>
      </div>`;
  return `
  <section class="blk offer" aria-labelledby="offer-h">
    <div class="wrap"><div class="panel reveal" id="offer-panel">
      <div class="offer-top">
        <span class="eyebrow">${esc(u.eyebrow)}</span>
        ${countdown}
      </div>
      <h2 id="offer-h">${u.pain}</h2>
      <p class="lead">${esc(u.lead)}</p>
      <div class="offercard">
        <div class="oc-main">
          <span class="klabel">${esc(u.title)}</span>
          <p class="oc-big">${esc(u.big)}</p>
          ${u.bonus ? `<p class="oc-bonus">✦ ${esc(u.bonus)}</p>` : ""}
          <ul class="oc-list">${u.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>
        <div class="oc-side">
          ${u.price ? `<p class="oc-price">${esc(u.price)}</p>` : ""}
          <a class="btn btn-primary" id="upsell-cta" href="${esc(href)}"${u.id ? "" : ' rel="noopener"'}>${esc(u.cta)} <span class="arr">→</span></a>
          ${u.noCountdown ? "" : `<p class="oc-hint">Gilt nur auf dieser Seite — danach regulärer Umfang.</p>`}
        </div>
      </div>
      ${u.noCountdown ? "" : `<div class="expired" id="expired" hidden>
        <p><b>Dieses Angebot ist abgelaufen.</b> Alle Abos und Pakete findest du jederzeit in deinem Studio unter „Guthaben aufladen".</p>
      </div>`}
    </div></div>
  </section>`;
}

function pageHtml(p) {
  const title = p.slug
    ? `Danke — ${p.label} · Smart Studio · social2scale`
    : "Danke — dein Guthaben kommt · Smart Studio · social2scale";
  const h1 = p.h1 || (p.isAbo
    ? 'Dein Studio ist <em>startklar</em>.'
    : 'Dein Guthaben ist <em>da</em>.');
  const aboLegal = p.isAbo
    ? " Dein Abo verlängert sich monatlich und ist jederzeit über Digistore24 kündbar."
    : "";
  const hasCountdown = p.upsell && !p.upsell.noCountdown;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://closing.social2scale.com; base-uri 'self'; form-action 'self' https:; frame-ancestors 'none'; upgrade-insecure-requests">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#03080D">
<title>${esc(title)}</title>
<meta name="description" content="Danke für deinen Kauf — dein Smart-Studio-Guthaben ist unterwegs.">
<link rel="stylesheet" href="/fonts.css">
<style>
  :root{
    --ink:#0A0B0D; --surface:#141518; --surface-2:#1B1D21; --surface-3:#23252A;
    --paper:#F2F3F1; --muted:#A4A6A1; --faint:#7C7E78;
    --emerald:#00B888; --emerald-soft:#1FC998; --emerald-ink:#04201A;
    --teal:#1FA6E0; --amber:#E8B34B;
    --accent-flow:linear-gradient(135deg,#1FC998,#46BEEA);
    --line:rgba(242,243,241,.08); --line-2:rgba(242,243,241,.14); --line-3:rgba(242,243,241,.20);
    --hi-2:inset 0 1px 0 rgba(255,255,255,.07);
    --ease:cubic-bezier(.16,1,.3,1);
    --surf-grad:linear-gradient(180deg,#202227 0%,var(--surface-2) 38%,var(--surface) 100%);
    --depth:var(--hi-2),0 1px 2px rgba(0,0,0,.4),0 14px 30px -18px rgba(0,0,0,.6);
    --depth-lg:var(--hi-2),0 2px 4px rgba(0,0,0,.45),0 44px 96px -42px rgba(0,0,0,.88);
    --grad-emerald:radial-gradient(120% 140% at 78% 8%,rgba(0,184,136,.12),transparent 52%),radial-gradient(120% 130% at 14% 96%,rgba(31,166,224,.10),transparent 56%),linear-gradient(180deg,#191B1F 0%,var(--surface) 70%);
    --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:32px; --s-7:48px; --s-8:64px; --s-9:96px;
    --px:clamp(20px,5vw,56px);
    color-scheme:dark;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    background:
      radial-gradient(95% 75% at 14% 6%,rgba(0,184,136,.34),transparent 55%),
      radial-gradient(98% 82% at 90% 92%,rgba(20,140,200,.30),transparent 56%),
      linear-gradient(150deg,#04140F 0%,#05131C 52%,#03080D 100%);
    background-attachment:fixed;background-color:#03080D;
    color:var(--paper);font-family:"Hanken Grotesk",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;line-height:1.6;overflow-x:hidden}
  @media (max-width:700px){body{background-attachment:scroll;background-size:cover}}
  ::selection{background:rgba(0,184,136,.30);color:#F2F3F1}
  a:focus-visible,button:focus-visible{outline:2px solid var(--emerald);outline-offset:3px;border-radius:4px}
  .wrap{width:100%;max-width:880px;margin:0 auto;padding:0 var(--px)}

  @keyframes upIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
  @keyframes glint{0%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
  @keyframes glowPulse{0%{opacity:0;transform:scale(.7)}45%{opacity:.85}100%{opacity:0;transform:scale(1.5)}}
  @keyframes drawCheck{to{stroke-dashoffset:0}}
  .reveal{opacity:0;transform:translateY(22px);transition:opacity .7s var(--ease),transform .7s var(--ease)}
  .reveal.on{opacity:1;transform:none}
  @media (prefers-reduced-motion:reduce){
    .reveal{opacity:1!important;transform:none!important;transition:none}
    .r{animation:none!important;opacity:1!important}
    .badge path{stroke-dashoffset:0!important;animation:none!important}
    .celebrate{animation:none;opacity:0}
  }
  .r{opacity:0;animation:upIn .7s var(--ease) forwards}

  .eyebrow{display:inline-flex;align-items:center;gap:var(--s-2);font-family:"Archivo",sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}
  .klabel{font-family:"Archivo",sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--emerald);display:block}
  h2{font-family:"Fraunces",serif;font-weight:450;font-size:clamp(1.9rem,1.3rem + 2.4vw,3rem);line-height:1.06;letter-spacing:-.022em;margin-top:var(--s-3)}
  h2 em,.hero h1 em{font-style:italic;font-weight:450;background:var(--accent-flow);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:var(--emerald)}
  .lead{color:var(--muted);max-width:58ch;margin-top:var(--s-4);font-size:clamp(1.02rem,.98rem + .3vw,1.15rem)}

  .bar{display:flex;align-items:center;justify-content:center;padding:0 var(--px);min-height:68px;border-bottom:1px solid rgba(0,184,136,.14);position:sticky;top:0;z-index:120;background:linear-gradient(180deg,rgba(8,16,13,.86),rgba(7,11,14,.78));-webkit-backdrop-filter:blur(16px) saturate(150%);backdrop-filter:blur(16px) saturate(150%)}
  .bar .brand img{height:30px;width:auto;display:block}

  .btn{position:relative;display:inline-block;font-family:"Archivo",sans-serif;font-size:15px;font-weight:700;letter-spacing:.02em;padding:18px 36px;border-radius:9px;text-decoration:none;cursor:pointer;overflow:hidden;transition:transform .25s var(--ease),box-shadow .25s}
  .btn:hover{transform:translateY(-3px)}
  .btn-primary{background:linear-gradient(135deg,var(--emerald-soft) 0%,var(--emerald) 52%,var(--teal) 100%);color:var(--emerald-ink);box-shadow:0 16px 38px -12px rgba(0,184,136,.6),0 16px 38px -16px rgba(31,166,224,.45),inset 0 1px 0 rgba(255,255,255,.32)}
  .btn-primary::after{content:"";position:absolute;top:0;left:0;width:45%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);transform:translateX(-150%)}
  .btn-primary:hover::after{animation:glint .85s var(--ease) forwards}
  .btn .arr{display:inline-block;transition:transform .25s var(--ease)}.btn:hover .arr{transform:translateX(4px)}
  .btn-ghost{background:rgba(242,243,241,.04);border:1px solid var(--line-2);color:var(--paper)}
  .btn-ghost:hover{border-color:var(--line-3)}

  .hero{position:relative;overflow:hidden;padding:clamp(var(--s-8),7vw,var(--s-9)) 0 clamp(var(--s-7),5vw,var(--s-8))}
  .herovid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5;z-index:0;pointer-events:none}
  @media (prefers-reduced-motion:reduce){.herovid{display:none}}
  .hero .wrap{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center}
  .celebrate{position:absolute;top:30%;left:50%;width:540px;height:540px;margin:-270px 0 0 -270px;border-radius:50%;background:radial-gradient(circle,rgba(0,184,136,.45),rgba(31,166,224,.12) 52%,transparent 66%);pointer-events:none;z-index:0;animation:glowPulse 1.7s var(--ease) .2s both}
  .badge{display:inline-flex;align-items:center;gap:8px;font-family:"Archivo",sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--emerald);background:rgba(0,184,136,.10);border:1px solid rgba(0,184,136,.30);border-radius:999px;padding:8px 15px;animation:upIn .6s var(--ease) .12s both}
  .badge svg{width:15px;height:15px}.badge path{stroke-dasharray:30;stroke-dashoffset:30;animation:drawCheck .5s var(--ease) .55s forwards}
  .hero h1{font-family:"Fraunces",serif;font-weight:540;font-size:clamp(2.6rem,1rem + 5.6vw,5.2rem);line-height:.98;letter-spacing:-.03em;margin-top:var(--s-5);max-width:16ch;font-variation-settings:"opsz" 144;animation:upIn .7s var(--ease) .26s both}
  .hero .sub{color:var(--muted);font-size:clamp(1.1rem,1rem + .55vw,1.3rem);margin-top:var(--s-6);max-width:52ch;line-height:1.6;animation:upIn .7s var(--ease) .38s both}
  .hero .sub b{color:var(--paper);font-weight:600}
  .hero .cta-row{display:flex;flex-direction:column;align-items:center;gap:var(--s-3);margin-top:var(--s-6);animation:upIn .7s var(--ease) .5s both}
  .hero .hint{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;color:var(--faint);text-shadow:0 1px 10px rgba(0,0,0,.85)}

  section.blk{padding:clamp(var(--s-7),5vw,var(--s-8)) 0}
  .offer .panel{position:relative;overflow:hidden;background:var(--grad-emerald);border:1px solid var(--line-2);border-radius:24px;padding:clamp(26px,4.5vw,48px);box-shadow:var(--depth-lg)}
  .offer .panel::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,184,136,.6) 40%,rgba(31,166,224,.55) 70%,transparent)}
  .offer-top{display:flex;align-items:center;justify-content:space-between;gap:var(--s-4);flex-wrap:wrap}
  .cd{display:inline-flex;align-items:baseline;gap:10px;background:rgba(232,179,75,.08);border:1px solid rgba(232,179,75,.32);border-radius:999px;padding:8px 16px}
  .cd-k{font-family:"Archivo",sans-serif;font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--amber)}
  .cd-t{font-family:"JetBrains Mono",monospace;font-size:1.05rem;font-weight:500;color:var(--amber);font-variant-numeric:tabular-nums;letter-spacing:.06em}
  .offercard{display:grid;grid-template-columns:1.5fr 1fr;gap:var(--s-6);margin-top:var(--s-6);background:var(--surf-grad);border:1px solid var(--line-2);border-radius:18px;padding:clamp(20px,3vw,30px);box-shadow:var(--depth)}
  .oc-big{font-family:"Fraunces",serif;font-weight:500;font-size:clamp(1.6rem,1.2rem + 1.4vw,2.3rem);letter-spacing:-.02em;margin-top:var(--s-2)}
  .oc-bonus{margin-top:var(--s-3);font-family:"Archivo",sans-serif;font-weight:600;font-size:.96rem;color:var(--amber)}
  .oc-list{list-style:none;margin-top:var(--s-4);display:grid;gap:var(--s-2)}
  .oc-list li{position:relative;padding-left:1.6em;color:var(--muted);font-size:.98rem}
  .oc-list li::before{content:"✓";position:absolute;left:0;color:var(--emerald);font-weight:700}
  .oc-side{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:var(--s-3);border-left:1px solid var(--line);padding-left:var(--s-6)}
  .oc-price{font-family:"Archivo",sans-serif;font-weight:700;font-size:1.3rem}
  .oc-hint{font-size:.85rem;color:var(--faint);line-height:1.5}
  .expired p{margin-top:var(--s-5);color:var(--muted);background:rgba(242,243,241,.03);border:1px solid var(--line-2);border-radius:12px;padding:var(--s-4) var(--s-5)}
  .expired b{color:var(--paper)}
  .offer .panel.is-expired .offercard,.offer .panel.is-expired .cd,.offer .panel.is-expired .oc-hint{display:none}
  @media (max-width:720px){
    .offercard{grid-template-columns:1fr}
    .oc-side{border-left:0;border-top:1px solid var(--line);padding-left:0;padding-top:var(--s-5);align-items:stretch}
    .oc-side .btn{text-align:center}
  }

  .steps-blk .wrap>.eyebrow{margin-bottom:var(--s-2)}
  .steps{list-style:none;display:grid;gap:var(--s-3);counter-reset:step;margin-top:var(--s-5)}
  .steps li{counter-increment:step;display:flex;gap:var(--s-5);align-items:baseline;background:var(--surf-grad);border:1px solid var(--line-2);border-radius:14px;padding:clamp(16px,2.4vw,22px) clamp(18px,3vw,26px);box-shadow:var(--depth)}
  .steps li::before{content:counter(step,decimal-leading-zero);font-family:"JetBrains Mono",monospace;font-size:.95rem;color:var(--emerald);flex:none}
  .steps li b{color:var(--paper);font-weight:600}
  .steps li{color:var(--muted);font-size:.98rem}

  .legal-blk .wrap{display:grid;gap:var(--s-4)}
  .notecard{background:rgba(242,243,241,.03);border:1px solid var(--line-2);border-radius:12px;padding:var(--s-4) var(--s-5);color:var(--muted);font-size:.93rem;line-height:1.65}
  .notecard b{color:var(--paper)}
  .notecard a{color:var(--emerald-soft);text-decoration:none}
  .notecard a:hover{text-decoration:underline}
  .mandatory{font-family:"JetBrains Mono",monospace;font-size:11.5px;letter-spacing:.03em;color:var(--faint)}

  .site-footer{margin-top:var(--s-8);border-top:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.012),transparent 40%),var(--ink)}
  .site-footer .wrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--s-4);padding-top:var(--s-6);padding-bottom:var(--s-6);font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.04em;color:var(--faint)}
  .site-footer img{height:34px;width:auto;display:block}
  .site-footer nav{display:flex;flex-wrap:wrap;gap:var(--s-4)}
  .site-footer a{color:var(--muted);text-decoration:none}
  .site-footer a:hover{color:var(--paper)}
</style>
<noscript><style>.reveal,.r{opacity:1!important;transform:none!important;animation:none!important}.badge path{stroke-dashoffset:0!important}.cd-t::after{content:" Min."}</style></noscript>
</head>
<body>
  <div class="bar"><a class="brand" href="/" aria-label="social2scale — zur Startseite"><img src="/assets/s2s-t.webp" alt="social2scale" width="60" height="30"></a></div>

  <main>
    <section class="hero">
      <video class="herovid" autoplay muted loop playsinline poster="/danke/studio/assets/danke-poster.jpg" aria-hidden="true"><source src="/danke/studio/assets/danke-bg.mp4" type="video/mp4"></video>
      <div class="celebrate" aria-hidden="true"></div>
      <div class="wrap">
        <span class="badge">${CHECK_SVG} Zahlung bestätigt</span>
        <h1>${h1}</h1>
        <p class="sub">${p.heroSub}</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="${STUDIO_URL}">Zu deinem Bereich <span class="arr">→</span></a>
          <span class="hint">${p.isAbo ? "Wir haben deine Bestellung — du hörst innerhalb von 24 Stunden persönlich von uns." : "Gutschrift dauert in der Regel nur Sekunden."}</span>
        </div>
      </div>
    </section>

    ${upsellHtml(p)}

    <section class="blk steps-blk" aria-labelledby="steps-h">
      <div class="wrap">
        <span class="eyebrow" id="steps-h">${esc(p.stepsEyebrow || "In 3 Minuten zum ersten Beitrag")}</span>
        <ol class="steps reveal">
${(p.steps || [
  { b: "Studio öffnen", t: "dein Guthaben steht oben rechts." },
  { b: "Thema eingeben", t: "ein Satz reicht. Du bekommst 3 Vorschläge in deiner Markenwelt." },
  { b: "Favorit wählen & feinschleifen", t: "bestätigen, fertig. Caption und Hashtags sind schon dabei." },
]).map((s) => `          <li><span><b>${esc(s.b)}</b> — ${esc(s.t)}</span></li>`).join("\n")}
        </ol>
      </div>
    </section>

    <section class="blk legal-blk">
      <div class="wrap">
        <div class="notecard human"><b>Hinter deinem Studio stehen Menschen.</b> Wir — Sebi &amp; Phil — lesen jede Nachricht selbst. Wenn irgendwas ist oder du dir unsicher bist: <a href="mailto:${SUPPORT_MAIL}">schreib uns</a>, wir antworten persönlich.</div>
        <div class="notecard">${p.isAbo ? `<b>Nichts von uns gehört?</b> Das passiert fast nur, wenn du mit einer anderen E-Mail-Adresse bestellt hast, als wir von dir kennen. Schreib uns kurz an <a href="mailto:${SUPPORT_MAIL}">${SUPPORT_MAIL}</a> — wir melden uns sofort.` : `<b>Guthaben nicht da?</b> Das passiert fast nur, wenn du mit einer anderen E-Mail-Adresse bestellt hast als der deines s2s-Bereichs. Schreib uns kurz an <a href="mailto:${SUPPORT_MAIL}">${SUPPORT_MAIL}</a> — wir ordnen es dir persönlich zu.`}</div>
        <p class="mandatory">Die Abbuchung erfolgt durch Digistore24.${aboLegal}</p>
      </div>
    </section>
  </main>

  <footer class="site-footer"><div class="wrap">
    <a href="/" aria-label="social2scale — zur Startseite"><img src="/assets/s2s-t.webp" alt="social2scale" width="68" height="34"></a>
    <nav aria-label="Rechtliches">
      <a href="/impressum/">Impressum</a>
      <a href="/datenschutz/">Datenschutz</a>
      <a href="mailto:${SUPPORT_MAIL}">Kontakt</a>
    </nav>
    <span>© <span id="yr"></span> social2scale</span>
  </div></footer>

  <script>
    document.getElementById('yr').textContent = new Date().getFullYear();

    // Reveal-on-scroll (dezent, reduced-motion respektiert CSS-seitig)
    (function () {
      var els = document.querySelectorAll('.reveal');
      if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('on'); }); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -60px' });
      els.forEach(function (e) { io.observe(e); });
      setTimeout(function () { els.forEach(function (e) { e.classList.add('on'); }); }, 1200);
    })();

    // E-Mail aus Digistore-Dankesseiten-Parametern an den Upsell-Link
    // weiterreichen → Bestellformular vorbefüllt → Auto-Match im Portal greift.
    (function () {
      var cta = document.getElementById('upsell-cta');
      if (!cta) return;
      try {
        var q = new URLSearchParams(location.search);
        var email = q.get('email') || q.get('buyer_email') || '';
        if (email && cta.href.indexOf('digistore24.com') > -1) {
          var u = new URL(cta.href);
          u.searchParams.set('email', email);
          cta.href = u.toString();
        }
      } catch (_) {}
    })();
${hasCountdown ? `
    // Countdown: ${COUNTDOWN_MINUTES} Min ab erstem Besuch dieser Seite (pro
    // Bestellung, via localStorage). Abgelaufen → Angebot ausblenden,
    // ruhiger Hinweis. Muss mit einer ECHTEN Befristung in Digistore
    // hinterlegt sein (kein Fake-Countdown).
    (function () {
      var MIN = ${COUNTDOWN_MINUTES};
      var q = new URLSearchParams(location.search);
      var key = 's2s_danke_${p.slug}_' + (q.get('order_id') || 'visit');
      var end = 0;
      try { end = Number(localStorage.getItem(key)) || 0; } catch (_) {}
      if (!end) {
        end = Date.now() + MIN * 60 * 1000;
        try { localStorage.setItem(key, String(end)); } catch (_) {}
      }
      var tEl = document.getElementById('cd-t');
      var panel = document.getElementById('offer-panel');
      var expired = document.getElementById('expired');
      function render() {
        var left = Math.max(0, end - Date.now());
        var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
        if (tEl) tEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        if (left <= 0) {
          if (panel) panel.classList.add('is-expired');
          if (expired) expired.hidden = false;
          clearInterval(timer);
        }
      }
      var timer = setInterval(render, 1000);
      render();
    })();` : ""}
  </script>
<script>
  // Seitenaufruf zählen — eigene, cookie-freie Messung (landet direkt im CRM).
  // Auf DIESEN Seiten ist die Zahl der Beleg dafür, dass Digistore die
  // Dankesseiten-URL wirklich ausliefert: 0 Aufrufe bei erfolgten Käufen =
  // URL im Digistore-Produkt nicht (richtig) hinterlegt.
  // Gesendet werden NUR: Pfad, Host der verweisenden Seite, Geräteklasse.
  // Keine Cookies, keine Kennung, keine IP-Speicherung. Fehler bleiben stumm.
  (function () {
    try {
      if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
      var daten = JSON.stringify({
        p: location.pathname,
        r: document.referrer || "",
        d: matchMedia("(max-width:759px)").matches ? "mobil" : "desktop"
      });
      var url = "https://closing.social2scale.com/api/pv";
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([daten], { type: "text/plain;charset=UTF-8" }));
      else fetch(url, { method: "POST", body: daten, headers: { "Content-Type": "text/plain;charset=UTF-8" }, keepalive: true }).catch(function () {});
    } catch (e) { /* Statistik darf die Seite nie stören */ }
  })();
</script>
</body>
</html>
`;
}

// ------------------------------------------------------------
// Build
// ------------------------------------------------------------
let built = 0;
for (const p of [...PRODUCTS, ...BONUS_PRODUCTS, FALLBACK]) {
  const dir = p.slug ? join(ROOT, "danke", "studio", p.slug) : join(ROOT, "danke", "studio");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), pageHtml(p));
  built++;
  console.log("✓", p.slug ? "/danke/studio/" + p.slug + "/" : "/danke/studio/ (Fallback)");
}
console.log("\n" + built + " Seiten generiert. Countdown: " + COUNTDOWN_MINUTES + " Min · Studio: " + STUDIO_URL);
