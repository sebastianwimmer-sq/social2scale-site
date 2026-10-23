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

import { FILM } from './film-daten.js';

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
const UHR = `
                <div class="fs-uhr" data-m="zeit"><span class="fs-ring"></span><p><b>45</b><small>Minuten</small></p></div>`;
const GRUENDER = `<p class="fs-gruender" data-m="beide">${MARKE}<span>einer von zwei Gründern</span></p>`;

const SZENEN = {
  hallo: `
              <div class="fs fs-hallo fs-avatar"></div>`,
  post: `
              <div class="fs fs-post">
                <div class="fs-kopf">
                  <p class="fs-h" data-m="titel">${kw('Deine Vorschau')}</p>
                  <p class="fs-h" data-m="unterwegs">${kw('ist unterwegs.', 'unterwegs.')}</p>
                  <p class="fs-mail" data-m="mail"><span class="fx-mail"></span></p>
                </div>
                <div class="fs-feed fx-feed" data-m="feed"></div>
              </div>`,
  phil: `
              <div class="fs fs-phil">
                <p class="fs-klein" data-m="mehr">Wenn du danach mehr willst</p>
                <div class="fs-kopf">
                  <p class="fs-riesig" data-m="phil">${kw('Phil')}</p>
                  ${GRUENDER}
                </div>${UHR}
                <p class="fs-fuer" data-m="dich">${kw('für dich', 'dich')}</p>
              </div>`,
  kennt: `
              <div class="fs fs-kennt">
                <div class="fs-kopf">
                  <p class="fs-riesig" data-m="phil">${kw('Phil')}</p>
                  ${GRUENDER}
                </div>
                <dl class="fs-antworten" data-m="antworten">
                  <div style="--k:0"><dt>Thema</dt><dd class="fx-thema"></dd></div>
                  <div style="--k:1"><dt>Ziel</dt><dd class="fx-ziel"></dd></div>
                  <div style="--k:2"><dt>Heute</dt><dd class="fx-stand"></dd></div>
                </dl>${UHR}
              </div>`,
  klaeren: `
              <div class="fs fs-klaeren">
                <p class="fs-klein" data-m="klaert">Im Gespräch mit Phil</p>
                <div class="fs-r" data-m="ziel"><p class="fs-r-t">Dein Ziel</p><p class="fs-r-a fx-ziel"></p></div>
                <div class="fs-r" data-m="gruppe"><p class="fs-r-t">Deine Zielgruppe</p><p class="fs-r-a fx-gruppe"></p></div>
                <div class="fs-r" data-m="stand"><p class="fs-r-t">Wo du heute stehst</p><p class="fs-r-a fx-stand"></p></div>
                <div class="fs-weg" data-m="weg">${MARKE}<p>Danach weißt du, welcher <span class="flow">Weg</span> zu dir passt.</p></div>
              </div>`,
  termin: `
              <div class="fs fs-termin fs-avatar"></div>`,
};

/** Ganzer Text des Films zum Nachlesen (barrierefrei, auch ohne Ton und ohne Bild). */
function textZumFilm(d) {
  return d.untertitel.map((c) => c.text).join(' ');
}

