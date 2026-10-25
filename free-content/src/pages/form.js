/**
 * Formular-Seite (`GET /`) — portiert 1:1 aus design/prototypes/form.html
 * (abgenommenes Design). Aenderungen ggue. dem Prototyp:
 *  - Fonts kommen aus shell.js (gehostet), hier nicht mehr definiert.
 *  - .photo-Hintergrund + Logo zeigen auf gehostete Assets statt base64.
 *  - Der letzte Schritt sendet echt an POST /api/free-content statt nur
 *    lokal weiterzuschalten (Turnstile-Token, Fehlertext ohne Sackgasse).
 * Alle anderen Interaktionen (Live-Vorschau, Stimmung->Farbwelt,
 * E-Mail-Tippfehler-Vorschlag, Postfach-oeffnen, Responsive-Regeln)
 * unveraendert aus dem Prototyp uebernommen.
 */

import { htmlDoc } from './shell.js';
import { FARB_CHIPS, ERSTGESPRAECH_URL, PHIL, buchungsLink, buchungsNotiz } from '../constants.js';

const ASSET_BASE = 'https://social2scale.com/assets';
const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAAD5FwCxWtZhzGlpX';
// Sprachumschalter wie auf social2scale.com (lib/sprachen.mjs, gleiche Flaggen). Die Seite /en/ ist die
// Uebersetzung DIESER Seite (form-en.js), sie tauscht Ziel und Flagge (Sebi 23.10.2026: „immer beides 1/1“).
export const FLAGGE_EN = '<svg class="sprache-flagge" viewBox="0 0 60 30" width="20" height="12" aria-hidden="true" focusable="false"><path fill="#012169" d="M0 0v30h60V0z"/><path stroke="#fff" stroke-width="6" d="M0 0l60 30m0-30L0 30"/><path stroke="#C8102E" stroke-width="4" d="M0 0l60 30m0-30L0 30"/><path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#C8102E" stroke-width="6" d="M30 0v30M0 15h60"/></svg>';
export const FLAGGE_DE = '<svg class="sprache-flagge" viewBox="0 0 5 3" width="20" height="12" aria-hidden="true" focusable="false"><path fill="#000" d="M0 0h5v1H0z"/><path fill="#D00" d="M0 1h5v1H0z"/><path fill="#FFCE00" d="M0 2h5v1H0z"/></svg>';

