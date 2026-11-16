#!/usr/bin/env node
// ============================================================
// Danke-Seiten des Smart Studios (Token-Pakete und Rundum-Service)
// ------------------------------------------------------------
// Eine Config → 5 statische Seiten unter /danke/studio/…
//   /danke/studio/paket-100/ · paket-250/ · paket-500/ · abo/ · /danke/studio/ (Fallback)
// Nach Änderung:  node scripts/build-danke-studio.mjs  → committen → main = Pages-Deploy.
//
// 16.11.2026 neu im Look von /danke/ (Sebi: „high end clean“, kein generischer KI-Look):
// ein Schirm, die drei Balken aus dem Logo als Hintergrund, eine Handlung. Raus: Feier-Video, Lichtkegel,
// Bonus-Countdown (es gab nie Bonus-Produkte, die Uhr war seit 19.08. abgeschaltet), Etiketten in Versalien,
// Gedankenstriche im Text. Hier landet eine Kundin nach einem Nachkauf im Studio. Das Angebot mit der Uhr
// sitzt am ersten Login im Social Hub (s2s-kunden lib/hub-startguthaben.js), nicht hier.
//
// Digistore: je Produkt diese Seite als Dankesseite hinterlegen. Reale Produkte (Phil, 16.08.):
//   100 Token = 722966 · 250 Token = 722970 · 500 Token = 722971 · Rundum-Service-Abo = 722974.
// Ein Beitrag kostet im Studio 25 Token (s2s-kunden lib/tokens.js › TOKEN_COSTS.post).
// ============================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STUDIO_URL = "https://mein.social2scale.com";
const SUPPORT_MAIL = "info@social2scale.com";
const ABO_URL = "https://www.digistore24.com/product/722974";
const POST_KOSTEN = 25;

const SCHRITTE_TOKEN = [
  { b: "Studio öffnen", t: "Dein Guthaben steht oben rechts." },
  { b: "Thema eingeben", t: "Ein Satz reicht, du bekommst drei Vorschläge." },
  { b: "Favorit wählen", t: "Caption und Hashtags sind schon dabei." },
];
const SCHRITTE_ABO = [
  { b: "Wir melden uns", t: "Innerhalb von 24 Stunden, persönlich." },
  { b: "Dein Studio füllt sich", t: "Laufend fertige Beiträge in deiner Marke." },
  { b: "Du wählst aus", t: "Herz drücken, den Rest übernehmen wir." },
];

const tokenSeite = (n, satz) => ({
  slug: "paket-" + n, titel: n + " Token", tokens: n,
  h1: "Dein Guthaben ist da.",
  sub: `Deine <b class="zahl" data-ziel="${n}">${n}</b> <b>Token</b> sind auf dem Weg in dein Smart Studio, meist in wenigen Sekunden. ${satz}`,
  knopf: "Zum Smart Studio", hinweis: "Guthaben nicht da? Meist wurde mit einer anderen E-Mail-Adresse bestellt. Schreib uns kurz an ",
  schritte: SCHRITTE_TOKEN, abo: true,
});