/** Markup eines Films; weg = 'a' | 'b'. Inhalte der Szene setzt das Skript als Text. */
export function filmMarkup(weg) {
  const d = FILM[weg];
  if (!d) throw new Error('Film fehlt: ' + weg);
  const szenen = [...new Set(d.abschnitte.map((a) => a.szene))].map((s) => {
    if (!SZENEN[s]) throw new Error('Szene fehlt: ' + s);
    return SZENEN[s];
  }).join('');
  return `
        <figure class="film" data-film="${weg}">
          <div class="film-geraet">
            <div class="film-buehne">
              <video class="film-v" playsinline preload="none" poster="${ASSET_BASE}/film-poster.jpg" src="${ASSET_BASE}/film-${weg}.mp4" aria-label="Film: was dich jetzt erwartet, mit Untertiteln"></video>
              <span class="film-scrim" aria-hidden="true"></span>
              <div class="film-szene" aria-hidden="true">
                <span class="film-licht"></span>
                <div class="fs fs-sperre"><div class="fs-feed fx-feed"></div></div>${szenen}
              </div>
              <span class="film-insel" aria-hidden="true"></span>
              <p class="film-ut" aria-hidden="true"></p>
              <span class="film-ki">KI-generiert</span>
              <button type="button" class="film-start"><span class="film-play" aria-hidden="true"></span><span class="film-start-t"><b>Was dich jetzt erwartet</b><small>${sekunden(d.dauer)} · mit Ton</small></span></button>
              <button type="button" class="film-ton-an" hidden aria-label="Ton an, Film von vorn"><span class="film-lsp" aria-hidden="true"></span>Ton an</button>
              <div class="film-ende" hidden>
                <div class="film-ende-t">
                  ${MARKE}
                  <p class="film-ende-h">Erstgespräch mit Phil</p>
                  <p class="film-ende-s">etwa 45 Minuten, kostenlos</p>
                  <a class="next film-termin" target="_blank" rel="noopener"><span class="lab">Termin aussuchen</span><span class="ic" aria-hidden="true">→</span></a>
                  <button type="button" class="back film-nochmal">Nochmal ansehen</button>
                </div>
              </div>
              <button type="button" class="film-ton" hidden aria-label="Ton aus" aria-pressed="false"></button>
              <button type="button" class="film-pause" hidden aria-label="Pause"></button>
              <span class="film-home" aria-hidden="true"></span>
            </div>
          </div>
          <figcaption>Avatar und Stimme sind KI-generiert. Was sie sagt, kommt von uns. <span class="film-tasten">Leertaste: Pause · M: Ton</span></figcaption>
          <details class="film-text"><summary>Text zum Film</summary><p>${textZumFilm(d)}</p></details>
        </figure>`;
}