const PAGE_STYLE = `
  .app{position:relative;z-index:2;min-height:100dvh;max-width:460px;margin:0 auto;display:flex;flex-direction:column}
  /* Kopfleiste */
  .top{display:flex;align-items:center;gap:12px;padding:1rem 1.25rem .4rem}
  /* dasselbe s2s-Zeichen wie in der Leiste der Website: beim Wechsel springt die Marke nicht (motion-loop 06.10.2026) */
  .wm-logo{height:30px;width:auto;max-width:60px;object-fit:contain;object-position:left center;display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.5))}
  /* Kopf (16.10.2026, Sebi: „die Linie oben sieht verwirrt aus“): vorher Linie + „3/12“, dazu der
     Steckbrief als zweite Fortschrittsanzeige, und 12 widersprach „7 kurze Fragen“. Jetzt drei
     Abschnitte in Worten; die genaue Stelle steht ueber der Frage („Frage 3 von 7“). */
  .phasen{list-style:none;margin:0 0 0 auto;padding:0;display:flex;align-items:center;gap:.25rem;font-family:var(--ff-label);font-size:0.6875rem;font-weight:600;letter-spacing:.06em;color:var(--faint)}
  .phasen li{padding:.3rem .2rem;white-space:nowrap;transition:color var(--dur-2, .24s) ease-out}
  .phasen li+li::before{content:"·";margin-right:.45rem;color:rgba(255,255,255,.22)}
  .phasen li[aria-current="step"]{color:var(--ink)}
  .phasen li.fertig{color:var(--emerald-soft)}
  .app[data-schritt="0"] .phasen{visibility:hidden}
  .sprache{display:inline-flex;align-items:center;gap:.4rem;min-height:44px;min-width:44px;justify-content:center;padding:0 .35rem;margin-left:.15rem;
    color:var(--muted);text-decoration:none;font-family:var(--ff-label);font-size:0.75rem;font-weight:600;letter-spacing:.02em;border-radius:10px;
    transition:color var(--dur-2, .24s) ease-out,background-color var(--dur-2, .24s) ease-out}
  .sprache:hover{color:var(--ink);background:rgba(255,255,255,.06)}
  .sprache:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:2px}
  .sprache-flagge{display:block;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.18)}
  /* Schmale Handys: nur die Flagge, und die Phasen ruecken zusammen — „Check · Ergebnis · Gespräch“
     plus Umschalter lief am iPhone SE sonst 21 px ueber den Rand (funnel-vergleich 23.10.2026). */
  @media (max-width:400px){
    .sprache span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
    .sprache{margin-left:0;padding:0}
    .top{gap:8px}
    .phasen{letter-spacing:.02em}
    .phasen li{padding:.3rem .05rem}
    .phasen li+li::before{margin-right:.3rem}
  }

  /* ── BUEHNE mit schwebendem Glas-iPhone ── */
  .stage{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;perspective:1400px;padding:.4rem 0}
  /* --faint liegt auf dem dunklen Grund bei ~4.3:1 und damit unter AA fuer Text
     dieser Groesse — ausgerechnet beim Satz, der die Erwartung setzt (wie im Reveal). */
  .disclaimer{font-family:var(--ff-body);font-size:.94rem;line-height:1.45;color:var(--muted);text-align:center;max-width:34ch;margin-top:1rem}
  .device{position:relative;width:min(60%,232px);will-change:transform}
  /* Doppelrand: aeussere Metallschale */
  .device .shell{position:relative;border-radius:34px;padding:6px;background:linear-gradient(155deg,#31353c 0%,#15171b 38%,#080a0d 100%);
    box-shadow:0 0 0 .5px rgba(255,255,255,.14), inset 0 1px 1px rgba(255,255,255,.22), inset 0 -1px 2px rgba(0,0,0,.6),
      0 55px 90px -42px rgba(0,0,0,.9), 0 0 70px -16px var(--mood);transition:box-shadow 1.3s var(--e-out)}
  .pv{position:relative;border-radius:28px;overflow:hidden;background:#000;font-family:var(--ff-ios);box-shadow:inset 0 1px 1px rgba(255,255,255,.1)}
  /* Screen-Glare (Glas-Reflexion) */
  .pv::after{content:"";position:absolute;inset:0;z-index:8;pointer-events:none;background:linear-gradient(133deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.03) 18%,transparent 40%)}
  /* Bodenreflexion */
  .device .refl{position:absolute;left:8%;right:8%;bottom:-30px;height:36px;border-radius:50%;background:radial-gradient(ellipse,var(--mood),transparent 72%);opacity:.32;filter:blur(13px);transition:background 1.3s var(--e-out)}
  .pv-bar{display:flex;align-items:center;padding:8px 11px 5px;color:#fff;font-size:0.6562rem;font-weight:700}
  .pv-bar .h{transition:opacity var(--dur-3, .4s)}.pv-bar .dots{margin-left:auto;letter-spacing:1px;opacity:.55}
  .pv-prof{display:flex;align-items:center;gap:11px;padding:2px 11px 7px}
  .pv-av{width:42px;height:42px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.0625rem;color:#04130D;background:linear-gradient(135deg,var(--mood),#0E1319);box-shadow:inset 0 1px 2px rgba(255,255,255,.3);transition:background 1s var(--e-out),transform var(--dur-3, .5s) var(--e-spring)}
  .pv-stats{display:flex;gap:9px;flex:1;justify-content:space-around;color:#fff}
  .pv-stat{text-align:center;white-space:nowrap}.pv-stat b{display:block;font-size:0.6875rem;font-weight:700}.pv-stat span{font-size:7.5px;color:rgba(255,255,255,.65)}
  .pv-meta{padding:0 11px 7px;color:#fff}
  .pv-meta .n{font-size:0.6562rem;font-weight:700;min-height:12px;transition:opacity var(--dur-3, .4s)}
  .pv-meta .b{font-size:9.5px;color:rgba(255,255,255,.8);min-height:11px;line-height:1.3;transition:opacity var(--dur-3, .4s)}
  .pv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5px;background:#000}
  .pv-tile{aspect-ratio:1;position:relative;overflow:hidden;background:#0c0c0c;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;font-family:var(--ff-label);font-weight:600;font-size:6px;line-height:1.15;color:transparent;transition:background var(--dur-4, .8s) var(--e-out),color var(--dur-3, .6s) var(--e-out)}
  .pv-tile.f1{background:var(--mood-t);color:var(--mood-ti)}.pv-tile.f2{background:var(--mood);color:#04130D}.pv-tile.f3{background:#ECECE4;color:#23201C}
  .pv-tile.empty::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.05) 50%,transparent 80%);background-size:220% 100%}
  .pop{animation:pop var(--dur-3, .55s) var(--e-spring)}
  @keyframes pop{0%{transform:scale(.85);opacity:.4;filter:blur(3px)}100%{transform:scale(1);opacity:1;filter:blur(0)}}

  /* ── GLAS-SHEET (Frage) ── */
  .sheet{position:relative;flex:none;margin:0 .5rem .5rem;border-radius:30px 30px 26px 26px;padding:1px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 30%,transparent);box-shadow:0 -20px 50px -30px rgba(0,0,0,.7)}
  .sheet-in{border-radius:29px 29px 25px 25px;background:linear-gradient(180deg,rgba(12,16,20,.72),rgba(7,10,13,.82));-webkit-backdrop-filter:blur(30px) saturate(1.5);backdrop-filter:blur(30px) saturate(1.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.1);padding:1.1rem 1.35rem 1.4rem;min-height:41vh;display:flex;flex-direction:column;justify-content:center}
  .grab{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,.16);margin:0 auto 1.1rem}

  .q{display:none}.q.on{display:block}
  .q.on>*{opacity:0;transform:translateY(14px);filter:blur(6px);animation:rise var(--dur-3, .6s) var(--e-out) forwards}
  .q.on>*:nth-child(1){animation-delay:.02s}.q.on>*:nth-child(2){animation-delay:.09s}.q.on>*:nth-child(3){animation-delay:.16s}.q.on>*:nth-child(4){animation-delay:.23s}.q.on>*:nth-child(5){animation-delay:.3s}
  @keyframes rise{to{opacity:1;transform:none;filter:none}}
  .eyebrow{font-family:var(--ff-label);font-size:0.6875rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--emerald-soft)}
  /* h1 und h2 teilen sich die Gestaltung: der erste Schritt traegt die
     Seitenueberschrift als h1, die weiteren Schritte sind Fragen (h2).
     Ohne h1 hier haette die Seite gar keine — 11 Ueberschriften, alle ab
     h2, was Suchmaschinen und Vorleseprogramme bemaengeln. */
  h1,h2{font-family:var(--ff-serif);font-weight:520;font-size:clamp(1.7rem,1.3rem + 2.6vw,2.3rem);line-height:1.02;letter-spacing:-.025em;margin:.65rem 0 1rem;text-wrap:balance}
  h1 em,h2 em{font-style:italic;font-weight:500;background:var(--flow);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

  /* Doppelrand-Glas-Eingabe */
  .field{border-radius:16px;padding:1px;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.02));transition:background var(--dur-2, .3s) var(--e-out)}
  .field:focus-within{background:linear-gradient(180deg,rgba(0,184,136,.6),rgba(31,166,224,.3))}
  .field-in{position:relative;border-radius:15px;background:linear-gradient(180deg,rgba(16,19,23,.9),rgba(9,11,14,.95));box-shadow:inset 0 1px 1px rgba(255,255,255,.08)}
  .field .pre{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--faint);font-size:1.05rem;pointer-events:none;z-index:1}
  input[type=text],input[type=email],input[type=tel],textarea{width:100%;font-family:var(--ff-body);font-size:1.08rem;color:var(--ink);background:transparent;border:0;padding:15px 16px;outline:none}
  input.hashandle{padding-left:30px}
  textarea{resize:none;min-height:78px;line-height:1.5}
  ::placeholder{color:var(--faint)}
  .chips{display:flex;flex-wrap:wrap;gap:9px}
  .chip{position:relative;font-family:var(--ff-label);font-weight:600;font-size:0.8438rem;color:var(--ink);border:0;border-radius:100px;padding:1px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.02));cursor:pointer;transition:transform var(--dur-2, .3s) var(--e-spring)}
  .chip span{display:block;border-radius:100px;padding:10px 17px;background:linear-gradient(180deg,rgba(18,21,25,.9),rgba(11,13,16,.95));box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:background var(--dur-2, .3s) var(--e-out),color var(--dur-2, .3s)}
  .chip[aria-pressed=true]{background:var(--flow)}
  .chip[aria-pressed=true] span{background:radial-gradient(130% 130% at 0% 0%,color-mix(in oklab,var(--mood) 30%,transparent),rgba(14,17,20,.92) 62%);color:#fff}

  /* Markenfarbe-Chips: kleiner Farbpunkt vor dem Namen */
  .farb-chips .sw{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:9px;vertical-align:-2px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
  .sw-multi{background:conic-gradient(#c2410c,#2563eb,#2f6f5e,#be185d,#c2410c)}
  /* Foto-Upload: runder Vorschau-Slot im gleichen Glas-Look wie die Felder */
  .foto-row{display:flex;align-items:center;gap:14px}
  .foto-drop{display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,rgba(16,19,23,.9),rgba(9,11,14,.95));border:1px dashed rgba(255,255,255,.22);border-radius:16px;padding:12px 18px 12px 12px;cursor:pointer;color:var(--muted);font-family:var(--ff-label);font-weight:600;font-size:0.8438rem;transition:border-color var(--dur-2, .3s),transform var(--dur-2, .3s) var(--e-spring)}
  
  .foto-ph{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.04);border:1.5px dashed rgba(31,201,152,.55);display:block}
  #fotoPrev{width:56px;height:56px;border-radius:50%;object-fit:cover;display:block;box-shadow:0 0 0 2px var(--emerald-soft)}
  .react{margin-top:10px;font-size:.9rem;color:var(--emerald-soft);min-height:20px;display:flex;align-items:center;gap:7px;opacity:0;transform:translateY(4px);transition:opacity var(--dur-2, .3s),transform var(--dur-2, .3s) var(--e-out)}
  .react.show{opacity:1;transform:none}
  .react .tick{display:inline-flex;align-items:center;color:var(--emerald-soft)}
  .react .tick svg{display:block}
  .react.warn{color:#F0C08B}.react.warn b{color:var(--emerald-soft);cursor:pointer;border-bottom:1px solid rgba(0,184,136,.4)}

  .foot{margin-top:1.15rem;display:flex;flex-direction:column;gap:11px}
  /* Magnetischer Button-in-Button */
  /* Hauptknopf wie „Kostenlos starten →“ im Hero (social2scale.com .btn-primary, 16.10.2026):
     Hanken Grotesk 700, Radius 9 px, Verlauf Emerald → Teal, Pfeil als Schriftzeichen. */
  .next{position:relative;text-decoration:none;font-family:var(--ff-body);font-weight:700;font-size:0.9062rem;letter-spacing:.02em;color:var(--emerald-ink);
    background:linear-gradient(135deg,var(--emerald-soft) 0%,var(--emerald) 52%,var(--teal) 100%);border:0;border-radius:9px;padding:6px 24px;min-height:56px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:10px;width:100%;
    box-shadow:0 16px 38px -12px rgba(0,184,136,.6),0 16px 38px -16px rgba(31,166,224,.45),inset 0 1px 0 rgba(255,255,255,.32);transition:transform var(--dur-2, .24s) var(--e-out),box-shadow var(--dur-2, .24s) var(--e-out)}
  .next .lab{padding:9px 0}
  .next:active{transform:scale(.975)}
  .next:disabled{opacity:.6;cursor:not-allowed}
  /* Eigenes Zeichen statt Pfeil im Kreis (16.10.2026, Sebi: „KI-Slop-Icons raus, was Eigenes, das zum
     Design-System passt“): die drei aufsteigenden Balken der Bildmarke „People Climb“ (BRAND.md §8,
     Hoehen 26/42/60, Deckkraft .5/.78/1, skewX −5°), klein gesetzt. */
  .next .ic{font-weight:700;transition:transform var(--dur-2, .24s) var(--e-out)}
  .pk-m i{display:block;width:4px;border-radius:2px;background:currentColor;transform:skewX(-5deg)}
  .pk-m i:nth-child(1){height:6px;opacity:.5}
  .pk-m i:nth-child(2){height:10px;opacity:.78}
  .pk-m i:nth-child(3){height:14px}
  
  .back{background:none;border:0;color:var(--faint);font-family:var(--ff-label);font-weight:600;font-size:0.7812rem;cursor:pointer;align-self:center;padding:0 14px;min-height:44px;transition:color var(--dur-2, .25s)}
  .back:hover{color:var(--muted)}
  .hint{font-family:var(--ff-body);font-size:.94rem;color:var(--faint);text-align:center}
  .consent{display:flex;gap:9px;align-items:flex-start;font-size:.8rem;color:var(--muted);line-height:1.45}
  .consent input{margin-top:2px;accent-color:var(--emerald)}
  .turnstile-wrap{display:flex;justify-content:center}

  .consent a{color:var(--emerald-soft);text-decoration:none;border-bottom:1px solid rgba(0,184,136,.35)}
  .consent-opt{margin-top:8px;font-size:.74rem;opacity:.82;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
  .legal{margin-top:.9rem;text-align:center;font-family:var(--ff-label);font-size:0.625rem;letter-spacing:.06em;color:var(--faint)}
  .legal a{color:var(--muted);text-decoration:none;transition:color var(--dur-2, .2s)}
  .legal a:hover{color:var(--emerald-soft)}
  /* Kurze Screens (SE & Landscape): Handy skaliert, Sheet passt sich an, nichts ueberlappt den Header */
  @media (max-height:780px) and (max-width:520px){ .device{width:min(40vw,140px)} .sheet-in{min-height:auto;padding:.9rem 1.3rem 1.15rem} h2{font-size:1.55rem;margin:.5rem 0 .75rem} .disclaimer{margin-top:.5rem} .foot{margin-top:.85rem} .stage{padding:.1rem 0} }
  @media (max-height:650px) and (max-width:520px){ .device{width:min(33vw,112px)} h1,h2{font-size:1.35rem} }
  /* ── DESKTOP: 2-Spalten statt einer gequetschten Mitte-Spalte. Phone links,
     Formular rechts, breiter, mit Luft. ── */
  @media (min-width:900px){
    .app{max-width:1060px;min-height:100dvh;display:grid;grid-template-columns:1.05fr .95fr;
      grid-template-areas:"top top" "stage sheet";column-gap:4.5rem;row-gap:.5rem;align-content:center;padding:2rem 3rem}
    .top{grid-area:top;padding:0 .25rem 1.4rem}
    .stage{grid-area:stage;align-self:center;padding:0}
    .device{width:min(100%,330px)}
    .disclaimer{max-width:34ch}
    .sheet{grid-area:sheet;align-self:center;margin:0;box-shadow:0 44px 100px -46px rgba(0,0,0,.75)}
    .sheet-in{min-height:auto;padding:2.1rem 2.1rem 2.3rem}
    .grab{display:none}
  }
  /* Ein Funnel, drei Wege (15.10.2026): die erste Frage teilt. Echte Knoepfe, ganze Flaeche tippbar. */
  /* Grosse Bildschirme (16.10.2026, Sebi: am Mac alles groesser, wirkt zusammengedrueckt): Grundgroesse
     und Breite wachsen wie auf der Website (abschluss.css). */
  @media (min-width:1440px){html{font-size:1.125rem}.app{max-width:1240px!important}}
  @media (min-width:1680px){html{font-size:1.2188rem}.app{max-width:1400px!important}}
  .wege{display:grid;gap:9px}
  .mitbringen{display:grid;gap:9px;margin-top:.9rem}
  .mb{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-height:58px;text-align:left;cursor:pointer;border-radius:12px;padding:12px 16px;
    font:inherit;color:var(--ink);background:linear-gradient(180deg,rgba(16,19,23,.85),rgba(9,11,14,.92));border:1px solid rgba(255,255,255,.12);transition:border-color var(--dur-2, .24s) ease-out,background var(--dur-2, .24s) ease-out}
  .mb-t{display:flex;flex-direction:column;gap:2px;min-width:0}.mb-t b{font-weight:600;font-size:1rem}.mb-t small{font-size:.86rem;color:var(--muted);line-height:1.4}
  .mb-s{flex:none;font-family:var(--ff-serif);font-style:italic;font-size:1.05rem;color:var(--faint);opacity:.5;transition:color var(--dur-2, .24s) ease-out,opacity var(--dur-2, .24s) ease-out}
  .mb[aria-pressed="true"]{border-color:rgba(31,201,152,.55);background:linear-gradient(180deg,rgba(0,184,136,.14),rgba(11,13,16,.95))}
  .mb[aria-pressed="true"] .mb-s{color:var(--emerald-soft);opacity:1}
  .mb:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:3px}
  @media (hover:hover) and (pointer:fine){.mb:hover{border-color:rgba(0,184,136,.5)}}
  /* Kurze Handys: die drei Punkte enger, die Erklaersaetze bleiben (sie sind der Grund fuers „passt“) */
  @media (max-height:780px) and (max-width:520px){.q[data-step="18"] .intro{margin:.3rem 0 0;font-size:.95rem}.mitbringen{gap:6px;margin-top:.6rem}.mb{min-height:0;padding:9px 13px}.mb-t small{font-size:.8rem;line-height:1.3}}
  /* iPhone SE (568 px): ohne Antippen lag „Weiter“ 130 px unter dem Falz (besucher-sim 17.10.) — wer
     nichts davon mitbringt, muss trotzdem ohne Suchen weiterkommen. Statuszeile und Einleitung weichen. */
  @media (max-height:700px) and (max-width:520px){.app[data-schritt="18"] .stage{display:none}.q[data-step="18"] .intro{display:none}.q[data-step="18"] h2{margin-bottom:.3rem}}
  /* Steckbrief: ein Blatt, kein Feed. Zeilen erscheinen, sobald sie beantwortet sind. */
  .app[data-ansicht="brief"] .device,.app[data-ansicht="brief"] .disclaimer{display:none}
  .app[data-ansicht="feed"] .brief{display:none}
  .brief{width:min(100%,25rem);position:relative;border-radius:22px;padding:1.6rem 1.7rem 1.5rem;
    background:linear-gradient(160deg,rgba(0,184,136,.10),rgba(31,166,224,.04) 55%,rgba(7,10,13,.55)),rgba(7,10,13,.72);
    border:1px solid rgba(31,201,152,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 40px 80px -40px rgba(0,0,0,.85)}
  .br-kopf{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;font-family:var(--ff-label);font-size:0.6875rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
  .br-eb{color:var(--emerald-soft)}.br-status{color:var(--faint);letter-spacing:.08em}
  .br-name{font-family:var(--ff-serif);font-weight:440;font-size:2.1rem;line-height:1.05;letter-spacing:-.02em;color:var(--ink);margin:.7rem 0 1.1rem;min-height:1.1em;overflow-wrap:anywhere}
  .br-zeilen{margin:0;display:grid}
  .br-zeilen>div.nur-handy{display:none}
  .br-zeilen>div{display:grid;grid-template-columns:8.5rem minmax(0,1fr);gap:.8rem;padding:.62rem 0;border-top:1px solid rgba(255,255,255,.07)}
  .br-zeilen dt{font-size:.82rem;color:var(--faint)}
  .br-zeilen dd{margin:0;font-size:.95rem;line-height:1.4;color:var(--ink);opacity:0;transform:translateY(4px);transition:opacity var(--dur-3, .45s) var(--e-out),transform var(--dur-3, .45s) var(--e-out);overflow-wrap:anywhere}
  .br-zeilen>div:not(.voll) dd::before{content:"";display:block;height:.5em;margin-top:.45em;width:46%;border-radius:4px;background:rgba(255,255,255,.06)}
  .br-zeilen>div:not(.voll) dd{opacity:1;transform:none}
  .br-zeilen>div.voll dd{opacity:1;transform:none}
  .br-stempel{display:none;margin-top:1rem;align-items:center;gap:.6rem;font-family:var(--ff-serif);font-style:italic;font-size:1.5rem;color:var(--emerald-soft)}
  .br-stempel .pk-m{position:static}
  .brief.passt .br-stempel{display:flex}
  .brief.passt{border-color:rgba(31,201,152,.45)}
  @media (prefers-reduced-motion:reduce){.br-zeilen dd{transition:none}}
  /* Handy: eine schmale Leiste mit sechs Segmenten statt Blatt, die Frage braucht den Platz */
  @media (max-width:899px){
    /* Am Handy ist der Steckbrief eine Statuszeile direkt unter dem Kopf, kein schwebendes Element */
    .app[data-ansicht="brief"] .stage{justify-content:flex-start;padding-top:.2rem}
    .brief{width:100%;padding:.75rem 1rem;border-radius:16px;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"name status" "zeilen zeilen";column-gap:.8rem;row-gap:.5rem;align-items:center}
    .br-kopf{display:contents}.br-eb{display:none}.br-status{grid-area:status;justify-self:end;font-size:0.625rem}
    .br-name{grid-area:name;font-size:1.15rem;margin:0}
    .br-zeilen{grid-area:zeilen;grid-template-columns:repeat(8,1fr);gap:4px}
    .br-zeilen>div,.br-zeilen>div.nur-handy{display:block;padding:0;border:0;height:4px;border-radius:2px;background:rgba(255,255,255,.1)}
    .br-zeilen>div.voll{background:var(--emerald-soft)}
    .br-zeilen dt,.br-zeilen dd{display:none}
    .br-stempel{display:none!important}
    .brief.passt .br-status{color:var(--emerald-soft)}
  }
  .intro{font-family:var(--ff-body);font-size:1.02rem;line-height:1.55;color:var(--muted);margin:.7rem 0 .2rem;max-width:38ch}
  .pk{list-style:none;margin:.9rem 0 0;padding:0;display:grid;gap:9px}
  .pk li{position:relative;padding-left:28px;font-size:.98rem;line-height:1.45;color:var(--ink);opacity:0;transform:translateY(6px);transition:opacity var(--dur-2, .3s) var(--e-out),transform var(--dur-2, .3s) var(--e-out)}
  .pk-m{position:absolute;left:2px;top:.28em;display:flex;align-items:flex-end;gap:2.5px;color:var(--emerald-soft)}
  .pk li.an{opacity:1;transform:none}
  .passt-ergebnis{margin-top:1.1rem}
  .passt-ergebnis[hidden]{display:none}
  .weg .empf{display:none;font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--emerald-soft);margin-bottom:2px}
  .weg.ist-empf{border-color:rgba(31,201,152,.55);background:linear-gradient(180deg,rgba(0,184,136,.14),rgba(11,13,16,.95))}
  .weg.ist-empf .empf{display:block}
  @media (prefers-reduced-motion:reduce){.pk li{opacity:1;transform:none;transition:none}}
  /* Ergebnis am Handy: die Vorschau oben weicht, damit Urteil und Wahl auf einen Schirm passen
     (Testkundinnen 16.10.: iPhone SE/15 Pro/Pixel, empfohlener Weg lag unter dem Falz). */
  /* Foto und Farbe sind optional und haben keine Antwort, nach der der Funnel zu „Weiter“ scrollt:
     auf kurzen Handys (iPhone 12 mini 629 px) lag der Knopf 22 px unter dem Falz (besucher-sim 16.10.).
     Der Hinweis unter der Vorschau steht bei jedem Schritt davor schon. */
  @media (max-height:700px) and (max-width:520px){.app[data-schritt="8"] .disclaimer,.app[data-schritt="9"] .disclaimer{display:none}}
  @media (max-width:759px){.app[data-schritt="17"] .stage{display:none}.app[data-schritt="17"] .pk{gap:6px}.app[data-schritt="17"] .pk li{font-size:.94rem}}
  .weg{display:flex;flex-direction:column;gap:2px;text-align:left;width:100%;min-height:58px;cursor:pointer;border-radius:16px;padding:12px 16px;
    font-family:var(--ff-body);color:var(--ink);border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(18,21,25,.9),rgba(11,13,16,.95));
    transition:border-color var(--dur-2, .25s),background var(--dur-2, .25s),transform var(--dur-2, .25s) var(--e-out)}
  .weg b{font-weight:600;font-size:1rem}.weg small{font-size:.86rem;color:var(--muted)}
  
  
  .quer{margin-top:1rem;padding:.75rem .9rem;border-radius:14px;border:1px dashed rgba(0,184,136,.4);font-size:.9rem;color:var(--muted)}
  .quer-b{background:none;border:0;padding:0;min-height:44px;color:var(--emerald-soft);font:600 .9rem var(--ff-body);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  /* Schmales Telefon (iPhone SE): nur die Beitraege-Zahl, sonst wird „Follower“ abgeschnitten. */
  .pv{container-type:inline-size}
  @container (max-width:190px){.pv-stat+.pv-stat,.pv-bar .dots{display:none}}
  /* Kachelschrift waechst mit dem Telefon (Desktop 330 px war sie 6 px). */
  .pv-grid .pv-tile{font-size:max(6px,3.4cqi)}
  .bsp{position:absolute;z-index:9;top:-10px;left:50%;transform:translateX(-50%);font-family:var(--ff-label);font-size:0.6562rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
    color:var(--emerald-ink);background:var(--emerald-soft);border-radius:8px;padding:3px 9px;white-space:nowrap}
  .app:not([data-schritt="0"]) .bsp{display:none}
  /* Erster Schirm auf kurzen Handys: alle drei Wege ueber dem Falz (iPhone SE, Safari ~568 px). */
  @media (max-height:700px) and (max-width:520px){
    .app[data-schritt="0"] .disclaimer,.app[data-schritt="0"] .weg small,.app[data-schritt="0"] .grab{display:none}
    .app[data-schritt="0"] .weg{min-height:46px;padding:9px 14px}
    .app[data-schritt="0"] h1{margin:.35rem 0 .7rem}
  }
  @media (max-height:780px) and (max-width:520px){ .weg{min-height:52px;padding:9px 14px} .weg small{font-size:.8rem} }
  /* Bedienung wie auf social2scale.com (bedienung.css, 16.10.2026): Hover nur mit Maus und ohne
     Sprung (am iPhone blieb translateY nach dem Tippen haengen), Druck sofort, eigener Fokus. */
  @media (hover:hover) and (pointer:fine){
    .chip:hover{background:linear-gradient(180deg,rgba(0,184,136,.45),rgba(31,166,224,.2))}
    .foto-drop:hover{border-color:rgba(0,184,136,.55)}
    .next:hover .ic{transform:translateX(3px)}
    .weg:hover{border-color:rgba(0,184,136,.7);background:linear-gradient(180deg,rgba(0,184,136,.10),rgba(11,13,16,.95))}
  }
  .chip:active,.weg:active,.foto-drop:active{transform:scale(.98);transition-duration:80ms}
  .chip:focus-visible,.weg:focus-visible,.next:focus-visible,.back:focus-visible,.foto-drop:focus-visible,.quer-b:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:3px}
  @media (prefers-reduced-motion:reduce){.q.on>*{opacity:1;transform:none;filter:none}.chip:active,.weg:active,.foto-drop:active{transform:none}}
`;