const SEITEN = [
  tokenSeite(100, `Das reicht für ${100 / POST_KOSTEN} Beiträge.`),
  tokenSeite(250, `Das reicht für ${250 / POST_KOSTEN} Beiträge.`),
  tokenSeite(500, `Das reicht für ${500 / POST_KOSTEN} Beiträge.`),
  {
    slug: "abo", titel: "Rundum-Service",
    h1: "Dein Rundum-Service läuft.",
    sub: "Ab jetzt erstellen wir laufend Beiträge in deiner Marke, du wählst nur noch aus. <b>Wir melden uns innerhalb von 24 Stunden persönlich bei dir.</b>",
    knopf: "Zu deinem Bereich", hinweis: "Nach 24 Stunden nichts gehört? Meist wurde mit einer anderen E-Mail-Adresse bestellt. Schreib uns kurz an ",
    schritte: SCHRITTE_ABO, abo: false, recht: " Dein Abo verlängert sich monatlich und ist jederzeit über Digistore24 kündbar.",
  },
  {
    slug: "", titel: "Guthaben",
    h1: "Dein Guthaben ist unterwegs.",
    sub: "Es landet in deinem Smart Studio, meist in wenigen Sekunden.",
    knopf: "Zum Smart Studio", hinweis: "Guthaben nicht da? Meist wurde mit einer anderen E-Mail-Adresse bestellt. Schreib uns kurz an ",
    schritte: SCHRITTE_TOKEN, abo: false,
  },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const PFEIL = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CSS = `
  :root{color-scheme:dark;
    --grund:#05090C;--linie:rgba(236,240,237,.12);--linie-stark:rgba(236,240,237,.22);
    --tinte:#F1F3F0;--text:#C6CAC5;--leise:#ABAEA8;--emerald:#00B888;--emerald-hell:#3FD9AE;--teal:#1FA6E0;--auf-akzent:#04140F;
    --ff-titel:'Fraunces',Georgia,serif;--ff-text:'Hanken Grotesk',system-ui,sans-serif;--ruhe:cubic-bezier(.2,.7,.2,1)}
  *{box-sizing:border-box;margin:0;padding:0}
  [hidden]{display:none!important}
  html,body{height:100%}
  body{background-color:var(--grund);color:var(--text);font:17px/1.55 var(--ff-text);-webkit-font-smoothing:antialiased}
  a{color:inherit}
  a:focus-visible{outline:2px solid var(--emerald-hell);outline-offset:3px;border-radius:6px}
  .buehne{position:relative;overflow:clip;isolation:isolate;min-height:100%;display:grid;background-color:#050B0C;background-image:linear-gradient(180deg,#07130F,#050B0C 60%,#05090C)}
  .hgb{position:absolute;inset:0;z-index:-1;pointer-events:none;display:flex;align-items:flex-end;justify-content:flex-end;gap:clamp(10px,1.6vw,26px);padding-right:clamp(0px,5vw,96px)}
  .hgb i{width:clamp(64px,11vw,190px);border-radius:16px 16px 0 0;transform-origin:bottom;
    background:linear-gradient(180deg,rgba(63,217,174,.20),rgba(31,166,224,.07) 55%,rgba(31,166,224,.02));box-shadow:inset 0 1px 0 rgba(140,240,210,.35),inset 1px 0 0 rgba(140,240,210,.06);
    animation:wachsen 1.3s var(--ruhe) both}
  .hgb i:nth-child(1){height:34%;animation-delay:.15s}.hgb i:nth-child(2){height:56%;animation-delay:.3s}.hgb i:nth-child(3){height:82%;animation-delay:.45s}
  .seite{display:grid;grid-template-rows:auto 1fr auto;min-height:100%;max-width:1120px;width:100%;margin:0 auto;padding:0 20px}
  .kopf{padding:clamp(12px,2.4vh,22px) 0;display:flex;align-items:center;justify-content:space-between}
  .kopf a{display:inline-flex;align-items:center;min-height:44px}
  .kopf img{height:30px;width:auto;display:block}
  .stand{display:flex;align-items:center;gap:10px;color:var(--emerald-hell);font-weight:600;font-size:15px}
  .balken{display:inline-flex;align-items:flex-end;gap:3px;height:18px}
  .balken i{width:4px;border-radius:2px;background:linear-gradient(180deg,var(--emerald-hell),var(--teal));transform-origin:bottom;animation:wachsen .6s var(--ruhe) both}
  .balken i:nth-child(1){height:7px}.balken i:nth-child(2){height:12px;animation-delay:.12s}.balken i:nth-child(3){height:18px;animation-delay:.24s}
  .mitte{display:grid;align-content:center;justify-items:center;text-align:center;padding:clamp(8px,2vh,28px) 0}
  h1{font:400 clamp(2.6rem,1rem + 7vw,6.25rem)/1 var(--ff-titel);color:var(--tinte);letter-spacing:-.035em;text-wrap:balance;animation:herein .8s var(--ruhe) .1s both}
  .einstieg{margin-top:clamp(12px,2.2vh,22px);max-width:32em;font-size:clamp(1.0625rem,1rem + .35vw,1.25rem);text-wrap:pretty;animation:herein .8s var(--ruhe) .25s both}
  .einstieg b{color:var(--tinte);font-weight:600}
  .einstieg .zahl{font-variant-numeric:tabular-nums lining-nums;background:linear-gradient(100deg,#6FECC8,var(--emerald-hell) 40%,#39B6E6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:var(--emerald-hell)}
  .knopf{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:60px;padding:0 34px;border-radius:12px;font-weight:600;font-size:1.125rem;text-decoration:none;margin-top:clamp(16px,3vh,32px);
    background:var(--emerald);color:var(--auf-akzent);box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 14px 34px -12px rgba(0,184,136,.8);transition:transform .2s var(--ruhe),background-color .2s;animation:herein .8s var(--ruhe) .35s both}
  .knopf:hover{transform:translateY(-2px);background:var(--emerald-hell)}
  .knopf svg{width:20px;height:20px;transition:transform .25s var(--ruhe)}.knopf:hover svg{transform:translateX(4px)}
  .hinweis{margin-top:14px;max-width:32em;font-size:15px;color:var(--leise);animation:herein .8s var(--ruhe) .45s both}
  .hinweis a{display:inline-block;padding:10px 2px;margin:-10px 0;color:var(--text)}
  .wir{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:clamp(14px,2.6vh,26px);font-size:15.5px;text-align:left;animation:herein .8s var(--ruhe) .55s both}
  .wir span{display:flex;flex:none}.wir img{width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #06110E;display:block}.wir picture+picture img{margin-left:-12px}
  .unten{padding-bottom:clamp(10px,2vh,20px);animation:herein .8s var(--ruhe) .65s both}
  .schritte{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px);list-style:none;counter-reset:s}
  .schritte li{position:relative;padding-top:12px}
  .schritte li::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--linie-stark)}
  .schritte li:first-child::after{content:"";position:absolute;left:0;top:0;height:2px;width:100%;background:linear-gradient(90deg,var(--emerald-hell),var(--teal));transform-origin:left;animation:strich .8s var(--ruhe) .9s both}
  .schritte b{display:block;font:400 clamp(1rem,.9rem + .5vw,1.25rem)/1.2 var(--ff-titel);color:var(--tinte)}
  .schritte span{display:block;margin-top:3px;font-size:15px;color:var(--leise)}
  .abo{margin-top:clamp(10px,2vh,18px);font-size:15px;color:var(--text);text-align:center}
  .abo a{display:inline-block;padding:12px 2px;margin:-12px 0;color:var(--emerald-hell);font-weight:600;text-underline-offset:3px}
  .recht{margin-top:clamp(8px,1.6vh,14px);color:var(--leise);font-size:15px;text-align:center}
  .recht a{display:inline-block;padding:12px 2px;margin:-12px 0}
  .recht a:hover,.hinweis a:hover{color:var(--tinte)}
  @keyframes herein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes wachsen{from{transform:scaleY(0)}to{transform:scaleY(1)}}
  @keyframes strich{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
  @media (min-width:900px){.seite{padding:0 56px}}
  @media (max-width:640px){
    .schritte{gap:8px}.schritte li{padding-top:8px}
    .schritte b{font-size:15px;line-height:1.25}.schritte span{display:none}
    .hinweis{margin-top:10px}.abo{margin-top:8px}
    h1{font-size:clamp(2.4rem,12vw,3.2rem)}
    .knopf{width:100%;margin-top:16px}
    .einstieg{font-size:1rem;margin-top:10px}
    .mitte{padding:0}
    .wir{margin-top:12px}
    .hgb{padding-right:0;gap:8px;opacity:.4}.hgb i{width:20vw}.hgb i:nth-child(1){height:12%}.hgb i:nth-child(2){height:20%}.hgb i:nth-child(3){height:30%}
  }
`;

// Die Token-Zahl zählt einmal hoch. Im HTML steht der Endwert: ohne JavaScript und ohne Bewegung bleibt er stehen.
const ZAEHLEN = `<script>
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.querySelectorAll('.zahl[data-ziel]').forEach(function(e){
    var ziel=+e.getAttribute('data-ziel'),t0=null,dauer=900;
    if(!(ziel>0))return;
    function bild(t){if(t0===null)t0=t;var a=Math.min(1,(t-t0)/dauer),w=1-Math.pow(1-a,3);e.textContent=String(Math.round(ziel*w));if(a<1)requestAnimationFrame(bild);}
    e.textContent='0';setTimeout(function(){requestAnimationFrame(bild)},350);
  });
})();
</script>`;

const STATISTIK = `<script>
  // Seitenaufruf zählen — eigene, cookie-freie Messung (landet direkt im CRM).
  // Auf DIESEN Seiten ist die Zahl der Beleg dafür, dass Digistore die
  // Dankesseiten-URL wirklich ausliefert: 0 Aufrufe bei erfolgten Käufen =
  // URL im Digistore-Produkt nicht (richtig) hinterlegt.
  // Gesendet werden NUR: Pfad, Host der verweisenden Seite, Geräteklasse.
  // Keine Cookies, keine Kennung, keine IP-Speicherung. Fehler bleiben stumm.
  (function () {
    try {
      if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
      // Team und Prüfläufe zählen nicht (26.10.2026): einmal ?zaehlen=aus aufrufen, ?zaehlen=an hebt es auf.
      try { var zq = new URLSearchParams(location.search).get("zaehlen"); if (zq === "aus") localStorage.setItem("s2s-zaehlen", "aus"); if (zq === "an") localStorage.removeItem("s2s-zaehlen"); if (localStorage.getItem("s2s-zaehlen") === "aus") return; } catch (e) {}
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
</script>`;

function pageHtml(p) {
  const titel = (p.slug ? "Danke, " + p.titel : "Danke") + " · social2scale";
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Sicherheits-Block (CSP, Referrer-Policy, Rahmenschutz) setzt
     scripts/csp-haerten.mjs nach dem Bau ein — einzige Quelle. -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#07130F">
<title>${esc(titel)}</title>
<meta name="description" content="Deine Zahlung ist bestätigt.">
<link rel="stylesheet" href="/fonts.css">
<style>${CSS}</style>
</head>
<body>
<div class="buehne">
  <div class="hgb" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="seite">
    <header class="kopf"><a href="/" aria-label="social2scale, zur Startseite"><img src="/assets/s2s-t.webp" alt="social2scale" width="60" height="30"></a><p class="stand"><span class="balken" aria-hidden="true"><i></i><i></i><i></i></span>Zahlung bestätigt</p></header>
    <main class="mitte">
      <h1>${esc(p.h1)}</h1>
      <p class="einstieg">${p.sub}</p>
      <a class="knopf" href="${STUDIO_URL}">${esc(p.knopf)}${PFEIL}</a>
      <p class="hinweis">${esc(p.hinweis)}<a href="mailto:${SUPPORT_MAIL}">${SUPPORT_MAIL}</a>.</p>
      <p class="wir"><span aria-hidden="true"><picture><source type="image/webp" srcset="/assets/founder-sebastian-avatar-192.webp"><img src="/assets/founder-sebastian-avatar-192.jpg" alt="" width="40" height="40"></picture><picture><source type="image/webp" srcset="/assets/founder-philipp-avatar-192.webp"><img src="/assets/founder-philipp-avatar-192.jpg" alt="" width="40" height="40"></picture></span>Danke, dass du dabei bist. Sebi &amp; Phil</p>
    </main>
    <footer class="unten">
      <ol class="schritte" aria-label="So geht es weiter">
${p.schritte.map((s) => `        <li><b>${esc(s.b)}</b><span>${esc(s.t)}</span></li>`).join("\n")}
      </ol>
${p.abo ? `      <p class="abo">Lieber gar nicht selbst? Im Rundum-Service erstellen wir laufend für dich, 49 € im Monat, monatlich kündbar. <a href="${ABO_URL}">Ansehen</a></p>\n` : ""}      <p class="recht">Die Abbuchung erfolgt durch Digistore24.${p.recht || ""} <a href="/impressum/">Impressum</a> · <a href="/datenschutz/">Datenschutz</a></p>
    </footer>
  </div>
</div>
${ZAEHLEN}
${STATISTIK}
</body>
</html>
`;
}

let gebaut = 0;
for (const p of SEITEN) {
  const dir = p.slug ? join(ROOT, "danke", "studio", p.slug) : join(ROOT, "danke", "studio");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), pageHtml(p));
  gebaut++;
  console.log("✓", p.slug ? "/danke/studio/" + p.slug + "/" : "/danke/studio/ (Fallback)");
}
console.log("\n" + gebaut + " Seiten gebaut. Danach: node scripts/csp-haerten.mjs");
