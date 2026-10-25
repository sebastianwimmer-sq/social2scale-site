/**
 * Setting-Film nach dem Eintragen (17.10.2026, Sebi: „nach dem eintragen brauchen wir so ne art
 * video und dann kommt er zum erstgespraech durch“, KI-Avatar + KI-Stimme, beide Wege).
 *
 * Bauart „Hybrid“ (Sebi 17.10.: Kosten klein halten, trotzdem high end): Avatar-Clips nur fuer
 * Begruessung und Abschluss, dazwischen zeichnet der Funnel die Szene live ueber das Video.
 * Medien + Zeitleiste: free-content/film/bauen.py → social2scale.com/assets/film-*.mp4, film-daten.js.
 *
 * Runde 3 (17.10.): EIN Geraet (das Vorschau-Telefon wird zum Film), nur echtes Material, Kamera an
 * der Person (Push, Punch-in je Satz, Raus-/Reinzoomen), Toene an denselben Stellen (bauen.py).
 *
 * Runde 4 (Sebi 23.10.: „verzögert nach 5-10 sec nach abschicken automatisch“, „mit leertaste dann
 * wie bei youtube stoppen“, „zwischen slides … sehr flach“, „bild von phil raus kann sich ja mal
 * aktualisieren“, „untertitel … bei allen bereichen … barrierefrei“):
 *  - Startet 6 s nach dem Abschicken von selbst, STUMM (Ton ohne Antippen blockieren alle Browser),
 *    mit Untertiteln; „Ton an“ startet ihn mit Ton von vorn (sie hat den Anfang nur gelesen). Nicht bei reduzierter Bewegung,
 *    Datensparmodus oder wenn der Film nicht im Bild ist (dann, sobald er ins Bild kommt).
 *  - Tastatur wie YouTube: Leertaste/K Pause und weiter, M Ton. Nicht in Eingabefeldern.
 *  - Keine Fotos mehr: Szenen aus Schrift (Fraunces), ihren Antworten, der Bildmarke (drei Balken
 *    People Climb) und der Lichtlinie der Website. Alles laeuft an video.currentTime (--p je
 *    Abschnitt), steht also mit dem Film still und springt mit ihm.
 *  - Untertitel in jeder Szene, dazu der ganze Text zum Nachlesen unter dem Film.
 *
 * KI-Kennzeichnung (AI Act Art. 50, docs/ki-kennzeichnung-ai-act.md): fotorealistischer Avatar
 * mit KI-Stimme → „KI-generiert“ steht sichtbar im Bild, solange der Film zu sehen ist.
 * Aussagen nur, was die Website belegt: zwei Gruender (/about/), etwa 45 Minuten
 * (/wissen/ablauf-zusammenarbeit/, Calendly), kostenlos (Anfrage).
 */

import { FILM as FILM_DE } from './film-daten.js';
import { FILM as FILM_EN } from './film-daten-en.js';

/* Ein Film, zwei Sprachen (Sebi 25.10.: „ja eig soll alles auch so klappen am ende“, #378): gleiche
   Gestaltung, gleiche Zeitleiste-Bauart, nur die Wörter tauschen. Jede Zeichenkette des Films steht hier. */
const FILM_JE = { de: FILM_DE, en: FILM_EN };
const TEXTE = {
  de: {
    vorschau: 'Deine Vorschau', unterwegs: ['ist unterwegs.', 'unterwegs.'], fehlt: ['Was fehlt: der Weg.', 'Weg.'],
    gespraech: 'Im Erstgespräch mit Phil', schritt: ['Dein nächster Schritt.', 'Schritt.'], heute: 'Heute', ziel: 'Dein Ziel',
    gelesen: 'hat deine Antworten gelesen', thema: 'Thema', zielKurz: 'Ziel',
    video: 'Film: was dich jetzt erwartet, mit Untertiteln', ki: 'KI-generiert', start: 'Was dich jetzt erwartet', mitTon: 'mit Ton',
    tonAn: 'Ton an', tonAnLang: 'Ton an, Film von vorn', tonAus: 'Ton aus', pause: 'Pause', weiter: 'Weiter abspielen',
    endeH: 'Hol dir deinen <span class="flow">Plan</span>', endeS: 'Erstgespräch mit Phil, einem der zwei Gründer<br>etwa 45 Minuten · kostenlos',
    termin: 'Termin aussuchen', nochmal: 'Nochmal ansehen',
    unterschrift: 'Avatar und Stimme sind KI-generiert. Was sie sagt, kommt von uns.', tasten: 'Leertaste: Pause · M: Ton',
    nachlesen: 'Text zum Film', offen: 'klären wir gemeinsam',
  },
  en: {
    vorschau: 'Your preview', unterwegs: ['is on its way.', 'way.'], fehlt: ['Missing: the path.', 'path.'],
    gespraech: 'On the intro call with Phil', schritt: ['Your next step.', 'step.'], heute: 'Today', ziel: 'Your goal',
    gelesen: 'has read your answers', thema: 'Topic', zielKurz: 'Goal',
    video: 'Film: what happens next, with subtitles', ki: 'AI-generated', start: 'What happens next', mitTon: 'with sound',
    tonAn: 'Sound on', tonAnLang: 'Sound on, film from the start', tonAus: 'Sound off', pause: 'Pause', weiter: 'Play',
    endeH: 'Get your <span class="flow">plan</span>', endeS: 'Intro call with Phil, one of the two founders<br>about 45 minutes · free',
    termin: 'Pick a time', nochmal: 'Watch again',
    unterschrift: 'The avatar and voice are AI-generated. What she says comes from us.', tasten: 'Space: pause · M: sound',
    nachlesen: 'Transcript', offen: 'we’ll work it out together',
  },
};
/** JS-Zeichenkette in einfachen Anführungszeichen (wie der übrige Skript-Code) */
const sq = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
function sprachDaten(sprache) {
  const d = FILM_JE[sprache], T = TEXTE[sprache];
  if (!d || !T) throw new Error('Sprache fehlt: ' + sprache);
  return { d, T };
}
/* Englische Filme liegen als film-<weg>-en.mp4 daneben (bauen.py --sprache en). */
const DATEI = (weg, sprache) => `film-${weg}${sprache === 'de' ? '' : '-' + sprache}.mp4`;
const POSTER = (sprache) => `film-poster${sprache === 'de' ? '' : '-' + sprache}.jpg`;