function pageMarkup(turnstileSiteKey) {
  return `
<div class="app">
  <div class="top">
    <a href="https://social2scale.com/" aria-label="Zur social2scale-Startseite"><img class="wm-logo" src="${ASSET_BASE}/s2s-t.webp" srcset="${ASSET_BASE}/s2s-t.webp 248w, ${ASSET_BASE}/s2s-t-320.webp 320w" sizes="60px" alt="social2scale" width="60" height="30"></a>
    <ol class="phasen" id="phasen" aria-label="Wo du gerade bist">
      <li data-ph="check">Check</li><li data-ph="ergebnis">Ergebnis</li><li data-ph="weg" id="ph-weg">Dein Weg</li>
    </ol>
    <a class="sprache" href="/en/" hreflang="en" lang="en" data-sprache="en" aria-label="English">${FLAGGE_EN}<span>English</span></a>
  </div>

  <div class="stage">
    <!-- Steckbrief (16.10.2026, Sebi: links soll sich etwas aufbauen, aber nicht als Feed; der Feed
         erst, wenn er gewaehlt ist). Was eine Agentur im Erstgespraech anlegt: Zeile fuer Zeile aus
         ihren Antworten, beim Ergebnis der Vermerk „Passt“. Spiegelt nur Eingaben, daher aria-hidden. -->
    <div class="brief" id="brief" aria-hidden="true">
      <div class="br-kopf"><span class="br-eb">Steckbrief</span><span class="br-status" id="br-status">wird angelegt</span></div>
      <div class="br-name" id="br-name">Du</div>
      <dl class="br-zeilen">
        <div data-k="name" class="nur-handy"><dt>Name</dt><dd></dd></div>
        <div data-k="handle"><dt>Instagram</dt><dd></dd></div>
        <div data-k="taetigkeit"><dt>Was du machst</dt><dd></dd></div>
        <div data-k="thema"><dt>Thema</dt><dd></dd></div>
        <div data-k="ziel"><dt>Ziel</dt><dd></dd></div>
        <div data-k="stand"><dt>Heute</dt><dd></dd></div>
        <div data-k="zeit"><dt>Zeit pro Woche</dt><dd></dd></div>
        <div data-k="mitbringen"><dt>Bringst du mit</dt><dd></dd></div>
      </dl>
      <div class="br-stempel" id="br-stempel"><span class="pk-m"><i></i><i></i><i></i></span>Passt</div>
    </div>
    <div class="device" id="device"><span class="bsp">Beispiel</span>
      <div class="shell"><div class="pv">
        <div class="pv-bar"><span class="h" id="pv-handle">dein.profil</span><span class="dots">···</span></div>
        <div class="pv-prof">
          <div class="pv-av" id="pv-av">·</div>
          <div class="pv-stats"><div class="pv-stat"><b id="pv-n">0</b><span>Beiträge</span></div><div class="pv-stat"><b>–</b><span>Follower</span></div><div class="pv-stat"><b>–</b><span>Folgt</span></div></div>
        </div>
        <div class="pv-meta"><div class="n" id="pv-name">&nbsp;</div><div class="b" id="pv-bio">&nbsp;</div></div>
        <div class="pv-grid" id="pv-grid">
          <div class="pv-tile empty"></div><div class="pv-tile empty"></div><div class="pv-tile empty"></div>
          <div class="pv-tile empty"></div><div class="pv-tile empty"></div><div class="pv-tile empty"></div>
        </div>
      </div></div>
      <div class="refl"></div>
    </div>
    <p class="disclaimer" id="disclaimer">Entwurf aus deinen Antworten. Den echten Auftritt bauen wir mit dir.</p>
  </div>

  <div class="sheet"><div class="sheet-in">
    <div class="grab"></div>
    <div id="card">
      <div class="q on" data-step="0">
        <span class="eyebrow">social2scale</span>
        <h1>Passt du zu <em>uns</em>?</h1>
        <p class="intro">Wir sind zu zweit und betreuen jeden Auftritt selbst. Darum schauen wir erst, ob wir dir wirklich helfen können.</p>
        <div class="foot"><button class="next" id="checkStart" data-go="1"><span class="lab">Ja, kurz checken</span><span class="ic" aria-hidden="true">→</span></button></div>
        <p class="hint">8 Fragen · eine Minute · kostenlos</p>
      </div>

      <div class="q" data-step="1">
        <span class="eyebrow">Dein Name</span>
        <h2>Wie dürfen wir dich <em>nennen</em>?</h2>
        <div class="field"><div class="field-in"><input type="text" id="f-name" placeholder="Dein Vorname" autocomplete="given-name" enterkeyhint="next"></div></div>
        <div class="react" id="r-name"></div>
        <div class="foot"><button class="next" data-req="f-name" data-go="2"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="0">Zurück</button></div>
      </div>

      <div class="q" data-step="2">
        <span class="eyebrow">Dein Handle</span>
        <h2>Dein <em>Instagram-Name</em>?</h2>
        <div class="field"><div class="field-in"><span class="pre">@</span><input type="text" id="f-handle" class="hashandle" placeholder="deinname" autocapitalize="off" autocorrect="off" enterkeyhint="next"></div></div>
        <div class="react" id="r-handle"></div>
        <div class="foot"><button class="next" data-req="f-handle" data-go="3"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="1">Zurück</button></div>
      </div>

      <div class="q" data-step="3">
        <span class="eyebrow">Was du machst</span>
        <h2>Was machst du <em>beruflich</em>?</h2>
        <div class="chips" id="taetigkeit" role="group" aria-label="Was du machst">
          <button class="chip" data-taetigkeit="coach" aria-pressed="false"><span>Coach oder Beratung</span></button>
          <button class="chip" data-taetigkeit="direktvertrieb" aria-pressed="false"><span>Direktvertrieb oder Network</span></button>
          <button class="chip" data-taetigkeit="dienstleistung" aria-pressed="false"><span>Studio oder Dienstleistung</span></button>
          <button class="chip" data-taetigkeit="creator" aria-pressed="false"><span>Creator</span></button>
          <button class="chip" data-taetigkeit="anders" aria-pressed="false"><span>Etwas anderes</span></button>
        </div>
        <div class="react" id="r-taetigkeit"></div>
        <div class="foot"><button class="next" data-req="taetigkeit" data-go="4"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="2">Zurück</button></div>
      </div>

      <div class="q" data-step="4">
        <span class="eyebrow">Dein Thema</span>
        <h2>Worum geht’s <em>bei dir</em>?</h2>
        <div class="field"><div class="field-in"><textarea id="f-thema" placeholder="z.B. Yoga & Achtsamkeit für gestresste Berufstätige."></textarea></div></div>
        <div class="react" id="r-thema"></div>
        <div class="foot"><button class="next" data-req="f-thema" data-go="5"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="3">Zurück</button></div>
      </div>

      <div class="q" data-step="5">
        <span class="eyebrow">Dein Ziel</span>
        <h2>Was soll dein Auftritt <em>bewirken</em>?</h2>
        <div class="chips" id="ziel" role="group" aria-label="Dein Ziel">
          <button class="chip" data-ziel="Mehr Anfragen" aria-pressed="false"><span>Mehr Anfragen</span></button>
          <button class="chip" data-ziel="Mehr Sichtbarkeit" aria-pressed="false"><span>Mehr Sichtbarkeit</span></button>
          <button class="chip" data-ziel="Mehr Umsatz" aria-pressed="false"><span>Mehr Umsatz</span></button>
          <button class="chip" data-ziel="Weniger Zeit für Content" aria-pressed="false"><span>Weniger Zeit für Content</span></button>
          <button class="chip" data-ziel="Meine Marke stärken" aria-pressed="false"><span>Meine Marke stärken</span></button>
        </div>
        <div class="react" id="r-ziel"></div>
        <div class="foot"><button class="next" data-req="ziel" data-go="6"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="4">Zurück</button></div>
      </div>

      <div class="q" data-step="6">
        <span class="eyebrow">Wo du stehst</span>
        <h2>Wo stehst du <em>heute</em>?</h2>
        <div class="chips" id="stand" role="group" aria-label="Wo du heute stehst">
          <button class="chip" data-stand="Ganz am Anfang" aria-pressed="false"><span>Ganz am Anfang</span></button>
          <button class="chip" data-stand="Poste unregelmäßig" aria-pressed="false"><span>Poste schon, aber unregelmäßig</span></button>
          <button class="chip" data-stand="Aktiv, will mehr" aria-pressed="false"><span>Aktiv — will aufs nächste Level</span></button>
        </div>
        <div class="react" id="r-stand"></div>
        <div class="foot"><button class="next" data-req="stand" data-go="16"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="5">Zurück</button></div>
      </div>

      <div class="q" data-step="7">
        <span class="eyebrow">Deine Stimmung</span>
        <h2>Welche <em>Stimmung</em> bist du?</h2>
        <div class="chips" id="stimmung" role="group" aria-label="Stimmung">
          <button class="chip" data-mood="ruhig" aria-pressed="false"><span>Ruhig &amp; natürlich</span></button>
          <button class="chip" data-mood="klar" aria-pressed="false"><span>Klar &amp; professionell</span></button>
          <button class="chip" data-mood="warm" aria-pressed="false"><span>Warm &amp; nahbar</span></button>
          <button class="chip" data-mood="mutig" aria-pressed="false"><span>Kraftvoll &amp; mutig</span></button>
        </div>
        <div class="react" id="r-mood"></div>
        <div class="foot"><button class="next" data-req="stimmung" data-go="8"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="17">Zurück</button></div>
      </div>

      <div class="q" data-step="8">
        <span class="eyebrow">Zeig dich</span>
        <h2>Magst du dein <em>Profilbild</em> zeigen?</h2>
        <input type="file" id="f-foto" accept="image/*" style="display:none">
        <div class="foto-row">
          <button type="button" class="foto-drop" id="fotoBtn">
            <span class="foto-ph" id="fotoPh"></span>
            <img id="fotoPrev" alt="" hidden>
            <span class="foto-lab" id="fotoLab">Foto auswählen</span>
          </button>
          <button type="button" class="back" id="fotoWeg" hidden>Entfernen</button>
        </div>
        <p class="hint" style="text-align:left;margin-top:10px">Optional — dein Feed zeigt es dann wie auf Instagram, mit Story-Ring.</p>
        <div class="react" id="r-foto"></div>
        <div class="foot"><button class="next" data-go="9"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="7">Zurück</button></div>
      </div>

      <div class="q" data-step="9">
        <span class="eyebrow">Deine Markenfarbe</span>
        <h2>Hat deine Marke eine <em>Farbe</em>?</h2>
        <div class="chips farb-chips" id="farbe" role="group" aria-label="Markenfarbe">
          ${FARB_CHIPS.map((f) => `<button class="chip farb" data-hex="${f.hex}" aria-pressed="false"><span><i class="sw" style="background:${f.hex}"></i>${f.name}</span></button>`).join('')}
          <button class="chip farb" id="farb-eigene" aria-pressed="false"><span><i class="sw sw-multi"></i>Eigene…</span></button>
        </div>
        <input type="color" id="f-farbe-custom" value="#2f6f5e" aria-label="Eigene Markenfarbe" style="position:absolute;width:0;height:0;opacity:0;pointer-events:none">
        <p class="hint" style="text-align:left;margin-top:10px">Optional — ohne Auswahl wählen wir eine, die zu deiner Stimmung passt.</p>
        <div class="react" id="r-farbe"></div>
        <div class="foot"><button class="next" data-go="10"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="8">Zurück</button></div>
      </div>

      <div class="q" data-step="10">
        <span class="eyebrow">Letzter Schritt</span>
        <h2>Fast fertig — <em>wohin damit</em>?</h2>
        <div class="field"><div class="field-in"><input type="email" id="f-mail" placeholder="dein@email.de" autocomplete="email" autocapitalize="off"></div></div>
        <div class="react" id="r-mail"></div>
        <div class="foot">
          <label class="consent"><input type="checkbox" id="f-consent"><span>Ja, baut mir meine Gratis-Vorschau — und meldet euch dazu bei mir. Es gilt die <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a> — abmelden jederzeit mit einem Klick.</span></label>
          <label class="consent consent-opt"><input type="checkbox" id="f-testimonial"><span>Optional: Ihr dürft meine fertige Vorschau anonym als Beispiel zeigen. Freiwillig — ändert nichts an der Vorschau.</span></label>
          <div class="turnstile-wrap"><div class="cf-turnstile" id="ts-a" data-sitekey="${turnstileSiteKey}" data-theme="dark"></div></div>
          <button class="next" id="btnSubmit" data-req="f-mail"><span class="lab">Meinen Feed bauen</span><span class="ic" aria-hidden="true">→</span></button>
          <button class="back" data-go="9">Zurück</button>
        </div>
      </div>

      <div class="q" data-step="11">
        <span class="eyebrow">Fast geschafft</span>
        <h2>Schau in dein <em>Postfach</em>, <span id="echo">…</span>.</h2>
        <p class="hint" style="text-align:left;font-size:.92rem;color:var(--muted);margin-bottom:.2rem">Ein Bestätigungs-Link ist unterwegs. Ein Klick — und dein Feed oben wird live fertig gebaut.</p>
        <div class="foot"><a class="next" id="openmail" target="_blank" rel="noopener"><span class="lab">Postfach öffnen</span><span class="ic" aria-hidden="true">→</span></a><button class="back" id="resend">Mail nicht angekommen? Nochmal schicken</button><button class="back" data-go="10">E-Mail ändern</button></div>
        <p class="quer">Lieber direkt mit jemandem reden? <button type="button" class="quer-b" data-quer="b">Erstgespräch anfragen</button></p>
      </div>

      <div class="q" data-step="12">
        <span class="eyebrow">Betreuung</span>
        <h2>Welcher <em>Rahmen</em> passt im Monat?</h2>
        <div class="chips" id="budget" role="group" aria-label="Rahmen im Monat">
          <button class="chip" data-budget="unter 1.000 €" aria-pressed="false"><span>unter 1.000 €</span></button>
          <button class="chip" data-budget="1.000–3.000 €" aria-pressed="false"><span>1.000–3.000 €</span></button>
          <button class="chip" data-budget="3.000 €+" aria-pressed="false"><span>3.000 €+</span></button>
          <button class="chip" data-budget="Noch unklar" aria-pressed="false"><span>Noch unklar</span></button>
        </div>
        <div class="react" id="r-budget"></div>
        <div class="foot"><button class="next" data-req="budget" data-go="13"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="17">Zurück</button></div>
      </div>

      <div class="q" data-step="13">
        <span class="eyebrow">Betreuung</span>
        <h2>Wann willst du <em>starten</em>?</h2>
        <div class="chips" id="start" role="group" aria-label="Start">
          <button class="chip" data-start="Sofort" aria-pressed="false"><span>Sofort</span></button>
          <button class="chip" data-start="In 1–3 Monaten" aria-pressed="false"><span>In 1–3 Monaten</span></button>
          <button class="chip" data-start="Erst informieren" aria-pressed="false"><span>Erst mal informieren</span></button>
        </div>
        <div class="react" id="r-start"></div>
        <div class="foot"><button class="next" data-req="start" data-go="14"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="12">Zurück</button></div>
      </div>

      <div class="q" data-step="14">
        <span class="eyebrow">Letzter Schritt</span>
        <h2>Wie erreicht Phil <em>dich</em>?</h2>
        <div class="field"><div class="field-in"><input type="email" id="b-mail" placeholder="dein@email.de" autocomplete="email" autocapitalize="off"></div></div>
        <div class="field" style="margin-top:9px"><div class="field-in"><input type="tel" id="b-tel" placeholder="Telefon für den Rückruf" autocomplete="tel" inputmode="tel" maxlength="40"></div></div>
        <div class="react" id="r-b"></div>
        <div class="foot">
          <label class="consent"><input type="checkbox" id="b-consent"><span>Ich habe die <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen und bin einverstanden.</span></label>
          <div class="turnstile-wrap"><div class="cf-turnstile" id="ts-b" data-sitekey="${turnstileSiteKey}" data-theme="dark"></div></div>
          <button class="next" id="btnAnfrage"><span class="lab">Erstgespräch anfragen</span><span class="ic" aria-hidden="true">→</span></button>
          <button class="back" data-go="13">Zurück</button>
        </div>
      </div>

      <div class="q" data-step="15">
        <span class="eyebrow">Anfrage ist da</span>
        <h2>Danke, <span id="echo-b">…</span>. Phil meldet sich <em>persönlich</em>.</h2>
        <p class="hint" style="text-align:left;font-size:.92rem;color:var(--muted)">Mit deinen Antworten kennt er dein Thema schon vor dem Gespräch. Lieber gleich einen festen Termin? Such ihn dir selbst aus.</p>
        <div class="foot"><a class="next" id="termin-b" href="${ERSTGESPRAECH_URL}" target="_blank" rel="noopener"><span class="lab">Termin direkt buchen</span><span class="ic" aria-hidden="true">→</span></a><p class="hint">Oder Phil ruft dich an. Direkt erreichst du ihn unter <a href="tel:${PHIL.telHref}" style="color:var(--ink);font-weight:600;white-space:nowrap">${PHIL.tel}</a>.</p></div>
        <p class="quer">Bis dahin: <button type="button" class="quer-b" data-quer="a">deine Gratis-Vorschau bauen</button> (Stimmung, Foto, Farbe).</p>
      </div>

      <div class="q" data-step="16">
        <span class="eyebrow">Deine Zeit</span>
        <h2>Wie viel Zeit hast du pro Woche für <em>Social Media</em>?</h2>
        <div class="chips" id="zeit" role="group" aria-label="Zeit pro Woche">
          <button class="chip" data-zeit="kaum" aria-pressed="false"><span>Kaum</span></button>
          <button class="chip" data-zeit="1-3" aria-pressed="false"><span>1–3 Stunden</span></button>
          <button class="chip" data-zeit="mehr" aria-pressed="false"><span>Mehr als 3 Stunden</span></button>
        </div>
        <div class="react" id="r-zeit"></div>
        <div class="foot"><button class="next" data-req="zeit" data-go="18"><span class="lab">Weiter</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="6">Zurück</button></div>
      </div>

      <div class="q" data-step="17">
        <span class="eyebrow" id="passt-eb">Wir schauen kurz</span>
        <ul class="pk" id="passt-punkte" aria-live="polite"></ul>
        <div class="passt-ergebnis" id="passt-ergebnis" hidden>
          <h2 id="passt-h"></h2>
          <p class="intro" id="passt-p">Dein Platz ist freigeschaltet. Wie soll es weitergehen?</p>
          <div class="wege" id="passt-wege" role="group" aria-label="Wie es weitergeht">
            <button class="weg" data-weg="a"><span class="empf">Unsere Empfehlung</span><b>Ja, zeig mir meine Vorschau</b><small>So kann mein Auftritt aussehen · gratis, in 60 Sekunden</small></button>
            <button class="weg" data-weg="b"><span class="empf">Unsere Empfehlung</span><b>Ja, ich will mit Phil sprechen</b><small>Erstgespräch · Phil kennt deine Antworten schon</small></button>
          </div>
        </div>
        <div class="foot"><button class="back" data-go="18">Zurück</button></div>
      </div>
      <!-- Commitment (16.10.2026, Sebi: „mehr Bestaetigung bzw. Commitment holen“). Die drei Punkte sind
           die echten Voraussetzungen von /ablauf/ („Was wir von dir brauchen“), woertlich. Keine harte
           Grenze: wer nicht alles antippt, kommt weiter; das Ergebnis sagt ehrlich, was offen ist. -->
      <div class="q" data-step="18">
        <span class="eyebrow">Was du mitbringst</span>
        <h2>Was du <em>mitbringst</em></h2>
        <p class="intro">Damit es läuft, brauchen wir drei Dinge von dir. Tipp an, was für dich passt.</p>
        <div class="mitbringen" id="mitbringen" role="group" aria-label="Was du mitbringst">
          <button class="mb" type="button" data-mb="Briefing-Zeit" aria-pressed="false"><span class="mb-t"><b>Eine halbe Stunde</b><small>Das Briefing im ersten Monat. Danach nur noch, wenn du mitreden willst.</small></span><span class="mb-s">passt</span></button>
          <button class="mb" type="button" data-mb="Zugang" aria-pressed="false"><span class="mb-t"><b>Zugang zum Account</b><small>Bestehendes Profil oder wir legen eines an. Die Rechte bleiben bei dir. Immer.</small></span><span class="mb-s">passt</span></button>
          <button class="mb" type="button" data-mb="Bilder" aria-pressed="false"><span class="mb-t"><b>Bildmaterial</b><small>Was da ist, reicht meist. Wenn nicht, organisieren wir einen Foto-Termin.</small></span><span class="mb-s">passt</span></button>
        </div>
        <div class="react" id="r-mb"></div>
        <div class="foot"><button class="next" data-go="17"><span class="lab">Ergebnis zeigen</span><span class="ic" aria-hidden="true">→</span></button><button class="back" data-go="16">Zurück</button></div>
      </div>
    </div>
    <p class="legal"><a href="https://social2scale.com/">Startseite</a> · <a href="https://social2scale.com/impressum/" target="_blank" rel="noopener">Impressum</a> · <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutz</a></p>
  </div></div>
</div>`;
}