export const FILM_STYLE = `
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
  .film:is([data-szene="post"],[data-szene="phil"],[data-szene="kennt"],[data-szene="klaeren"]) .film-licht,.film.fertig .film-licht{opacity:.42}
  .fs{position:absolute;inset:0;opacity:0;font-size:clamp(10px,5cqi,14px);color:var(--ink);transition:opacity .45s var(--e-out);
    transform:scale(calc(1 + var(--p,0) * .045))}
  .fs-avatar{transform:none}
  .fs-sperre{background:#070a0a;transform:none}
  .film:not(.laeuft):not(.fertig):not(.stumm) .fs-sperre{opacity:1}
  .film[data-szene="post"] .fs-post,.film[data-szene="phil"] .fs-phil,.film[data-szene="kennt"] .fs-kennt,
  .film[data-szene="klaeren"] .fs-klaeren{opacity:1}
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

  /* Phil: Name gross, einer von zwei Gruendern, dann die Uhr (45 von 60 Minuten) */
  .fs-phil .fs-kopf,.fs-kennt .fs-kopf{top:27%}
  .fs-riesig{font-family:var(--ff-serif);font-weight:520;font-size:5.4em;line-height:.95;letter-spacing:-.04em}
  .fs-gruender{display:flex;align-items:center;justify-content:center;gap:.55em;margin-top:.7em!important;font-size:.95em;color:var(--muted);
    opacity:0;translate:0 .6em;transition:opacity .5s var(--e-out),translate .7s var(--e-out)}
  .fs-gruender .fs-marke{font-size:1.55em}
  .fs-gruender.an{opacity:1;translate:0 0}
  .fs-phil:has(.fs-uhr.an) .fs-kopf,.fs-kennt:has(.fs-antworten.an) .fs-kopf{translate:0 -46%;scale:.6}
  .fs-phil:has(.fs-uhr.an) .fs-klein{opacity:0;transition:opacity .4s}
  /* verkleinert waere die Zeile unter 8 px: ausblenden statt schrumpfen */
  .fs-phil:has(.fs-uhr.an) .fs-gruender,.fs-kennt:has(.fs-antworten.an) .fs-gruender{opacity:0}
  @property --r{syntax:'<number>';inherits:false;initial-value:0}
  .fs-uhr{position:absolute;left:50%;top:58%;width:9.6em;aspect-ratio:1;translate:-50% -50%;display:grid;place-items:center;opacity:0;scale:.82;
    transition:opacity .5s var(--e-out),scale 1s var(--e-out)}
  .fs-uhr.an{opacity:1;scale:1}
  .fs-ring{position:absolute;inset:0;border-radius:50%;--r:0;transition:--r 1.5s var(--e-out) .15s;
    background:conic-gradient(var(--emerald-soft) 0,var(--teal) calc(var(--r) * 1turn),rgba(242,243,241,.1) 0);
    -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - .5em),#000 calc(100% - .46em));mask:radial-gradient(farthest-side,transparent calc(100% - .5em),#000 calc(100% - .46em))}
  .fs-uhr.an .fs-ring{--r:.75}
  .fs-uhr p{text-align:center}
  .fs-uhr b{display:block;font-family:var(--ff-serif);font-weight:520;font-size:3.5em;line-height:1;letter-spacing:-.04em}
  .fs-uhr small{display:block;font-size:.85em;color:var(--muted);margin-top:.15em}
  .fs-fuer{position:absolute;left:0;right:0;top:75%;text-align:center;font-family:var(--ff-serif);font-weight:480;font-size:1.5em}

  /* Phil kennt ihre Antworten: drei Zeilen ihres Steckbriefs laufen ein, dann die Uhr */
  .fs-antworten{position:absolute;left:9%;right:9%;top:40%;margin:0;display:grid;gap:.75em;transition:opacity .5s var(--e-out),translate .8s var(--e-out)}
  .fs-antworten>div{padding-top:.55em;border-top:1px solid rgba(242,243,241,.14);opacity:0;translate:1.6em 0;
    transition:opacity .5s var(--e-out),translate .8s var(--e-out);transition-delay:calc(var(--k) * .25s)}
  .fs-antworten.an>div{opacity:1;translate:0 0}
  .fs-antworten dt{font-size:.78em;color:var(--faint)}
  .fs-antworten dd{margin:.1em 0 0;font-size:1.02em;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
  .fs-kennt:has(.fs-uhr.an) .fs-antworten{opacity:0;translate:0 -1.5em}

  /* Klaeren: ein Thema nach dem anderen gross, die besprochenen ruecken nach oben;
     am Ende werden die drei zu den drei Balken der Bildmarke */
  .fs-r{position:absolute;left:9%;right:9%;top:42%;transform-origin:0 0;opacity:0;translate:0 1.4em;
    transition:opacity .5s var(--e-out),translate .8s var(--e-out),scale .8s var(--e-out)}
  .fs-r.an{opacity:1;translate:0 0}
  .fs-r.an:has(~ .fs-r.an){opacity:.42;translate:0 -4.6em;scale:.58}
  .fs-r.an:has(~ .fs-r.an ~ .fs-r.an){translate:0 -7.4em}
  .fs-r-a{transition:opacity .4s var(--e-out)}
  .fs-r.an:has(~ .fs-r.an) .fs-r-a{opacity:0}
  .fs-r-t{font-family:var(--ff-serif);font-weight:520;font-size:2.05em;line-height:1.04;letter-spacing:-.025em}
  .fs-r-a{margin-top:.45em!important;font-size:1.02em;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .fs-klaeren:has(.fs-weg.an) .fs-r,.fs-klaeren:has(.fs-weg.an) .fs-klein{opacity:0;scale:.4;translate:0 -2em}
  .fs-weg{position:absolute;left:9%;right:9%;top:30%;display:grid;justify-items:center;gap:1em;text-align:center;opacity:0;transition:opacity .5s var(--e-out)}
  .fs-weg.an{opacity:1}
  .fs-weg .fs-marke{font-size:4.2em}
  .fs-weg p{font-family:var(--ff-serif);font-weight:480;font-size:1.45em;line-height:1.18;text-wrap:balance;opacity:0;translate:0 .6em;transition:opacity .6s var(--e-out) .4s,translate .8s var(--e-out) .4s}
  .fs-weg.an p{opacity:1;translate:0 0}

  .film-ut{position:absolute;left:7%;right:7%;bottom:7.5%;margin:0;text-align:center;font-size:clamp(.8rem,5.2cqi,.98rem);font-weight:600;line-height:1.35;color:#F2F3F1;z-index:3;
    text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 14px rgba(0,0,0,.7);text-wrap:balance;min-height:4.05em;display:flex;align-items:flex-end;justify-content:center}
  .film-ki{position:absolute;top:8.2%;left:6%;z-index:4;font-family:var(--ff-label);font-size:.62rem;font-weight:600;letter-spacing:.04em;padding:.3rem .5rem;border-radius:7px;
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
    .fs-kopf,.fs-gruender,.fs-antworten,.fs-antworten>div,.fs-r,.fs-weg p,.fs-post .fs-feed,.fs-uhr{translate:none!important;scale:none!important;transform:none!important}
    .fs-marke i{transform:skewX(-5deg)!important;transition:none}
    .fs-feed .pv-tile.fx-leer{transition-property:opacity;transform:none!important}
    .fs-ring{transition:none}
    .fs-r.an:has(~ .fs-r.an){opacity:0}
  }
`;