const ASSET_BASE = 'https://social2scale.com/assets';

function sekunden(s) {
  const r = Math.round(s);
  return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0');
}

/** Woerter einzeln maskiert einblenden; flow = Verlauf der Marke auf dem betonten Wort. */
function kw(text, flow = '') {
  return text.split(' ').map((w, k) =>
    `<span class="kw"><i style="--k:${k}"${flow.split(' ').includes(w) ? ' class="flow"' : ''}>${w}</i></span>`).join(' ');
}

const MARKE = '<span class="fs-marke" aria-hidden="true"><i></i><i></i><i></i></span>';

/* Der Weg: die ansteigende Linie der Website (hero-linie) als Bild fuer ihren Weg von heute zum
   Ziel. Koordinaten in % der Buehne (x 0-100, y 0-100), Linie und Punkte aus derselben Liste. */
const WEG = [[16, 72], [33, 64.5], [47, 67], [63, 53], [84, 40]];
const WEG_PUNKTE = WEG.map(([x, y]) => `${x},${y}`).join(' ');
function linie(klasse, m) {
  return `<div class="fs-linie ${klasse}"${m}><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${WEG_PUNKTE}"/></svg></div>`;
}
function knoten(m) {
  const [x0] = WEG[0], [x1] = WEG[WEG.length - 1];
  return `<div class="fs-knoten"${m}>${WEG.map(([x, y]) =>
    `<i style="left:${x}%;top:${y}%;--d:${((x - x0) / (x1 - x0)).toFixed(2)}"></i>`).join('')}</div>`;
}
const HEUTE = (T, m) => `<p class="fs-heute"${m}><small>${T.heute}</small><span class="fx-stand"></span></p>`;
const ZIEL = (T, m) => `<p class="fs-ziel-l"${m}><small>${T.ziel}</small><span class="fx-ziel"></span></p>`;
const KARTE = (m) => `<div class="fs-karte"${m}><div class="fs-feed fx-feed"></div></div>`;
const FEST = ' data-fest';

const SZENEN = (T) => ({
  hallo: `
              <div class="fs fs-hallo fs-avatar"></div>`,
  post: `
              <div class="fs fs-post">
                <div class="fs-kopf">
                  <p class="fs-h"><span data-m="titel">${kw(T.vorschau)}</span><br><span data-m="unterwegs">${kw(...T.unterwegs)}</span></p>
                  <p class="fs-mail" data-m="mail"><span class="fx-mail"></span></p>
                </div>
                <div class="fs-feed fx-feed" data-m="feed"></div>
              </div>`,
  // Die Vorschau zeigt den Auftritt, nicht den Weg: ihr Feed wird zur Karte am Startpunkt,
  // der Weg zum Ziel steht nur blass da.
  luecke: `
              <div class="fs fs-luecke">
                ${KARTE(' data-m="auftritt"')}
                <p class="fs-oben" data-m="nicht">${kw(...T.fehlt)}</p>
                ${linie('fs-linie-blass', ' data-m="nicht"')}
                ${knoten(' data-m="nicht"')}
                ${ZIEL(T, ' data-m="ziel"')}
              </div>`,
  // Im Erstgespraech: heute, Ziel, dann zeichnet sich der Weg durch; am Ziel waechst die Bildmarke.
  plan: `
              <div class="fs fs-plan">
                ${KARTE(FEST)}
                <p class="fs-oben" data-m="phil">${kw(T.gespraech)}</p>
                <p class="fs-oben fs-oben-2" data-m="plan">${kw(...T.schritt)}</p>
                ${linie('fs-linie-blass', FEST)}
                ${linie('fs-linie-voll', ' data-m="weg"')}
                ${knoten(' data-m="weg"')}
                ${HEUTE(T, ' data-m="stand"')}
                ${ZIEL(T, ' data-m="ziel"')}
                <span class="fs-gipfel" data-m="plan">${MARKE}</span>
              </div>`,
  // Weg B: Phil hat ihre Antworten gelesen; sie laufen im Takt ein und raeumen dann den Weg frei.
  kennt: `
              <div class="fs fs-kennt">
                <div class="fs-name">
                  <p class="fs-riesig" data-m="phil">${kw('Phil')}</p>
                  <p class="fs-unter" data-m="antworten">${kw(T.gelesen)}</p>
                </div>
                <dl class="fs-antworten">
                  <div data-m="thema"><dt>${T.thema}</dt><dd class="fx-thema"></dd></div>
                  <div data-m="ziel"><dt>${T.zielKurz}</dt><dd class="fx-ziel"></dd></div>
                  <div data-m="stand"><dt>${T.heute}</dt><dd class="fx-stand"></dd></div>
                </dl>
                <i data-m="ende" hidden></i>
              </div>`,
  termin: `
              <div class="fs fs-termin fs-avatar"></div>`,
});

/** Ganzer Text des Films zum Nachlesen (barrierefrei, auch ohne Ton und ohne Bild). */
function textZumFilm(d) {
  return d.untertitel.map((c) => c.text).join(' ');
}