// Live-Vorschau, Stimmung->Farbwelt, E-Mail-Tippfehler-Vorschlag, Postfach-oeffnen,
// Bokeh/Parallaxe: 1:1 aus dem Prototyp. Nur der letzte "Weiter"-Klick (Schritt 5)
// wurde von reiner Navigation auf einen echten POST /api/free-content umgestellt.
const PAGE_SCRIPT = `
  const $=(s)=>document.querySelector(s), qs=[...document.querySelectorAll('.q')];
  let step=0;
  // Dieselben Funktionen wie in der Bestaetigungsmail (constants.js), als Quelltext eingesetzt.
  const ERSTGESPRAECH_URL='${ERSTGESPRAECH_URL}';
  const NOTIZ_MAX=600,NOTIZ_LABEL={de:{goal:'Ziel',business:'Business',status:'Stand',budget:'Rahmen',start:'Start',phone:'Rückruf'}},WAHL_EN={};
  const buchungsNotiz=${buchungsNotiz.toString()};
  const buchungsLink=${buchungsLink.toString()};
  // „Passt du zu uns?“ (16.10.2026, Sebi: die Leute sollen nicht direkt eintragen, sondern erst
  // schauen, ob sie zu uns passen). Echte Knappheit, keine erfundene: zwei Leute, Phil entscheidet
  // im Erstgespraech. Keine Warteschlangen-Zahl, kein Countdown (UWG §5, Anhang Nr. 7).
  // Ablauf: 0 Einstieg → 1–6 + 16 Check → 17 Ergebnis mit Wahl → A Vorschau (7–11) | B Betreuung (12–15).
  let WEG='',VORWAHL='';
  // Drei Abschnitte; je Abschnitt eine eigene Zaehlung, die nie springt.
  const CHECK=[1,2,3,4,5,6,16,18],WEG_A=[7,8,9,10],WEG_B=[12,13,14];
  function phaseZeigen(n){
    if(n===18)mbGesehen=true;
    const ph=CHECK.includes(n)?'check':n===17?'ergebnis':n===0?'':'weg';
    const reihe=['check','ergebnis','weg'];
    $('#ph-weg').textContent=WEG==='a'?'Vorschau':WEG==='b'?'Gespräch':'Dein Weg';
    document.querySelectorAll('#phasen li').forEach(li=>{const i=reihe.indexOf(li.dataset.ph),j=reihe.indexOf(ph);
      if(li.dataset.ph===ph)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');
      li.classList.toggle('fertig',j>i||n===11||n===15);});
    const eb=qs[n].querySelector('.eyebrow');if(!eb)return;
    if(!eb.dataset.alt)eb.dataset.alt=eb.textContent;
    const stelle=(liste,wort)=>wort+' '+(liste.indexOf(n)+1)+' von '+liste.length;
    eb.textContent=CHECK.includes(n)?stelle(CHECK,'Frage'):WEG_A.includes(n)?stelle(WEG_A,'Vorschau · Schritt'):WEG_B.includes(n)?stelle(WEG_B,'Gespräch · Schritt'):eb.dataset.alt;
  }
  const START=Date.now();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOODS={
    ruhig:{a:'#5FA88C',t:'#1B2C24',ti:'#E7EFE9',word:'ruhig & natürlich'},
    klar:{a:'#1FA6E0',t:'#123244',ti:'#EAF4F8',word:'klar & professionell'},
    warm:{a:'#D98A5A',t:'#2B1D14',ti:'#F3E6DC',word:'warm & nahbar'},
    mutig:{a:'#E4573C',t:'#2A1310',ti:'#F6E4DF',word:'kraftvoll & mutig'}
  };
  // Trichter ohne Kennung: je Seitenaufruf meldet jeder Schritt sich EINMAL als
  // virtueller Pfad (keine Eingaben, kein Cookie) — wie das Anfrage-Formular. Bis 12.10.2026
  // zaehlte die Vorschau gar nichts. Pfade muessen zu VORSCHAU_TRICHTER im Portal passen.
  const GEZAEHLT=new Set();
  // Der englische Funnel (/en/, dieselbe Seite uebersetzt) meldet dieselben Schritte unter /en/ —
  // eigener Trichter im CRM (siteviews.js VORSCHAU_EN, Ticket #372, 25.10.2026).
  const PFAD_VOR=document.documentElement.lang==='en'?'/en':'';
  function pfad(n){
    if(n==='termin')return '/vorschau/b/termin/';
    if(typeof n==='string')return '/vorschau/weg/'+n+'/';
    if(n===0)return '/vorschau/';if(n<=10)return '/vorschau/frage/'+n+'/';if(n===11)return '/vorschau/gesendet/';
    if(n<=14)return '/vorschau/b/frage/'+(n-11)+'/';if(n===15)return '/vorschau/b/gesendet/';
    if(n===16)return '/vorschau/check/zeit/';if(n===17)return '/vorschau/passt/';if(n===18)return '/vorschau/check/mitbringen/';return '';
  }
  function zaehlen(n){
    if(GEZAEHLT.has(n))return;GEZAEHLT.add(n);
    try{
      if(navigator.doNotTrack==='1'||window.doNotTrack==='1')return;
      const p=pfad(n);if(!p)return;
      const d=JSON.stringify({p:PFAD_VOR+p,r:document.referrer||'',d:matchMedia('(max-width:759px)').matches?'mobil':'desktop'});
      navigator.sendBeacon('https://closing.social2scale.com/api/pv',new Blob([d],{type:'text/plain;charset=UTF-8'}));
    }catch(e){}
  }
  function show(n){
    // Nach dem Ergebnis kommt die Vorschau oben zurueck; der naechste Schritt beginnt wieder oben
    // (besucher-sim 16.10.: sonst lag „Weiter“ beim Foto-Schritt am iPhone 12 mini unter dem Falz).
    const vonErgebnis=step===17&&n!==17;
    qs.forEach(q=>q.classList.toggle('on',+q.dataset.step===n)); step=n; zaehlen(n);
    if(vonErgebnis)scrollTo(0,0);
    beispiel(n===0);document.querySelector('.app').dataset.schritt=n;
    document.querySelector('.app').dataset.ansicht=(n>=7&&n<=11)?'feed':'brief';briefFuellen();
    if(n<=6||n===16||n===18){$('#brief').classList.remove('passt');$('#br-status').textContent='wird angelegt';}
    phaseZeigen(n);
    if(n===17)passt();
    const inp=qs[n].querySelector('input,textarea'); if(inp) setTimeout(()=>inp.focus(),160);
    if(n===11){$('#echo').textContent=($('#f-name').value.trim()||'schön');const WM={'gmail.com':'https://mail.google.com','googlemail.com':'https://mail.google.com','web.de':'https://web.de','gmx.de':'https://www.gmx.net','gmx.net':'https://www.gmx.net','t-online.de':'https://email.t-online.de','outlook.com':'https://outlook.live.com','outlook.de':'https://outlook.live.com','hotmail.com':'https://outlook.live.com','hotmail.de':'https://outlook.live.com','yahoo.com':'https://mail.yahoo.com','yahoo.de':'https://mail.yahoo.com','icloud.com':'https://www.icloud.com/mail','me.com':'https://www.icloud.com/mail'};const mv=$('#f-mail').value.trim();const dom=mv.slice(mv.lastIndexOf('@')+1).toLowerCase();const om=$('#openmail');if(WM[dom]){om.href=WM[dom];om.style.display='';}else{om.style.display='none';}}
  }
  // Commitment: was sie mitbringt (Mehrfachauswahl). Erst nach Besuch der Frage zaehlt „0 von 3“.
  let mbGesehen=false;
  function mbWahl(){return [...document.querySelectorAll('#mitbringen .mb[aria-pressed=true]')].map(b=>b.dataset.mb);}
  function mbText(){const n=mbWahl().length;return mbGesehen?n+' von 3':'';}
  document.querySelectorAll('#mitbringen .mb').forEach(b=>b.addEventListener('click',()=>{
    b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true');
    const n=mbWahl().length;
    if(n===3)react('#r-mb','Du bringst alles mit, was es braucht.');else if(n)react('#r-mb','Gut. Den Rest klären wir im Gespräch.');else clr('#r-mb');
    briefFuellen();}));
  // Steckbrief aus den Eingaben fuellen (Text, kein HTML).
  function briefFuellen(){
    const name=$('#f-name').value.trim(),h=$('#f-handle').value.trim().replace(/^@+/,'').replace(/\s+/g,'');
    const w=g=>{const c=document.querySelector('#'+g+' .chip[aria-pressed=true]');return c?c.textContent.trim():'';};
    const werte={name,handle:h?'@'+h:'',taetigkeit:w('taetigkeit'),thema:$('#f-thema').value.trim().slice(0,90),ziel:w('ziel'),stand:w('stand'),zeit:w('zeit'),mitbringen:mbText()};
    $('#br-name').textContent=name||'Du';
    document.querySelectorAll('.br-zeilen>div').forEach(z=>{const v=werte[z.dataset.k]||'';z.querySelector('dd').textContent=v;z.classList.toggle('voll',!!v);});
  }
  document.addEventListener('input',e=>{if(e.target.closest('.sheet'))briefFuellen();});
  document.addEventListener('click',e=>{if(e.target.closest('.chip'))requestAnimationFrame(briefFuellen);});
  function react(id,html,cls){const el=$(id);el.innerHTML=html;el.className='react show'+(cls?' '+cls:'');}
  function clr(id){$(id).className='react';}
  const pvH=$('#pv-handle'),pvAv=$('#pv-av'),pvN=$('#pv-name'),pvB=$('#pv-bio');
  function bump(el){if(reduce)return;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
  // Beitraege-Zahl im Profilkopf = gefuellte Kacheln (vorher standen dort erfundene Zahlen).
  function zaehleKacheln(){$('#pv-n').textContent=document.querySelectorAll('#pv-grid .pv-tile:not(.empty)').length;}
  // Erster Schirm: ein BEISPIEL-Feed baut sich Kachel fuer Kachel auf (Vokabel „Kachel fuellt sich“),
  // klar beschriftet. Ab Frage 1 gehoert das Telefon ihr: leer, und jede Antwort fuellt es.
  const BEISPIEL=[['3 Atemzüge vor dem Meeting','f1'],['Was ist Yin Yoga?','f2'],['Kursplan Herbst','f3'],['Warum Ruhe Arbeit ist','f2'],['Dein erster Kurs','f3'],['Frag mich alles','f1']];
  const DISCLAIMER=$('#disclaimer').innerHTML;let beispielAn=null,beispielUhr=[];
  function kachel(t,i,txt,cls){t.classList.remove('empty','f1','f2','f3');if(cls)t.classList.add(cls);else t.classList.add('empty');t.textContent=txt||'';}
  function beispiel(an){
    if(beispielAn===an)return;beispielAn=an;
    beispielUhr.forEach(clearTimeout);beispielUhr=[];
    const tl=[...document.querySelectorAll('#pv-grid .pv-tile')];
    if(an){
      pvH.textContent='beispiel.yoga';pvN.textContent='Beispiel · Yogastudio';pvB.textContent='Ruhe für volle Wochen';pvAv.textContent='B';
      $('#disclaimer').innerHTML='<b>Beispiel</b> · so sieht ein Ergebnis aus. Deins entsteht aus deinen Antworten.';
      BEISPIEL.forEach(([txt,cls],i)=>{const los=()=>{kachel(tl[i],i,txt,cls);bump(tl[i]);zaehleKacheln();};if(reduce)los();else beispielUhr.push(setTimeout(los,250+i*180));});
    }else{
      const name=$('#f-name').value.trim(),h=$('#f-handle').value.trim().replace(/^@+/,'');
      pvH.textContent=h||'dein.profil';pvN.textContent=name||' ';pvB.textContent=$('#f-thema').value.trim().slice(0,40)||' ';
      if(!pvAv.style.backgroundImage)pvAv.textContent=name?name[0].toUpperCase():'·';
      $('#disclaimer').innerHTML=DISCLAIMER;
      tl.forEach((t,i)=>kachel(t,i,'',''));eigeneKacheln(false);
    }
  }
  // Jede Antwort im gemeinsamen Teil fuellt eine Kachel — der Fortschritt steht im eigenen Feed.
  function eigeneKacheln(animiert){
    const tl=[...document.querySelectorAll('#pv-grid .pv-tile')];
    const wahl=g=>{const c=document.querySelector('#'+g+' .chip[aria-pressed=true]');return c?c.textContent.trim():'';};
    [[wahl('taetigkeit'),'f1'],[wahl('ziel'),'f2'],[wahl('stand'),'f3']].forEach(([txt,cls],i)=>{
      if(!txt)return;const t=tl[i],neu=t.textContent!==txt;kachel(t,i,txt,cls);if(animiert&&neu)bump(t);});
    zaehleKacheln();
  }

  $('#f-name').addEventListener('input',e=>{const v=e.target.value.trim();pvN.textContent=v||' ';pvAv.textContent=v?v[0].toUpperCase():'·';if(v){bump(pvAv);react('#r-name',\`Schön, dich kennenzulernen, \${v}.\`);}else clr('#r-name');});
  $('#f-handle').addEventListener('input',e=>{let v=e.target.value.trim().replace(/^@+/,'').replace(/\\s+/g,'');pvH.textContent=v||'dein.profil';if(v)bump(pvH);if(v.length>=3)react('#r-handle',\`@\${v} — sieht gut aus, das nehmen wir.\`);else clr('#r-handle');});
  $('#f-thema').addEventListener('input',e=>{const v=e.target.value.trim();pvB.textContent=v?v.slice(0,40)+(v.length>40?'…':''):' ';const tl=document.querySelectorAll('#pv-grid .pv-tile');if(v.length>8){['Dein Thema','Warum jetzt?','3 Schritte'].forEach((t,i)=>tl[i].textContent=t);react('#r-thema',\`Verstanden — daraus bauen wir deine Posts.\`);}else clr('#r-thema');});
  // Taetigkeit und Ziel werden angetippt (Freitext ging ungefiltert in den KI-Prompt).
  function waehlen(gruppe,antwort){document.querySelectorAll('#'+gruppe+' .chip').forEach(c=>c.addEventListener('click',()=>{
    document.querySelectorAll('#'+gruppe+' .chip').forEach(x=>x.setAttribute('aria-pressed',x===c?'true':'false'));
    react('#r-'+gruppe,antwort);}));}
  waehlen('taetigkeit','Danke, so wissen wir, für wen wir bauen.');
  waehlen('ziel','Klares Ziel — darauf zahlt jeder Post ein.');
  waehlen('budget','Danke, so bereitet Phil das Gespräch vor.');
  waehlen('start','Alles klar.');
  waehlen('zeit','Danke.');
  ['taetigkeit','ziel'].forEach(g=>document.querySelectorAll('#'+g+' .chip').forEach(c=>c.addEventListener('click',()=>eigeneKacheln(true))));

  // Die Wahl kommt nach dem Check, auf dem Ergebnis-Schirm.
  function wegWaehlen(w){WEG=w;zaehlen(w);}
  document.querySelectorAll('#passt-wege .weg').forEach(b=>b.addEventListener('click',()=>{wegWaehlen(b.dataset.weg);show(b.dataset.weg==='a'?7:12);}));
  // Querwege am Ende: A → B (Erstgespraech) und B → A (Vorschau). Gemeinsames bleibt stehen.
  document.querySelectorAll('[data-quer]').forEach(b=>b.addEventListener('click',()=>{
    const w=b.dataset.quer;wegWaehlen(w);
    if(w==='b'&&!$('#b-mail').value)$('#b-mail').value=$('#f-mail').value;
    if(w==='a'&&!$('#f-mail').value)$('#f-mail').value=$('#b-mail').value;
    show(w==='a'?7:12);}));
  // Ergebnis: die Antworten werden zu Pruefpunkten, dann „Du passt“ und die Wahl. Niemand wird
  // abgewiesen (keine harte Grenze, Sebi 16.10.); wo ein Feld eigene Regeln hat, steht es ehrlich da.
  // Empfehlung wie zuvor auf Weg C: wenig Zeit oder „will mehr“ → Erstgespraech.
  const PUNKTE={
    taetigkeit:{coach:'Du verkaufst dein Wissen. Genau dafür bauen wir.',dienstleistung:'Du verkaufst eine Leistung. Die zeigen wir so, dass man sie bucht.',
      direktvertrieb:'Direktvertrieb geht, mit sauberen Aussagen. Darauf achten wir für dich.',creator:'Als Creator passt es, wenn du daraus Anfragen machen willst.',anders:'Dein Feld klären wir kurz, das bekommen wir hin.'},
    stand:{'Ganz am Anfang':'Du fängst neu an. Wir bauen von null.','Poste unregelmäßig':'Es gibt dich schon. Wir machen daraus ein System.','Aktiv, will mehr':'Du bist aktiv. Jetzt kommt das nächste Level.'},
    zeit:{kaum:'Wenig Zeit. Dann übernehmen wir.','1-3':'Ein bis drei Stunden. Damit lässt sich arbeiten.',mehr:'Du hast Zeit. Vieles kannst du selbst machen.'}
  };
  function mbPunkt(){const n=mbWahl().length;return n===3?'Du bringst alles mit, was es braucht.':n?'Du bringst '+n+' von 3 mit. Den Rest klären wir im Gespräch.':'Was du mitbringst, klären wir im Gespräch.';}
  let passtUhr=[];
  function gewaehlt(g,attr){const c=document.querySelector('#'+g+' .chip[aria-pressed=true]');return c?c.dataset[attr]:'';}
  function passt(){
    passtUhr.forEach(clearTimeout);passtUhr=[];
    const ziel=gewaehlt('ziel','ziel'),stand=gewaehlt('stand','stand'),zeit=gewaehlt('zeit','zeit');
    const punkte=[PUNKTE.taetigkeit[gewaehlt('taetigkeit','taetigkeit')],ziel?'Dein Ziel: '+ziel+'. Darauf zahlt jeder Beitrag ein.':'',PUNKTE.stand[stand],PUNKTE.zeit[zeit],mbPunkt()].filter(Boolean);
    const ul=$('#passt-punkte');ul.innerHTML='';
    punkte.forEach(txt=>{const li=document.createElement('li');li.innerHTML='<span class="pk-m" aria-hidden="true"><i></i><i></i><i></i></span>';li.appendChild(document.createTextNode(txt));ul.appendChild(li);});
    const name=$('#f-name').value.trim();
    $('#passt-h').innerHTML='Du passt zu <em>uns</em>'+(name?', '+name.replace(/[<>&"]/g,''):'')+'.';
    const empf=VORWAHL||((zeit==='kaum'||stand==='Aktiv, will mehr')?'b':'a');
    const wege=$('#passt-wege'),erst=wege.querySelector('[data-weg="'+empf+'"]');
    wege.querySelectorAll('.weg').forEach(b=>b.classList.toggle('ist-empf',b===erst));
    wege.prepend(erst);
    const erg=$('#passt-ergebnis'),eb=$('#passt-eb'),lis=[...ul.children];
    erg.hidden=true;eb.textContent='Wir schauen kurz';
    const brief=$('#brief');brief.classList.remove('passt');$('#br-status').textContent='wird geprüft';
    const fertig=()=>{lis.forEach(l=>l.classList.add('an'));eb.textContent='Ergebnis';erg.hidden=false;
      brief.classList.add('passt');$('#br-status').textContent='geprüft';
      // Das Urteil beginnt oben im Bild; darunter die Wahl.
      requestAnimationFrame(()=>{const h=$('#passt-h'),r=h.getBoundingClientRect(),w=$('#passt-wege').getBoundingClientRect();
        if(r.top<0||w.bottom>innerHeight)h.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});});};
    if(reduce){fertig();return;}
    lis.forEach((l,i)=>passtUhr.push(setTimeout(()=>l.classList.add('an'),260+i*320)));
    passtUhr.push(setTimeout(fertig,260+lis.length*320+220));
  }
  // Nach einer Antwort lag „Weiter" am iPhone SE in fuenf von zehn Schritten und am 12 mini in
  // zwei unter dem Falz (besucher-sim.mjs, 10.10.2026). Ein klebender Knopf haette die uebrigen
  // Antworten verdeckt — also bleibt alles sichtbar, und nach dem Antippen kommt „Weiter" ins Bild.
  document.addEventListener('click',e=>{const c=e.target.closest('.q.on .chip, .q.on .mb');if(!c)return;
    requestAnimationFrame(()=>{const n=c.closest('.q').querySelector('.foot .next');if(!n)return;
      if(n.getBoundingClientRect().bottom>innerHeight-8)n.scrollIntoView({block:'end',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});});
  // Textschritte: die Weiter-Taste der Handy-Tastatur fuehrt weiter (vorher tat sie nichts, und
  // „Weiter" lag hinter der Tastatur). Die Pruefung bleibt beim Knopf (reqOk).
  document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.isComposing)return;const f=e.target.closest('.q.on input[type=text]');if(!f)return;
    e.preventDefault();const n=f.closest('.q').querySelector('.foot .next');if(n&&!n.disabled)n.click();});
  document.querySelectorAll('#stimmung .chip').forEach(c=>c.addEventListener('click',()=>{
    document.querySelectorAll('#stimmung .chip').forEach(x=>x.setAttribute('aria-pressed',x===c?'true':'false'));
    const m=MOODS[c.dataset.mood],R=document.documentElement.style;
    R.setProperty('--mood',m.a);R.setProperty('--mood-t',m.t);R.setProperty('--mood-ti',m.ti);
    const tl=document.querySelectorAll('#pv-grid .pv-tile'),cls=['f1','f2','f3','f2','f3','f1'],lab=['Dein Thema','Warum jetzt?','3 Schritte','Zitat','Einblick','Über dich'];
    tl.forEach((t,i)=>{t.classList.remove('empty','f1','f2','f3');t.classList.add(cls[i]);bump(t);if(!t.textContent.trim())t.textContent=lab[i];});
    bump(pvAv);zaehleKacheln();react('#r-mood',\`\${m.word} — deine Farbwelt steht.\`);
  }));
  document.querySelectorAll('#stand .chip').forEach(c=>c.addEventListener('click',()=>{
    document.querySelectorAll('#stand .chip').forEach(x=>x.setAttribute('aria-pressed',x===c?'true':'false'));
    react('#r-stand',\`Alles klar — da holen wir dich genau ab.\`);eigeneKacheln(true);
  }));

  // ── Foto-Upload (optional): clientseitig auf 512px verkleinert, als JPEG-
  // data-URL in den Payload. Moderne Browser drehen EXIF beim <img>-Decode
  // selbst — Canvas zeichnet also schon richtig orientiert. ──
  let fotoWahl='';
  const FOTO_KANTE=512;
  function fotoLaden(file){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(file);});}
  $('#fotoBtn').addEventListener('click',()=>$('#f-foto').click());
  $('#f-foto').addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0]; if(!file)return;
    try{
      const img=await fotoLaden(file);
      const s=Math.min(1,FOTO_KANTE/Math.max(img.naturalWidth,img.naturalHeight));
      const w=Math.max(1,Math.round(img.naturalWidth*s)),h=Math.max(1,Math.round(img.naturalHeight*s));
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(img.src);
      fotoWahl=c.toDataURL('image/jpeg',.85);
      const prev=$('#fotoPrev');prev.src=fotoWahl;prev.hidden=false;$('#fotoPh').hidden=true;
      $('#fotoLab').textContent='Anderes Foto';$('#fotoWeg').hidden=false;
      pvAv.style.backgroundImage='url('+fotoWahl+')';pvAv.style.backgroundSize='cover';pvAv.textContent='';bump(pvAv);
      react('#r-foto','Schön! Dein Feed zeigt dich — mit Story-Ring.');
    }catch(err){
      console.error('Foto nicht lesbar:',err);
      react('#r-foto','Das Bild ließ sich nicht lesen — probier ein anderes.','warn');
    }
  });
  $('#fotoWeg').addEventListener('click',()=>{
    fotoWahl='';$('#f-foto').value='';
    $('#fotoPrev').hidden=true;$('#fotoPh').hidden=false;
    $('#fotoLab').textContent='Foto auswählen';$('#fotoWeg').hidden=true;
    pvAv.style.backgroundImage='';pvAv.textContent=($('#f-name').value.trim()[0]||'·').toUpperCase();
    clr('#r-foto');
  });

  // ── Markenfarbe (optional): Chip an/ab, "Eigene…" oeffnet den Color-Picker.
  // Die Wahl faerbt sofort die Live-Vorschau (--mood), wie es die Stimmung tut. ──
  let farbeWahl='';
  function farbeSetzen(hex){
    farbeWahl=hex;
    if(hex){document.documentElement.style.setProperty('--mood',hex);bump(pvAv);react('#r-farbe','Deine Farbe — dein Feed trägt sie als Akzent.');}
    else clr('#r-farbe');
  }
  document.querySelectorAll('#farbe .chip').forEach(c=>c.addEventListener('click',()=>{
    if(c.id==='farb-eigene'){
      document.querySelectorAll('#farbe .chip').forEach(x=>x.setAttribute('aria-pressed','false'));
      c.setAttribute('aria-pressed','true');
      $('#f-farbe-custom').click();
      return;
    }
    const war=c.getAttribute('aria-pressed')==='true';
    document.querySelectorAll('#farbe .chip').forEach(x=>x.setAttribute('aria-pressed','false'));
    if(war){farbeSetzen('');return;}
    c.setAttribute('aria-pressed','true');
    farbeSetzen(c.dataset.hex);
  }));
  $('#f-farbe-custom').addEventListener('input',e=>{
    const eig=$('#farb-eigene');
    eig.querySelector('.sw').style.background=e.target.value;
    farbeSetzen(e.target.value.toLowerCase());
  });

  const DOM=['gmail.com','googlemail.com','web.de','gmx.de','gmx.net','t-online.de','hotmail.com','outlook.de','outlook.com','yahoo.de','yahoo.com','icloud.com','me.com'];
  function lev(a,b){const m=a.length,n=b.length,d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
  function suggest(mail){const at=mail.lastIndexOf('@');if(at<1)return null;const dom=mail.slice(at+1).toLowerCase();if(!dom||DOM.includes(dom))return null;let best=null,bd=3;for(const d of DOM){const x=lev(dom,d);if(x<bd){bd=x;best=d;}}return best?mail.slice(0,at+1)+best:null;}
  function validMail(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v.trim());}
  $('#f-mail').addEventListener('input',e=>{const v=e.target.value.trim(),s=suggest(v);if(s){react('#r-mail',\`Meintest du <b id="tf">\${s}</b>?\`,'warn');$('#tf').onclick=()=>{$('#f-mail').value=s;clr('#r-mail');$('#f-mail').focus();};}else if(validMail(v))react('#r-mail',\`Passt — dahin schicken wir deine Vorschau.\`);else clr('#r-mail');});

  function reqOk(req){if(!req)return true;if(req==='stimmung')return !!document.querySelector('#stimmung .chip[aria-pressed=true]');if(req==='stand')return !!document.querySelector('#stand .chip[aria-pressed=true]');if(['taetigkeit','ziel','budget','start','zeit'].includes(req))return !!document.querySelector('#'+req+' .chip[aria-pressed=true]');const el=document.getElementById(req);if(!el)return true;if(req==='f-mail')return validMail(el.value);return el.value.trim().length>0;}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;const req=b.dataset.req;
    const to=+b.dataset.go;
    if(b.classList.contains('next')&&!reqOk(req)){if(req==='f-mail')react('#r-mail','Bitte gib eine gültige E-Mail-Adresse ein.','warn');else{const el=document.getElementById(req)||qs[step].querySelector('input,textarea');const feld=el&&el.closest&&el.closest('.field');if(feld){feld.style.background='linear-gradient(180deg,rgba(240,168,139,.7),rgba(240,168,139,.2))';el.focus();}else{react(req==='stimmung'?'#r-mood':'#r-'+req,'Bitte tipp eine Antwort an.','warn');}}return;}
    show(to);});
  $('#resend').addEventListener('click',()=>{const b=$('#resend');const t=b.textContent;b.textContent='Nochmal geschickt — schau ins Postfach';b.disabled=true;setTimeout(()=>{b.textContent=t;b.disabled=false;},3500);});

  // ── Echter Versand (Schritt 5 -> Backend) ──
  // Zwei Widgets (Weg A und B): immer das eigene ansprechen, sonst liest B das Token von A.
  function turnstileToken(id){
    if(window.turnstile&&typeof turnstile.getResponse==='function'){
      try{return turnstile.getResponse(document.getElementById(id||'ts-a'))||'';}catch(err){console.error('Turnstile-Token nicht lesbar:',err);return '';}
    }
    return '';
  }
  function turnstileReset(id){
    if(window.turnstile&&typeof turnstile.reset==='function'){
      try{turnstile.reset(document.getElementById(id||'ts-a'));}catch(err){console.error('Turnstile-Reset fehlgeschlagen:',err);}
    }
  }
  const SUBMIT_FEHLER={
    email:'Bitte prüf deine E-Mail-Adresse.',
    disposable:'Bitte prüf deine E-Mail-Adresse.',
    email_domain:'Bitte prüf deine E-Mail-Adresse.',
    handle:'Bitte prüf deinen Instagram-Namen.',
    name:'Bitte gib deinen Namen ein.',
    branche:'Bitte ergänze dein Thema.',
    ziel:'Bitte wähl dein Ziel.',
    taetigkeit:'Bitte wähl aus, was du machst.',
    consent:'Bitte bestätige die Einwilligung.',
    captcha:'Sicherheitscheck nicht bestanden — Seite neu laden und nochmal.',
    rate_limited:'Kurz warten und nochmal versuchen.',
  };
  async function submitForm(btn){
    if(!$('#f-consent').checked){react('#r-mail','Bitte bestätige die Einwilligung.','warn');return;}
    if(!reqOk('f-mail')){react('#r-mail','Bitte gib eine gültige E-Mail-Adresse ein.','warn');return;}
    const label=btn.querySelector('.lab'),labelWas=label.textContent;
    btn.disabled=true;label.textContent='Wird gesendet…';
    const thema=$('#f-thema').value.trim();
    const payload={
      name:$('#f-name').value.trim(),
      email:$('#f-mail').value.trim(),
      handle:$('#f-handle').value.trim().replace(/^@+/,'').replace(/\\s+/g,''),
      branche:thema,
      ziel:(document.querySelector('#ziel .chip[aria-pressed=true]')||{}).dataset?.ziel||'',
      taetigkeit:(document.querySelector('#taetigkeit .chip[aria-pressed=true]')||{}).dataset?.taetigkeit||'',
      stimmung:(document.querySelector('#stimmung .chip[aria-pressed=true]')||{}).dataset?.mood||'',
      stand:(document.querySelector('#stand .chip[aria-pressed=true]')||{}).dataset?.stand||'',
      farbe:farbeWahl,
      foto:fotoWahl,
      consent:true,
      testimonialConsent:$('#f-testimonial').checked,
      elapsed:Date.now()-START,
      turnstile:turnstileToken(),
      source:'formular',
    };
    try{
      const res=await fetch('/api/free-content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      let data=null;
      try{data=await res.json();}catch(err){console.error('Antwort nicht lesbar:',err);}
      if(res.ok&&data&&data.ok){show(11);return;}
      react('#r-mail',SUBMIT_FEHLER[data&&data.error]||'Kurz warten und nochmal versuchen.','warn');
      turnstileReset();
    }catch(err){
      console.error('Absenden fehlgeschlagen:',err);
      react('#r-mail','Keine Verbindung — kurz warten und nochmal versuchen.','warn');
      turnstileReset();
    }finally{
      btn.disabled=false;label.textContent=labelWas;
    }
  }
  $('#btnSubmit').addEventListener('click',e=>{e.preventDefault();submitForm(e.currentTarget);});

  // ── Weg B: Erstgespraech-Anfrage. Der Worker prueft Turnstile und reicht ans Portal
  // weiter (anfrage-weiter.js). „Danke“ erst, wenn das Portal angenommen hat. ──
  const B_FEHLER={email:'Bitte prüf deine E-Mail-Adresse.',email_domain:'Diese E-Mail-Adresse gibt es nicht — bitte prüfen.',
    phone:'Bitte gib eine Telefonnummer für den Rückruf an.',name:'Bitte gib oben deinen Namen ein.',captcha:'Sicherheitscheck nicht bestanden — kurz warten und nochmal.',
    rate_limited:'Kurz warten und nochmal versuchen.'};
  function wahlText(g){const c=document.querySelector('#'+g+' .chip[aria-pressed=true]');return c?c.textContent.trim():'';}
  async function anfrageSenden(btn){
    const mail=$('#b-mail').value.trim(),tel=$('#b-tel').value.trim();
    if(!validMail(mail)){react('#r-b','Bitte gib eine gültige E-Mail-Adresse ein.','warn');return;}
    if(tel.replace(/[^0-9]/g,'').length<6){react('#r-b',B_FEHLER.phone,'warn');return;}
    if(!$('#b-consent').checked){react('#r-b','Bitte bestätige die Datenschutzerklärung.','warn');return;}
    const tok=turnstileToken('ts-b');
    if(window.turnstile&&!tok){react('#r-b','Die Sicherheitsprüfung läuft noch. Bitte in ein paar Sekunden erneut.','warn');return;}
    const label=btn.querySelector('.lab'),war=label.textContent;btn.disabled=true;label.textContent='Wird gesendet…';
    const thema=$('#f-thema').value.trim(),handle=$('#f-handle').value.trim().replace(/^@+/,'');
    const payload={name:$('#f-name').value.trim(),email:mail,phone:tel,
      business:[wahlText('taetigkeit'),thema,handle?'@'+handle:''].filter(Boolean).join(' · '),
      status:wahlText('stand'),goal:[wahlText('ziel'),mbWahl().length?'Bringt mit: '+mbWahl().join(', '):''].filter(Boolean).join(' · '),budget:wahlText('budget'),start:wahlText('start'),
      turnstile:tok,elapsed:Date.now()-START};
    try{
      const res=await fetch('/api/anfrage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      let data=null;try{data=await res.json();}catch(err){console.error('Antwort nicht lesbar:',err);}
      if(res.ok&&data&&data.ok){$('#echo-b').textContent=payload.name||'dir';
        // Buchungslink mit allem vorbefuellt, was sie schon geschrieben hat — sonst tippt sie es doppelt.
        $('#termin-b').href=buchungsLink(payload.name,payload.email,buchungsNotiz(payload,'de'));
        show(15);return;}
      react('#r-b',B_FEHLER[data&&data.error]||'Gerade nicht angekommen — bitte kurz warten und nochmal senden.','warn');
      turnstileReset('ts-b');
    }catch(err){
      console.error('Anfrage fehlgeschlagen:',err);
      react('#r-b','Keine Verbindung — kurz warten und nochmal senden.','warn');turnstileReset('ts-b');
    }finally{btn.disabled=false;label.textContent=war;}
  }
  $('#btnAnfrage').addEventListener('click',e=>{e.preventDefault();anfrageSenden(e.currentTarget);});
  // Termin-Klick zaehlt als eigene Stufe von Weg B (wer bucht direkt, wer wartet auf den Anruf?).
  $('#termin-b').addEventListener('click',()=>zaehlen('termin'));

  // Die Handy-Vorschau kippt zum Zeiger — gerechnet wird nur, wenn er sich bewegt,
  // und nur mit Maus. Kein Staub, kein Dauer-Schweben (motion-loop 06.10.2026:
  // Licht statt Bewegung; eine Schleife ohne Ende ist WCAG 2.2.2).
  const dev=$('#device');let px=0,py=0,geplant=false;
  function kippen(){geplant=false;dev.style.transform=\`rotateX(\${-py*4}deg) rotateY(\${px*6}deg)\`;}
  if(!reduce&&matchMedia('(hover:hover) and (pointer:fine)').matches)addEventListener('pointermove',e=>{px=(e.clientX/innerWidth-.5)*2;py=(e.clientY/innerHeight-.5)*2;if(!geplant){geplant=true;requestAnimationFrame(kippen);}});
  // ?weg=a|b (z. B. /anfrage/ → ?weg=b): der Check bleibt, die Wahl ist danach vorgemerkt.
  const vorgewaehlt=new URLSearchParams(location.search).get('weg');
  if(['a','b'].includes(vorgewaehlt)){VORWAHL=vorgewaehlt;WEG=vorgewaehlt;zaehlen(0);show(1);}
  else if(vorgewaehlt==='c'){zaehlen(0);show(1);}else show(0);
`;