/**
 * Laeuft im selben Skript wie form.js (braucht $, step, zaehlen, buchungsLink). Zeitleiste kommt als JSON.
 * Szene, Untertitel, Zoom und --p folgen video.currentTime; keine eigene Uhr, damit Pause/Springen stimmen.
 * filmZeigen(n) ruft show() auf, auch vor diesem Block (show(0) beim Laden): darum nur DOM, kein FILM.
 */
export const FILM_SCRIPT = `
  function filmZeigen(n){
    const weg=n===11?'a':n===15?'b':'';
    const app=document.querySelector('.app'),stage=document.querySelector('.stage');
    const dev=[document.getElementById('device'),document.getElementById('brief')].find(e=>e&&e.offsetParent);
    const breit=matchMedia('(min-width:900px)').matches;
    const vorher=weg&&dev?dev.getBoundingClientRect():null;
    if(weg)app.dataset.ansicht='film';
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
    const offen='klären wir gemeinsam';
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
    if(!letzte&&a.bis-t<.5){const e=aus((.5-(a.bis-t))/.5);z*=1-.3*e;o=1-e;}
    if(t-a.von<.7){const e=aus((t-a.von)/.7);z*=1.35-.35*e;o=Math.min(o,e*1.6);}
    v.style.transform='scale('+z.toFixed(4)+')';v.style.opacity=o.toFixed(3);
  }
  document.querySelectorAll('.film').forEach(f=>{
    const weg=f.dataset.film,d=FILM[weg],v=f.querySelector('.film-v'),ut=f.querySelector('.film-ut'),
      start=f.querySelector('.film-start'),pause=f.querySelector('.film-pause'),ton=f.querySelector('.film-ton'),
      tonAn=f.querySelector('.film-ton-an'),ende=f.querySelector('.film-ende');
    let raf=0;
    function stand(){
      const t=v.currentTime,a=d.abschnitte.find(x=>t>=x.von&&t<x.bis)||d.abschnitte[d.abschnitte.length-1];
      if(f.dataset.szene!==a.szene)f.dataset.szene=a.szene;
      f.style.setProperty('--p',FILM_RUHIG?'0':Math.min(1,Math.max(0,(t-a.von)/(a.bis-a.von))).toFixed(3));
      const box=f.querySelector('.fs-'+a.szene);
      if(box)box.querySelectorAll('[data-m]').forEach(e=>e.classList.toggle('an',t>=(a.marken[e.dataset.m]??a.von)));
      filmKamera(v,d,a,t);
      const c=d.untertitel.find(x=>t>=x.von&&t<x.bis);const txt=c?c.text:'';
      if(ut.textContent!==txt)ut.textContent=txt;
    }
    function schleife(){stand();if(!v.paused&&!v.ended)raf=requestAnimationFrame(schleife);}
    function tonZeigen(){
      ton.setAttribute('aria-pressed',String(v.muted));ton.setAttribute('aria-label',v.muted?'Ton an':'Ton aus');
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
    v.addEventListener('play',()=>{f.classList.add('laeuft');pause.hidden=false;ton.hidden=false;pause.classList.remove('steht');pause.setAttribute('aria-label','Pause');
      if(document.activeElement===start)pause.focus({preventScroll:true});tonZeigen();cancelAnimationFrame(raf);schleife();});
    v.addEventListener('pause',()=>{pause.classList.add('steht');pause.setAttribute('aria-label','Weiter abspielen');tonZeigen();stand();});
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
`;