/** Markup eines Films; weg = 'a' | 'b', sprache = 'de' | 'en'. Inhalte der Szene setzt das Skript als Text. */
export function filmMarkup(weg, sprache = 'de') {
  const { d: alle, T } = sprachDaten(sprache), d = alle[weg], sz = SZENEN(T);
  if (!d) throw new Error('Film fehlt: ' + weg);
  const szenen = [...new Set(d.abschnitte.map((a) => a.szene))].map((s) => {
    if (!sz[s]) throw new Error('Szene fehlt: ' + s);
    return sz[s];
  }).join('');
  return `
        <figure class="film" data-film="${weg}">
          <div class="film-geraet">
            <div class="film-buehne">
              <video class="film-v" playsinline preload="none" poster="${ASSET_BASE}/${POSTER(sprache)}" src="${ASSET_BASE}/${DATEI(weg, sprache)}" aria-label="${T.video}"></video>
              <span class="film-scrim" aria-hidden="true"></span>
              <div class="film-szene" aria-hidden="true">
                <span class="film-licht"></span>
                <div class="fs fs-sperre"><div class="fs-feed fx-feed"></div></div>${szenen}
              </div>
              <span class="film-insel" aria-hidden="true"></span>
              <p class="film-ut" aria-hidden="true"></p>
              <span class="film-ki">${T.ki}</span>
              <button type="button" class="film-start"><span class="film-play" aria-hidden="true"></span><span class="film-start-t"><b>${T.start}</b><small>${sekunden(d.dauer)} · ${T.mitTon}</small></span></button>
              <button type="button" class="film-ton-an" hidden aria-label="${T.tonAnLang}"><span class="film-lsp" aria-hidden="true"></span>${T.tonAn}</button>
              <div class="film-ende" hidden>
                <div class="film-ende-t">
                  ${MARKE}
                  <p class="film-ende-h">${T.endeH}</p>
                  <p class="film-ende-s">${T.endeS}</p>
                  <a class="next film-termin" target="_blank" rel="noopener"><span class="lab">${T.termin}</span><span class="ic" aria-hidden="true">→</span></a>
                  <button type="button" class="back film-nochmal">${T.nochmal}</button>
                </div>
              </div>
              <button type="button" class="film-ton" hidden aria-label="${T.tonAus}" aria-pressed="false"></button>
              <button type="button" class="film-pause" hidden aria-label="${T.pause}"></button>
              <span class="film-home" aria-hidden="true"></span>
            </div>
          </div>
          <figcaption>${T.unterschrift} <span class="film-tasten">${T.tasten}</span></figcaption>
          <details class="film-text"><summary>${T.nachlesen}</summary><p>${textZumFilm(d)}</p></details>
        </figure>`;
}