/**
 * Baut die Formular-Seite (`GET /`).
 * @param {{TURNSTILE_SITE_KEY?:string}} env
 * @returns {Response}
 */
export function formPage(env) {
  const turnstileSiteKey = env?.TURNSTILE_SITE_KEY || DEFAULT_TURNSTILE_SITE_KEY;
  // Beschreibung + og-Felder: der Link geht ueber Instagram und WhatsApp, dort zeigte die
  // Vorschau bisher nur die Adresse (besucher-sim.mjs, 10.10.2026). Wortlaut wie auf der Startseite.
  const beschreibung = 'Dein Feed-Entwurf in 60 Sekunden. Kostenlos, mit deinem Foto und deiner Farbe.';
  const head =
    `<meta name="description" content="${beschreibung}">` +
    '<meta property="og:title" content="Deine Gratis-Vorschau · social2scale">' +
    `<meta property="og:description" content="${beschreibung}">` +
    '<meta property="og:type" content="website">' +
    '<meta property="og:url" content="https://start.social2scale.com/">' +
    '<meta property="og:locale" content="de_DE">' +
    '<meta property="og:locale:alternate" content="en_US">' +
    '<link rel="alternate" hreflang="de" href="https://start.social2scale.com/">' +
    '<link rel="alternate" hreflang="en" href="https://start.social2scale.com/en/">' +
    '<link rel="alternate" hreflang="x-default" href="https://start.social2scale.com/">' +
    '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' +
    `<style>${PAGE_STYLE}</style>`;
  const body = `${pageMarkup(turnstileSiteKey)}<script>${PAGE_SCRIPT}</script>`;

  return htmlDoc({ title: 'Deine Gratis-Vorschau · social2scale', head, body });
}