export const FILM_STYLE = `/*FILM:ANFANG*/
  /* Ein Geraet: am Desktop steht der Film dort, wo die Vorschau stand; am Handy weicht die Vorschau */
  .app[data-ansicht="film"] .device,.app[data-ansicht="film"] .disclaimer,.app[data-ansicht="film"] .brief{display:none}
  @media (max-width:899px){.app[data-ansicht="film"] .stage{display:none}}
  .stage>.film{margin:0 auto}
  .film{margin:1.3rem auto .4rem;width:min(272px,72vw,calc((100svh - 64px) * .47));max-width:100%}
  @media (min-width:900px){.stage>.film{width:min(300px,calc((100svh - 150px) * .47))}}
  .film-geraet{position:relative;aspect-ratio:9/19;padding:3.2%;border-radius:15% / 7.2%;transform-origin:50% 50%;
    background:linear-gradient(150deg,#2a3034,#0c0f12 38%,#1b2024 70%,#070909);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),inset 0 0 0 3px #050607,0 40px 80px -36px rgba(0,0,0,.9)}
  .film-buehne{position:relative;width:100%;height:100%;border-radius:12.5% / 5.9%;overflow:clip;container-type:inline-size;background:#070a0a}
  .film-insel{position:absolute;top:2.6%;left:50%;width:31%;height:3.9%;transform:translateX(-50%);border-radius:99px;background:#000;z-index:4}
  .film-home{position:absolute;bottom:1.3%;left:50%;width:36%;height:4px;transform:translateX(-50%);border-radius:99px;background:rgba(242,243,241,.55);z-index:4}
  /* Avatar randlos wie ein Videocall; Zoom setzt das Skript aus der Zeitleiste (transform/opacity) */
  .film-v{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 40%;display:block;transform-origin:50% 36%;will-change:transform}
  .film-scrim{position:absolute;left:0;right:0;bottom:0;height:34%;z-index:2;pointer-events:none;background:linear-gradient(transparent,rgba(4,7,7,.78))}
  .film figcaption{font-size:.8rem;color:var(--muted);margin-top:.7rem;line-height:1.4;text-align:center}
  .film-tasten{display:none}
  @media (hover:hover) and (pointer:fine){.film-tasten{display:block;color:var(--faint);margin-top:.15rem}}
  .film-text{margin-top:.5rem;font-size:.85rem;color:var(--muted);text-align:center}
  .film-text summary{cursor:pointer;display:inline-block;min-height:44px;line-height:44px;padding:0 .4rem;color:var(--ink);text-decoration:underline;text-underline-offset:3px}
  .film-text summary:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:2px;border-radius:6px}
  .film-text p{margin:.3rem 0 0;line-height:1.5;text-align:left}

  /* Buehne der Zwischenszenen: Lichtlinie der Website als Tiefe, sie dreht und naehert sich mit
     dem Abschnitt (--p = 0…1, aus video.currentTime), steht mit dem Film still */
  .film-szene{position:absolute;inset:0;pointer-events:none;overflow:clip}
  .film-licht{position:absolute;inset:-18%;opacity:0;transition:opacity .7s var(--e-out);
    background:url("${ASSET_BASE}/hero-linie-1600.webp") 58% 72%/cover no-repeat;
    transform:rotate(calc(-14deg + var(--p,0) * 10deg)) scale(calc(1.05 + var(--p,0) * .16))}
  .film:is([data-szene="post"],[data-szene="luecke"],[data-szene="plan"],[data-szene="kennt"]) .film-licht,.film.fertig .film-licht{opacity:.42}
  .fs{position:absolute;inset:0;opacity:0;font-size:clamp(10px,5cqi,14px);color:var(--ink);transition:opacity .45s var(--e-out);
    transform:scale(calc(1 + var(--p,0) * .045))}
  .fs-avatar{transform:none}
  .fs-sperre{background:#070a0a;transform:none}
  .film:not(.laeuft):not(.fertig):not(.stumm) .fs-sperre{opacity:1}
  /* Weg B baut keinen Feed: vor dem Start steht dort das Standbild der Frau statt einer leeren Vorlage */
  .film[data-film="b"] .fs-sperre{display:none}
  .film[data-film="b"]:not(.laeuft):not(.fertig) .film-scrim{opacity:1}
  .film[data-szene="post"] .fs-post,.film[data-szene="luecke"] .fs-luecke,.film[data-szene="kennt"] .fs-kennt,
  .film[data-szene="plan"] .fs-plan{opacity:1}
  .fs p{margin:0}
  .fs-klein{position:absolute;left:8%;right:8%;top:17%;font-size:.88em;color:var(--muted);text-align:center}

  /* Woerter steigen einzeln aus einer Maske, im Takt der Stimme */
  .kw{display:inline-block;clip-path:inset(-.15em -.1em -.25em -.1em)}
  .kw>i{display:inline-block;font-style:normal;translate:0 140%;transition:translate .8s var(--e-out);transition-delay:calc(var(--k,0) * 75ms)}
  .an .kw>i,.an.kw>i{translate:0 0}
  .flow{background:var(--flow);-webkit-background-clip:text;background-clip:text;color:transparent}
  /* Bildmarke: drei Balken (People Climb) wachsen von unten */
  .fs-marke{display:inline-flex;align-items:flex-end;gap:.2em;height:1em;flex:none}
  .fs-marke i{display:block;width:.24em;border-radius:.06em;background:var(--emerald-soft);transform:skewX(-5deg) scaleY(0);transform-origin:50% 100%;transition:transform .75s var(--e-spring)}
  .fs-marke i:nth-child(1){height:43%;opacity:.5}
  .fs-marke i:nth-child(2){height:71%;opacity:.78;transition-delay:.09s}
  .fs-marke i:nth-child(3){height:100%;transition-delay:.18s}
  .an .fs-marke i,.film.fertig .film-ende .fs-marke i{transform:skewX(-5deg) scaleY(1)}

  /* Vorschau: Schlagzeile, ihre Adresse, dann steigt ihr Feed aus der Tiefe */
  .fs-post{perspective:600px}
  .fs-kopf{position:absolute;left:8%;right:8%;top:24%;text-align:center;transform-origin:50% 0;transition:translate .9s var(--e-out),scale .9s var(--e-out),opacity .6s var(--e-out)}
  .fs-h{font-family:var(--ff-serif);font-weight:520;font-size:2.35em;line-height:1.02;letter-spacing:-.025em}
  .fs-mail{margin-top:.9em!important;font-size:.92em;color:var(--muted);opacity:0;transition:opacity .5s var(--e-out)}
  .fs-mail.an{opacity:1}
  .fs-mail span{position:relative;display:inline-block;color:var(--ink);font-weight:600;overflow-wrap:anywhere}
  .fs-mail span::after{content:"";position:absolute;left:0;right:0;bottom:-.25em;height:2px;border-radius:2px;background:var(--flow);clip-path:inset(0 100% 0 0);transition:clip-path .9s var(--e-out) .35s}
  .fs-mail.an span::after{clip-path:inset(0 0 0 0)}
  .fs-post:has(.fs-feed.an) .fs-kopf{translate:0 -34%;scale:.58}
  .fs-post:has(.fs-feed.an) .fs-mail{opacity:0}
  .fs-feed{position:absolute;left:0;right:0;top:50%;translate:0 -50%;transform-origin:50% 40%}
  .fs-post .fs-feed{top:36%;translate:none;opacity:0;transform:translateY(38%) rotateX(24deg) scale(.92);transition:opacity .6s var(--e-out),transform 1.1s var(--e-out)}
  .fs-post .fs-feed.an{opacity:1;transform:none}
  .fs-sperre .fs-feed{top:14%;translate:none;opacity:.55}
  .fs-feed .pv{border-radius:0;box-shadow:none;background:transparent}
  .fs-feed .pv-tile.fx-leer{background:color-mix(in oklab,var(--mood) 22%,#0c0c0c);transform:scale(.6);opacity:0;
    transition:opacity .35s var(--e-out),transform .5s var(--e-spring);transition-delay:calc(.45s + var(--i) * .14s)}
  .fs-feed.an .pv-tile.fx-leer{opacity:1;transform:none}
  .fs-sperre .pv-tile.fx-leer{opacity:1;transform:none;background:#0c0c0c}

  /* Karte: ihr Feed schrumpft an den Startpunkt des Wegs (links unten) */
  .fs-karte{position:absolute;left:0;right:0;top:36%;transform-origin:8% 0;transition:transform 1.1s var(--e-out),opacity .6s var(--e-out)}
  .fs-karte .fs-feed{position:static;translate:none}
  .fs-karte .pv-tile.fx-leer{opacity:1;transform:none;transition:none}
  .fs-karte.an,.fs-karte[data-fest]{transform:translateY(21cqi) scale(.36)}
  .fs-plan:has(.fs-heute.an) .fs-karte{opacity:.5}
  .film[data-film="b"] .fs-plan .fs-karte{display:none}
  .fs-oben{position:absolute;left:8%;right:8%;top:17.5%;font-family:var(--ff-serif);font-weight:520;font-size:1.75em;line-height:1.06;letter-spacing:-.02em;transition:opacity .5s var(--e-out)}
  .fs-plan:has(.fs-oben-2.an) .fs-oben:not(.fs-oben-2){opacity:0}

  /* Linie: blass = der Weg, den die Vorschau nicht zeigt; voll = im Gespraech gezeichnet (entlang x) */
  .fs-linie{position:absolute;inset:0}
  .fs-linie svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
  .fs-linie polyline{fill:none;stroke-width:2.4;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}
  .fs-linie-blass polyline{stroke:rgba(242,243,241,.2)}
  .fs-linie-voll polyline{stroke:var(--emerald-soft);stroke-width:3}
  .fs-linie-blass{clip-path:inset(-5% 100% -5% 0);transition:clip-path 1.4s var(--e-out)}
  .fs-linie-voll{clip-path:inset(-5% 100% -5% 0);transition:clip-path 1.9s cubic-bezier(.45,0,.2,1)}
  .fs-linie.an,.fs-linie[data-fest]{clip-path:inset(-5% -5% -5% 0)}
  .fs-knoten i{position:absolute;width:.7em;height:.7em;margin:-.35em 0 0 -.35em;border-radius:50%;background:#070a0a;border:2px solid rgba(242,243,241,.32);
    opacity:0;scale:.4;transition:opacity .4s var(--e-out),scale .6s var(--e-spring),background-color .3s,border-color .3s;transition-delay:calc(var(--d) * 1.4s)}
  .fs-knoten i:first-child,.fs-knoten i:last-child{width:1em;height:1em;margin:-.5em 0 0 -.5em}
  .fs-knoten.an i,.fs-plan .fs-knoten i{opacity:1;scale:1}
  .fs-plan .fs-knoten i{transition-delay:0s}
  .fs-plan .fs-knoten.an i{background:var(--emerald-soft);border-color:var(--emerald-soft);transition-delay:calc(var(--d) * 1.9s)}
  .fs-plan:has(.fs-heute.an) .fs-knoten i:first-child{background:var(--emerald-soft);border-color:var(--emerald-soft);scale:1.25}
  .fs-plan:has(.fs-ziel-l.an) .fs-knoten i:last-child{border-color:var(--emerald-soft);scale:1.25}
  .fs-plan:has(.fs-gipfel.an) .fs-knoten i:last-child{opacity:0}
  /* Beschriftungen an Start und Ziel */
  .fs-heute,.fs-ziel-l{position:absolute;opacity:0;translate:0 .5em;transition:opacity .5s var(--e-out),translate .7s var(--e-out)}
  .fs-heute{left:24%;right:6%;top:calc(72% - .4em)}
  .fs-ziel-l{left:26%;right:8%;top:calc(40% - 4.4em);text-align:right}
  .fs-heute.an,.fs-ziel-l.an,.fs-plan .fs-ziel-l{opacity:1;translate:0 0}
  .film[data-film="b"] .fs-plan .fs-heute{opacity:.55;translate:0 0}
  .film[data-film="b"] .fs-plan .fs-heute.an{opacity:1}
  .fs-heute small,.fs-ziel-l small{display:block;font-size:.76em;color:var(--faint);margin-bottom:.15em}
  .fs-heute span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:.95em;line-height:1.25}
  .fs-ziel-l span{display:inline-block;font-family:var(--ff-serif);font-weight:520;font-size:1.5em;line-height:1.06;letter-spacing:-.02em;transform-origin:100% 100%;transition:scale .7s var(--e-spring)}
  .fs-plan .fs-ziel-l.an span{background:var(--flow);-webkit-background-clip:text;background-clip:text;color:transparent;scale:1.08}
  .fs-gipfel{position:absolute;left:84%;top:40%;translate:-50% -100%;font-size:2.6em;margin-top:.15em;line-height:0}
  .fs-plan:has(.fs-gipfel.an) .fs-ziel-l{translate:0 -1.4em}

  /* Weg B: Phil, dann ihre Antworten im Takt der Stimme; zum Ende raeumen sie den Weg frei */
  .fs-name{position:absolute;left:8%;right:8%;top:14%;display:grid;justify-items:center;gap:.35em;text-align:center}
  .fs-riesig{font-family:var(--ff-serif);font-weight:520;font-size:5em;line-height:1.05;letter-spacing:-.04em;transition:opacity .5s,translate .8s var(--e-out)}
  .fs-unter{font-size:.98em;color:var(--muted);transition:opacity .5s,translate .8s var(--e-out)}
  .fs-antworten{position:absolute;left:9%;right:9%;top:44%;margin:0;display:grid;gap:.75em}
  .fs-antworten>div{padding-top:.55em;border-top:1px solid rgba(242,243,241,.14);opacity:0;translate:1.6em 0;transition:opacity .5s var(--e-out),translate .8s var(--e-out)}
  .fs-antworten>div.an{opacity:1;translate:0 0}
  .fs-antworten dt{font-size:.78em;color:var(--faint)}
  .fs-antworten dd{margin:.1em 0 0;font-size:1.05em;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
  .fs-kennt:has([data-m="ende"].an) .fs-riesig{opacity:0;translate:0 -1em}
  .fs-kennt:has([data-m="ende"].an) .fs-unter,.fs-kennt:has([data-m="ende"].an) .fs-antworten>div{opacity:0;translate:0 -1em}

  /* Uebergang Avatar ↔ Szene: Kreisblende (clip-path auf .film-szene, aus video.currentTime) */
  .film-szene{will-change:clip-path}
  .film:is([data-szene="post"],[data-szene="luecke"],[data-szene="plan"],[data-szene="kennt"]) .film-szene{background:#070a0a}
  /* wo der Weg gezeichnet wird, tritt die Deko-Lichtlinie zurueck (zwei Linien waeren eine zu viel) */
  .film:is([data-szene="luecke"],[data-szene="plan"]) .film-licht{opacity:.12}

  .film-ut{position:absolute;left:7%;right:7%;bottom:7.5%;margin:0;text-align:center;font-size:clamp(.8rem,5.2cqi,.98rem);font-weight:600;line-height:1.35;color:#F2F3F1;z-index:3;
    text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 14px rgba(0,0,0,.7);text-wrap:balance;min-height:4.05em;display:flex;align-items:flex-end;justify-content:center}
  .film-ut-z{display:block;text-wrap:balance}
  /* das gesprochene Wort leuchtet mit (Wortzeiten aus bauen.py), die kommenden stehen schon da */
  .film-ut-z span{opacity:.58;transition:opacity .12s linear}.film-ut-z span.ist{opacity:1}
  .film-ki{position:absolute;top:8.2%;left:6%;z-index:6;font-family:var(--ff-label);font-size:.62rem;font-weight:600;letter-spacing:.04em;padding:.3rem .5rem;border-radius:7px;
    color:#F2F3F1;background:rgba(3,8,13,.62);border:1px solid var(--hair-2)}
  /* Start: eine Taste mit Ton ueber ihrem Feed */
  .film-start{position:absolute;left:5%;right:5%;bottom:6%;z-index:5;display:flex;align-items:center;gap:.7rem;padding:.65rem .75rem;border-radius:16px;cursor:pointer;text-align:left;
    font:inherit;color:#F2F3F1;background:rgba(3,8,13,.86);border:1px solid var(--hair-2);transition:transform .3s var(--e-spring),border-color .3s var(--e-out)}
  .film-start:hover{border-color:rgba(31,201,152,.55)}.film-start:active{transform:scale(.98)}
  .film-start:focus-visible,.film-pause:focus-visible,.film-ton:focus-visible,.film-ton-an:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:3px}
  .film-play{flex:none;width:44px;height:44px;border-radius:50%;background:var(--emerald);position:relative}
  .film-play::after{content:"";position:absolute;left:53%;top:50%;transform:translate(-50%,-50%);border-style:solid;border-width:8px 0 8px 13px;border-color:transparent transparent transparent var(--emerald-ink)}
  .film-start-t{min-width:0}.film-start-t b{display:block;font-size:.95rem;line-height:1.2}.film-start-t small{display:block;font-size:.78rem;color:#BEC0BB;margin-top:2px}
  .film.laeuft .film-start,.film.fertig .film-start{opacity:0;pointer-events:none}
  .film:not(.laeuft):not(.fertig) .film-ut,.film:not(.laeuft):not(.fertig) .film-scrim{opacity:0}
  /* Stumm von selbst gestartet: ein Knopf holt den Ton und faengt von vorn an */
  .film-ton-an{position:absolute;right:calc(5% + 52px);top:7.4%;z-index:5;display:inline-flex;align-items:center;gap:.35rem;min-height:44px;padding:0 .8rem;border-radius:22px;cursor:pointer;
    font:inherit;font-size:.82rem;font-weight:600;white-space:nowrap;color:var(--emerald-ink);background:var(--emerald-soft);border:0;box-shadow:0 10px 30px -10px rgba(0,0,0,.8)}
  .film-ton-an[hidden],.film-ton[hidden],.film-ton-an:not([hidden]) ~ .film-ton{display:none}
  .film-lsp,.film-ton::before{position:relative;display:inline-block;width:6px;height:8px;background:currentColor;border-radius:1px}
  .film-lsp::after,.film-ton::after{content:"";position:absolute;left:3px;top:50%;translate:0 -50%;border-style:solid;border-width:8px 8px 8px 0;border-color:transparent currentColor transparent transparent}
  .film-lsp::after{left:3px;border-width:8px 8px 8px 0}
  .film-lsp{margin-right:9px}
  .film-pause,.film-ton{position:absolute;top:7.4%;right:5%;z-index:5;width:44px;height:44px;border-radius:50%;border:1px solid var(--hair-2);background:rgba(3,8,13,.55);cursor:pointer;color:#F2F3F1}
  .film-ton{right:calc(5% + 52px)}
  .film-ton::before{content:"";position:absolute;left:13px;top:18px}
  .film-ton::after{left:16px;top:22px;translate:none;transform:translateY(-50%)}
  .film-ton[aria-pressed="true"]{background:rgba(3,8,13,.55) linear-gradient(45deg,transparent 47%,#F2F3F1 47%,#F2F3F1 53%,transparent 53%) no-repeat center/24px 24px}
  .film-pause::before,.film-pause::after{content:"";position:absolute;top:15px;width:4px;height:14px;border-radius:1px;background:#F2F3F1}
  .film-pause::before{left:16px}.film-pause::after{right:16px}
  .film-pause.steht::before{left:17px;top:14px;width:0;height:0;border-radius:0;background:none;border-style:solid;border-width:8px 0 8px 12px;border-color:transparent transparent transparent #F2F3F1}
  .film-pause.steht::after{display:none}
  /* Ende: ohne Foto, die Bildmarke waechst, Termin ist der eine naechste Klick */
  .film-ende{position:absolute;inset:0;z-index:5;background:linear-gradient(rgba(7,10,10,.62),rgba(7,10,10,.9) 55%,#070a0a)}
  .film-ende-t{position:absolute;left:8%;right:8%;top:50%;translate:0 -50%;display:grid;justify-items:center;gap:.6rem;text-align:center}
  .film-ende-t .fs-marke{font-size:clamp(2.4rem,17cqi,3.2rem);margin-bottom:.4rem}
  .film-ende[hidden],.film-pause[hidden]{display:none}
  .film-ende-h{margin:0;font-family:var(--ff-serif);font-weight:520;font-size:clamp(1.4rem,11cqi,1.9rem);letter-spacing:-.02em;line-height:1.05;color:var(--ink);text-wrap:balance}
  .film-ende-s{margin:0 0 .5rem;font-size:.88rem;color:var(--muted)}
  .film-ende .next{width:100%;justify-content:center}
  .film.fertig .film-ut{opacity:0}
  @media (prefers-reduced-motion: reduce){
    .fs,.film-licht{transform:none!important}
    .kw>i{translate:none!important;transition:none}
    .fs-kopf,.fs-post .fs-feed,.fs-karte,.fs-heute,.fs-ziel-l,.fs-riesig,.fs-unter,.fs-antworten>div,.fs-ziel-l span{translate:none!important;scale:none!important;transform:none!important}
    .fs-marke i{transform:skewX(-5deg)!important;transition:none}
    .fs-feed .pv-tile.fx-leer{transition-property:opacity;transform:none!important}
    .fs-linie{transition:opacity .4s;clip-path:none!important;opacity:0}.fs-linie.an,.fs-linie[data-fest]{opacity:1}
    .fs-knoten i{transition-delay:0s!important;scale:none!important}
  }
/*FILM:ENDE*/
`;

/**
 * Laeuft im selben Skript wie form.js (braucht $, step, zaehlen, buchungsLink). Zeitleiste kommt als JSON.
 * Szene, Untertitel, Zoom und --p folgen video.currentTime; keine eigene Uhr, damit Pause/Springen stimmen.
 * filmZeigen(n) ruft show() auf, auch vor diesem Block (show(0) beim Laden): darum nur DOM, kein FILM.
 */
export function filmScript(sprache = 'de') {
  const { d: FILM, T } = sprachDaten(sprache);
  return `/*FILM:ANFANG*/
  function filmZeigen(n){
    const weg=n===11?'a':n===15?'b':'';
    const app=document.querySelector('.app'),stage=document.querySelector('.stage');
    const dev=[document.getElementById('device'),document.getElementById('brief')].find(e=>e&&e.offsetParent);
    const breit=matchMedia('(min-width:900px)').matches;
    const vorher=weg&&dev?dev.getBoundingClientRect():null;
    // nur wenn diese Seite einen Film hat (die englische Seite hat keinen, dort bleibt die Vorschau)
    if(weg&&document.querySelector('.film[data-film="'+weg+'"]'))app.dataset.ansicht='film';
    clearTimeout(window.__filmAuto);
    document.querySelectorAll('.film').forEach(f=>{
      if(!f._heim){f._heim=document.createComment('film');f.before(f._heim);}
      const hier=f.dataset.film===weg;
      if(!hier){const v=f.querySelector('.film-v');if(v&&!v.paused)v.pause();if(f.parentNode===stage)f._heim.after(f);return;}
      if(breit&&f.parentNode!==stage)stage.appendChild(f);
      if(!breit&&f.parentNode===stage)f._heim.after(f);
      filmFuellen(f);
      if(vorher)filmMorph(f.querySelector('.film-geraet'),vorher);
      // Sebi 23.10.: „verzögert nach 5-10 sec nach abschicken automatisch“ (stumm, siehe filmAuto)
      const v=f.querySelector('.film-v');if(v&&v.preload==='none')v.preload='auto';
      window.__filmAuto=setTimeout(()=>filmAuto(f),6000);
    });
  }
  // Das Vorschau-Telefon wird zum Film: Start an der alten Stelle und Groesse, dann an den neuen Platz.
  function filmMorph(g,a){
    const b=g.getBoundingClientRect();if(!b.width||!g.animate)return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){g.animate([{opacity:0},{opacity:1}],{duration:300});return;}
    const s=a.width/b.width,dx=a.left+a.width/2-(b.left+b.width/2),dy=a.top+a.height/2-(b.top+b.height/2);
    g.animate([{transform:'translate('+dx+'px,'+dy+'px) scale('+s+')'},{transform:'none'}],{duration:760,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  // Von selbst nur, wenn es niemanden stoert: kein reduzierter Bewegungswunsch, kein Datensparen,
  // Seite sichtbar, Film zur Haelfte im Bild (sonst sobald er ins Bild kommt), noch nie gestartet.
  function filmAuto(f){
    if(!f.isConnected||!f.offsetParent||f._gestartet)return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    if(navigator.connection&&navigator.connection.saveData)return;
    const los=()=>{if(f._gestartet||document.hidden||!f.offsetParent)return;f._abspielen(true);};
    if(!('IntersectionObserver' in window)){los();return;}
    const io=new IntersectionObserver(es=>{if(es.some(e=>e.intersectionRatio>=.5)){io.disconnect();setTimeout(los,600);}},{threshold:[.5]});
    io.observe(f.querySelector('.film-geraet'));
  }
  function filmWerte(){
    const w=g=>{const c=document.querySelector('#'+g+' .chip[aria-pressed=true]');return c?c.textContent.trim():'';};
    const offen=${sq(T.offen)};
    const name=$('#f-name').value.trim();
    return {name:name||'dich',thema:$('#f-thema').value.trim().slice(0,80)||offen,ziel:w('ziel')||offen,stand:w('stand')||offen,gruppe:offen};
  }
  // Ihr Feed im Film ist die Live-Vorschau selbst (Kopie ohne ids), nicht nachgebaut.
  function filmFeed(f){
    const pv=document.querySelector('#device .pv');if(!pv)return;
    f.querySelectorAll('.fx-feed').forEach(box=>{
      const c=pv.cloneNode(true);c.removeAttribute('id');c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
      let i=0;c.querySelectorAll('.pv-tile.empty').forEach(t=>{t.classList.add('fx-leer');t.style.setProperty('--i',i++);});
      box.replaceChildren(c);
    });
  }
  function filmFuellen(f){
    const v=filmWerte();
    ['thema','ziel','stand','gruppe'].forEach(k=>f.querySelectorAll('.fx-'+k).forEach(e=>{e.textContent=v[k];}));
    filmFeed(f);
    const mail=($('#b-mail').value.trim()||$('#f-mail').value.trim());
    f.querySelectorAll('.fx-mail').forEach(e=>{e.textContent=mail;e.parentNode.hidden=!mail;});
    // Weg B: derselbe Buchungslink wie „Termin direkt buchen“ (mit ihren Antworten in a1, PR #62).
    const b=document.getElementById('termin-b');
    f.querySelector('.film-termin').href=(b&&b.href.indexOf('a1=')>0)?b.href:buchungsLink(v.name!=='dich'?v.name:'',mail);
  }
  const FILM=${JSON.stringify(FILM)};
  const FILM_RUHIG=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const aus=x=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3);
  const FILM_IRIS=.6; // wie IRIS in bauen.py (Swish sitzt am Anfang der Blende)
  // Kamera an der Person: langsamer Push, je Satz ein Schnitt-Zoom (nah/weit im Wechsel),
  // am Ende der Begruessung zoomt sie weg in die Szene, der Abschluss zoomt von nah auf.
  function filmKamera(v,d,a,t){
    if(a.art!=='avatar'){v.style.opacity='0';return;}
    if(FILM_RUHIG){v.style.transform='';v.style.opacity='1';return;}
    let z=1.02+.05*((t-a.von)/(a.bis-a.von)),o=1;
    const cs=d.untertitel.filter(c=>c.von>=a.von-.01&&c.von<a.bis);
    let i=-1;cs.forEach((c,k)=>{if(t>=c.von)i=k;});
    if(i>=0){const lv=k=>k%2?1.14:1,e=aus((t-cs[i].von)/.22);z*=lv(i-1<0?0:i-1)+(lv(i)-lv(i-1<0?0:i-1))*e;}
    const letzte=a===d.abschnitte[d.abschnitte.length-1];
    if(!letzte&&a.bis-t<FILM_IRIS){const e=aus((FILM_IRIS-(a.bis-t))/FILM_IRIS);z*=1-.22*e;}
    if(t-a.von<.7){const e=aus((t-a.von)/.7);z*=1.35-.35*e;if(a.von===0)o=Math.min(o,e*1.6);}
    v.style.transform='scale('+z.toFixed(4)+')';v.style.opacity=o.toFixed(3);
  }
  document.querySelectorAll('.film').forEach(f=>{
    const weg=f.dataset.film,d=FILM[weg],v=f.querySelector('.film-v'),ut=f.querySelector('.film-ut'),
      start=f.querySelector('.film-start'),pause=f.querySelector('.film-pause'),ton=f.querySelector('.film-ton'),
      tonAn=f.querySelector('.film-ton-an'),ende=f.querySelector('.film-ende');
    let raf=0;
    const szene=f.querySelector('.film-szene');let cue=null;
    // Kreisblende: am Ende der Begruessung geht die Szene aus der Mitte auf, am Anfang des Abschlusses
    // zieht sie sich in den Zielpunkt des Wegs zusammen und gibt die Frau wieder frei.
    function blende(a,t){
      const i=d.abschnitte.indexOf(a),nach=d.abschnitte[i+1],vor=d.abschnitte[i-1];
      if(FILM_RUHIG||a.art!=='avatar')return [a,''];
      if(nach&&nach.art==='szene'&&t>a.bis-FILM_IRIS)return [nach,'circle('+(aus((t-a.bis+FILM_IRIS)/FILM_IRIS)*150).toFixed(1)+'% at 50% 40%)'];
      if(vor&&vor.art==='szene'&&t<a.von+FILM_IRIS)return [vor,'circle('+((1-aus((t-a.von)/FILM_IRIS))*150).toFixed(1)+'% at 84% 40%)'];
      return [a,''];
    }
    function untertitel(t){
      const c=d.untertitel.find(x=>t>=x.von&&t<x.bis)||null;
      // Woerter als Spans MIT echten Leerzeichen dazwischen (kopierbar, vorlesbar), in einer Zeilenbox
      if(c!==cue){cue=c;const z=document.createElement('span');z.className='film-ut-z';
        if(c)c.text.split(' ').forEach((w,k)=>{if(k)z.append(' ');const s=document.createElement('span');s.textContent=w;z.append(s);});
        ut.replaceChildren(...(c?[z]:[]));}
      if(c&&c.worte&&ut.firstChild)[...ut.firstChild.children].forEach((s,k)=>s.classList.toggle('ist',t>=(c.worte[k]??c.von)));
    }
    function stand(){
      const t=v.currentTime,a=d.abschnitte.find(x=>t>=x.von&&t<x.bis)||d.abschnitte[d.abschnitte.length-1];
      const [s,iris]=blende(a,t);
      if(f.dataset.szene!==s.szene)f.dataset.szene=s.szene;
      if(szene.style.clipPath!==iris)szene.style.clipPath=iris;
      f.style.setProperty('--p',FILM_RUHIG?'0':Math.min(1,Math.max(0,(t-s.von)/(s.bis-s.von))).toFixed(3));
      const box=f.querySelector('.fs-'+s.szene);
      if(box)box.querySelectorAll('[data-m]').forEach(e=>{const m=e.dataset.m;e.classList.toggle('an',t>=(m==='ende'?s.bis-.9:(s.marken[m]??s.von)));});
      filmKamera(v,d,a,t);
      untertitel(t);
    }
    function schleife(){stand();if(!v.paused&&!v.ended)raf=requestAnimationFrame(schleife);}
    function tonZeigen(){
      ton.setAttribute('aria-pressed',String(v.muted));ton.setAttribute('aria-label',v.muted?${sq(T.tonAn)}:${sq(T.tonAus)});
      f.classList.toggle('stumm',v.muted&&!v.paused);tonAn.hidden=!v.muted;
    }
    // stumm=true: von selbst gestartet (Browser erlauben ohne Antippen nur ohne Ton)
    f._abspielen=function(stumm){
      f._gestartet=true;clearTimeout(window.__filmAuto);
      filmFuellen(f);ende.hidden=true;f.classList.remove('fertig');
      v.muted=!!stumm;const p=v.play();
      zaehlen('film-'+weg+(stumm?'-auto':''));
      if(p&&p.catch)p.catch(err=>{console.error('Film startet nicht:',err);f.classList.remove('laeuft','stumm');pause.hidden=true;ton.hidden=true;tonAn.hidden=true;});
      tonZeigen();
    };
    f._umschalten=function(){if(!f._gestartet||v.ended){v.currentTime=0;f._abspielen(false);}else if(v.paused)v.play();else v.pause();};
    f._ton=function(){if(!f._gestartet){f._abspielen(false);return;}v.muted=!v.muted;tonZeigen();};
    start.addEventListener('click',()=>f._abspielen(false));
    tonAn.addEventListener('click',()=>{zaehlen('film-'+weg+'-ton');v.currentTime=0;v.muted=false;if(v.paused)v.play();tonZeigen();pause.focus({preventScroll:true});});
    f.querySelector('.film-nochmal').addEventListener('click',()=>{v.currentTime=0;f._abspielen(false);});
    f.querySelector('.film-termin').addEventListener('click',()=>zaehlen('film-'+weg+'-termin'));
    pause.addEventListener('click',()=>{if(v.paused)v.play();else v.pause();});
    ton.addEventListener('click',()=>f._ton());
    v.addEventListener('play',()=>{f.classList.add('laeuft');pause.hidden=false;ton.hidden=false;pause.classList.remove('steht');pause.setAttribute('aria-label',${sq(T.pause)});
      if(document.activeElement===start)pause.focus({preventScroll:true});tonZeigen();cancelAnimationFrame(raf);schleife();});
    v.addEventListener('pause',()=>{pause.classList.add('steht');pause.setAttribute('aria-label',${sq(T.weiter)});tonZeigen();stand();});
    v.addEventListener('volumechange',tonZeigen);
    v.addEventListener('seeked',stand);
    v.addEventListener('ended',()=>{f.classList.remove('laeuft','stumm');f.classList.add('fertig');pause.hidden=true;ton.hidden=true;tonAn.hidden=true;ende.hidden=false;zaehlen('film-'+weg+'-ende');
      const t=f.querySelector('.film-termin');if(t)t.focus({preventScroll:true});});
  });
  // Tastatur wie bei YouTube (Sebi 23.10.): Leertaste/K Pause und weiter, M Ton.
  // Nie in Feldern und nie auf Knoepfen/Links (dort loest die Leertaste den Knopf selbst aus).
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
    const k=e.key===' '?'k':e.key.toLowerCase();if(k!=='k'&&k!=='m')return;
    if(e.target.closest&&e.target.closest('input,textarea,select,button,a,summary,[contenteditable]'))return;
    const weg=step===11?'a':step===15?'b':'';const f=weg&&document.querySelector('.film[data-film="'+weg+'"]');
    if(!f||!f.offsetParent||!f._umschalten)return;
    e.preventDefault();if(k==='k')f._umschalten();else f._ton();
  });
  matchMedia('(min-width:900px)').addEventListener('change',()=>filmZeigen(step));
/*FILM:ENDE*/`;
}
export const FILM_SCRIPT = filmScript('de');
