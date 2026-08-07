/**
 * Reveal-Zustand fuer den Build-/Ergebnis-Screen (`/r/:token`) — der Conversion-
 * Moment, sobald `buildStatus()` `state:'ready'` meldet (Plan 3 Task 4).
 * Portiert aus `design/prototypes/reveal.html` (abgenommenes Design). Ausgelagert
 * aus result.js (Datei-Groessen-Grenze), nicht dort mit eingebaut — result.js
 * baut nur noch das `<section id="reveal" hidden>` mit ein und ruft
 * `revealSection()` aus `showReveal()` auf.
 *
 * Aenderungen ggue. dem Prototyp:
 *  - Cosmos/Vignette/Orbs sind schon Teil von shell.js's globaler `.scene`
 *    (einmal fuer die ganze Seite) — hier NICHT nochmal gerendert.
 *  - CSS-Variablen auf die tatsaechlichen shell.js-Tokennamen umgemappt
 *    (--accent-flow -> --flow, --line/--line-2 -> --hair/--hair-2,
 *    --ease/--ease-spring -> --e-out/--e-spring) statt die im Prototyp
 *    erfundenen Namen nochmal zu definieren. Alle Klassen `rv-`-praefigiert,
 *    damit nichts mit result.js's Build-Screen-Klassen (`.phone`, `.grid`,
 *    `.tile`, …) kollidiert — beides steht jetzt auf derselben Seite.
 *  - Der 9-Zellen-Deko-Grid des Prototyps ist ersetzt: echt gibt es pro
 *    Farbwelt nur 3 echte Foto-Frames (f-i-s1..s3, siehe templates/frames.js)
 *    + 1 Profilbild — eine erfundene Fuellung der restlichen 6 Zellen waere
 *    eine Behauptung ohne Daten (vgl. result.js: "ein geschaetzter Balken ist
 *    ein gelogener Balken").
 *  - Beide CTAs sind jetzt echt: primaer -> ANFRAGE_URL (+ Klick-Tracking per
 *    sendBeacon, Fehler bewusst verschluckt — Tracking darf den Klick nie
 *    blockieren), sekundaer laedt die 4 Bilder (Profil+3 Slides) der aktiven
 *    Farbwelt einzeln herunter. Der Digistore-Kauf-CTA ist noch nicht gebaut
 *    (siehe Kommentar im Markup).
 */

const ANFRAGE_URL = 'https://social2scale.com/anfrage/';

/** Statischer Text kommt trotzdem durch esc() — Konsistenz mit result.js. */
function esc(v) {
  return String(v ?? '').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

export const REVEAL_STYLE = `
  #reveal{position:relative;z-index:2;isolation:isolate;max-width:34rem;margin:0 auto;padding:2.4rem 1.25rem 4rem;display:flex;flex-direction:column;align-items:center;text-align:center;--rv-glow-1:rgba(194,65,12,.20);--rv-glow-2:rgba(0,184,136,.13);--rv-ped:rgba(194,65,12,.42)}
  #reveal[hidden]{display:none}

  /* ── Reveal-EIGENES Licht, das MITSCROLLT ──────────────────────────────
     Die globale .scene (shell.js) ist position:fixed und beleuchtet nur den
     ersten Viewport — beim langen Reveal lag alles darunter auf totem Schwarz
     ("tot"). Diese Ebene liegt ABSOLUT im #reveal, scrollt also mit und legt
     drei weiche, farbwelt-getönte Licht-Pools unter Held, Posts und Angebot.
     rvApplyWorld() tauscht die Töne beim Farbwelt-Wechsel -> das Reveal "lebt"
     und zeigt jede Welt in ihrer echten Stimmung (wie die Share-Card). */
  .rv-atmo{position:absolute;inset:0;z-index:-1;pointer-events:none;
    background:
      radial-gradient(90% 30vh at 50% 6vh,var(--rv-glow-1),transparent 68%),
      radial-gradient(110% 40vh at 16% 30%,var(--rv-glow-2),transparent 70%),
      radial-gradient(110% 40vh at 84% 50%,var(--rv-glow-1),transparent 70%),
      radial-gradient(110% 40vh at 18% 71%,var(--rv-glow-2),transparent 70%),
      radial-gradient(96% 42vh at 85% 92%,var(--rv-glow-1),transparent 72%),
      linear-gradient(180deg,rgba(0,184,136,.055),rgba(31,166,224,.045));
    transition:background 1.1s var(--e-out)}
  .rv-eyebrow{font-family:var(--ff-label);font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);display:inline-flex;align-items:center;gap:.55rem}
  .rv-eyebrow .dot{width:22px;height:1.5px;border-radius:2px;background:var(--flow);box-shadow:0 0 8px rgba(0,184,136,.45)}
  .rv-h2{font-family:var(--ff-serif);font-weight:500;font-size:clamp(2rem,1.5rem + 3vw,3.2rem);line-height:1.02;letter-spacing:-.025em;margin:1rem 0 .5rem;text-wrap:balance}
  .rv-h2 em{font-style:italic;font-weight:440;background:var(--flow);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .rv-sub{font-size:1rem;color:var(--muted);max-width:30ch;margin:0 auto}

  .rv{opacity:0;transform:translateY(28px);filter:blur(10px);transition:opacity .9s var(--e-out),transform 1s var(--e-spring),filter .9s var(--e-out)}
  .rv.in{opacity:1;transform:none;filter:none}

  .rv-hero{position:relative;margin:1.8rem 0 1.3rem;width:100%;display:flex;justify-content:center}
  /* Licht-Sockel: das Gerät steht auf beleuchtetem Boden (farbwelt-getönt),
     statt im Nichts zu schweben. */
  .rv-hero::after{content:"";position:absolute;left:50%;bottom:-14px;transform:translateX(-50%);width:58%;height:30px;border-radius:50%;filter:blur(20px);background:radial-gradient(circle,var(--rv-ped),transparent 70%);z-index:-1;transition:background 1s var(--e-out)}
  /* KEIN zweiter Geräterahmen: das gerenderte Bild IST bereits ein Handy-Mockup
     (Rahmen, Statusleiste, Profil, 3x3-Raster). Es nochmal einzurahmen ergab ein
     Handy IM Handy — ihr Feed schrumpfte auf ~40% der Breite, obwohl er der
     Beweis ist. Jetzt: randlos und so gross wie die Spalte hergibt, getragen von
     Schatten + farbwelt-getöntem Glühen. Aus demselben Grund faellt der
     Display-Glasglanz weg (er lag als Schleier ueber ihrem Content). */
  .rv-shot-frame{position:relative;width:min(100%,26rem);border-radius:22px;line-height:0;box-shadow:0 60px 120px -45px rgba(0,0,0,.95),0 0 92px -16px rgba(0,184,136,.2),0 0 104px -22px rgba(31,166,224,.15);animation:rvFloat 7.5s ease-in-out infinite}
  @keyframes rvFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  .rv-shot{display:block;width:100%;aspect-ratio:1080/1350;object-fit:cover;border-radius:22px;background:#0c0c0c;opacity:0;transition:opacity .55s var(--e-out)}
  .rv-shot.loaded{opacity:1}
  /* Aussen VERTIKAL (durch die 3 Posts scrollen), innen HORIZONTAL (Slides
     swipen) — kein horizontal-in-horizontal (Spec §6). */
  .rv-posts-wrap{display:flex;flex-direction:column;align-items:center;gap:1.1rem;margin:.6rem 0 2.4rem;width:100%}
  .rv-posts-label{font-family:var(--ff-label);font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}
  .rv-posts-stack{display:flex;flex-direction:column;gap:2.2rem;width:100%;max-width:min(94vw,352px)}
  .rv-post{display:flex;flex-direction:column;gap:.7rem;width:100%}
  .rv-post-head{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem}
  .rv-post-n{font-family:var(--ff-serif);font-weight:500;font-size:1.05rem;letter-spacing:-.015em;color:var(--ink)}
  .rv-post-swipe{font-family:var(--ff-label);font-size:9.5px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
  /* Der Pfeil nudged sanft nach rechts -> signalisiert die Wisch-Geste (Entdeckbarkeit). */
  .rv-post-swipe .arw{display:inline-block;color:var(--emerald-soft);animation:rvSwipeArw 1.9s var(--e-out) infinite}
  @keyframes rvSwipeArw{0%,100%{transform:translateX(0);opacity:.6}50%{transform:translateX(4px);opacity:1}}
  /* Inneres Karussell: 3 Slides, scroll-snap, EIN Slide pro Ansicht. */
  .rv-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;width:100%;border-radius:16px;background:#0c0c0c;box-shadow:0 18px 40px -22px rgba(0,0,0,.85),0 0 0 1.5px #23262b,0 0 60px -18px rgba(0,184,136,.14);scrollbar-width:none}
  .rv-track::-webkit-scrollbar{display:none}
  .rv-slide{flex:0 0 100%;scroll-snap-align:center;aspect-ratio:1080/1350;line-height:0;background:#0c0c0c}
  .rv-slide img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .5s var(--e-out)}
  .rv-slide img.loaded{opacity:1}
  .rv-dots{display:flex;gap:6px;justify-content:center;align-items:center;height:10px}
  .rv-dot{width:6px;height:6px;border-radius:50%;background:rgba(244,245,243,.22);transition:background .3s var(--e-out),transform .3s var(--e-out)}
  .rv-dot.act{background:var(--flow);transform:scale(1.3);box-shadow:0 0 8px rgba(0,184,136,.5)}
  .rv-post-cap{display:flex;flex-direction:column;gap:9px;text-align:left;margin-top:.15rem}
  .rv-cap-text{font-size:.82rem;line-height:1.5;color:var(--muted);white-space:pre-wrap;max-height:7.5em;overflow-y:auto;scrollbar-width:thin;padding-right:2px}
  .rv-cap-copy{align-self:flex-start;font-family:var(--ff-label);font-weight:600;font-size:12px;letter-spacing:.01em;color:var(--emerald-soft);background:rgba(0,184,136,.1);border:1px solid rgba(0,184,136,.25);border-radius:100px;padding:.5rem 1.05rem;cursor:pointer;transition:background .3s var(--e-out),color .3s var(--e-out)}
  .rv-cap-copy:hover{background:rgba(0,184,136,.18)}
  .rv-cap-copy.done{color:var(--emerald-ink);background:var(--flow);border-color:transparent}

  .rv-switcher{display:inline-flex;gap:4px;padding:4px;border-radius:100px;background:rgba(244,245,243,.05);border:1px solid var(--hair);margin-bottom:2.2rem}
  .rv-switcher button{font-family:var(--ff-label);font-weight:700;font-size:12.5px;letter-spacing:.02em;color:var(--muted);background:transparent;border:0;padding:.55rem 1.1rem;border-radius:100px;cursor:pointer;display:inline-flex;align-items:center;gap:.5rem;transition:color .3s var(--e-out),background .4s var(--e-out)}
  .rv-switcher button .sw{width:13px;height:13px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3)}
  .rv-switcher button.act{color:var(--emerald-ink);background:var(--flow)}
  .rv-switcher button.act .sw{border-color:rgba(4,32,26,.35)}
  .rv-sw-a{background:linear-gradient(135deg,#EAD9CE,#C2410C)}
  .rv-sw-b{background:linear-gradient(135deg,#CFE0E4,#1FA6E0)}

  .rv-offer{display:flex;flex-direction:column;align-items:center;gap:.9rem;width:100%}
  .rv-offer h3{font-family:var(--ff-serif);font-weight:480;font-size:clamp(1.5rem,1.2rem + 1.6vw,2.1rem);letter-spacing:-.02em;line-height:1.08;text-wrap:balance}
  .rv-lead{color:var(--muted);font-size:1rem;line-height:1.5;max-width:30ch;margin:0 auto .2rem;text-wrap:balance}
  .rv-values{list-style:none;display:flex;flex-direction:column;gap:.55rem;margin:.3rem auto 1.2rem;padding:0;text-align:left;width:max-content;max-width:100%}
  .rv-values li{display:flex;align-items:center;gap:.65rem;font-size:.94rem;color:var(--ink);line-height:1.3}
  .rv-values .ck{width:19px;height:19px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,184,136,.16);color:var(--emerald-soft);font-size:11px;font-weight:800}
  /* RANGFOLGE am Schluss: hier standen vier gleich laute Handlungen nebeneinander
     (starten / speichern / teilen / "schreib uns direkt") — und die letzte zeigte
     sogar auf DASSELBE Ziel wie die primäre. Jetzt traegt nur noch der Primär-CTA
     Emerald; speichern/teilen sind ruhige Zweitwege mit Abstand, der Kontakt-Link
     ist reiner Text. Eine Seite, eine offensichtliche naechste Handlung. */
  .rv-actions{display:flex;flex-wrap:wrap;gap:.55rem;justify-content:center;margin-top:1.15rem}
  .rv-cta-share{display:inline-flex;align-items:center;gap:.5rem}
  .rv-cta-share svg{opacity:.85}
  .rv-contact{font-family:var(--ff-label);font-weight:600;font-size:13px;letter-spacing:.01em;color:var(--muted);text-decoration:none;margin-top:1.1rem;display:inline-flex;align-items:center;gap:.4rem;border-bottom:1px solid transparent;transition:border-color .3s var(--e-out),color .3s var(--e-out)}
  .rv-contact:hover{color:var(--ink);border-color:var(--hair-2)}
  .rv-cta{display:inline-flex;align-items:center;gap:.7rem;font-family:var(--ff-label);font-weight:700;font-size:15px;letter-spacing:.01em;text-decoration:none;padding:1rem 1.1rem 1rem 1.5rem;border-radius:100px;color:var(--emerald-ink);background:var(--flow);box-shadow:0 16px 40px -16px rgba(0,184,136,.6),0 16px 40px -20px rgba(31,166,224,.45),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .4s var(--e-spring)}
  .rv-cta:active{transform:scale(.97)}
  .rv-cta .ic{width:30px;height:30px;border-radius:50%;background:rgba(4,32,26,.16);display:flex;align-items:center;justify-content:center;font-size:15px;transition:transform .4s var(--e-spring)}
  .rv-cta:hover .ic{transform:translate(3px,-1px)}
  .rv-cta2{font-family:var(--ff-label);font-weight:600;font-size:13.5px;color:var(--muted);text-decoration:none;padding:.75rem 1.25rem;border-radius:100px;border:1px solid var(--hair);background:rgba(244,245,243,.03);cursor:pointer;transition:border-color .3s var(--e-out),background .3s var(--e-out),color .3s var(--e-out)}
  .rv-cta2:hover{color:var(--ink);border-color:var(--hair-2);background:rgba(244,245,243,.06)}
  /* --faint auf dem dunklen Grund liegt bei ~4.3:1 und faellt damit unter AA fuer
     Fliesstext dieser Groesse — ausgerechnet bei den zwei Saetzen, die die
     Erwartung setzen (Wasserzeichen-Hinweis + "Beispiel-Vorschau"). --muted: ~7.9:1. */
  .rv-wm,.rv-disclaimer{font-size:.8rem;color:var(--muted);max-width:38ch;margin-top:.45rem;line-height:1.55}
  .rv-report{background:none;border:0;cursor:pointer;font-size:.74rem;color:var(--faint);margin-top:1.1rem;padding:4px;text-decoration:underline;text-underline-offset:3px;transition:color .25s}
  .rv-report:hover{color:var(--muted)}
  .rv-report.done{text-decoration:none;color:var(--muted);cursor:default}
  .rv-report:disabled{cursor:default}

  .rv-scrollhint[hidden]{display:none}
  .rv-scrollhint{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:5;font-family:var(--ff-label);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);display:flex;flex-direction:column;align-items:center;gap:6px;animation:rvbob 2s var(--e-out) infinite}
  .rv-scrollhint .arw{width:1px;height:20px;background:linear-gradient(var(--emerald-soft),transparent)}
  @keyframes rvbob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(5px)}}

  /* Wrapper sind auf JEDER Breite unsichtbar -> die Kinder fliessen als eine
     Folge (siehe Desktop-Kommentar unten). */
  .rv-lead-col,.rv-main-col{display:contents}

  /* ── Desktop (>=900px): DREI AKTE statt Zwei-Spalten-Split ────────────────
     Der frühere sticky-Split (Held+Switcher links, Posts+Angebot rechts) hatte
     zwei Fehler: die linke Spalte war nach dem Switcher zu Ende und lief danach
     über ~2000px als leeres Schwarz mit, und der Held (ihr KOMPLETTER Feed) war
     mit ~190px schmaler als ein einzelner Post-Slide daneben — die wichtigste
     Sache war die kleinste.
     Jetzt liest sich die Seite als klare Folge:
       Akt 1  Held gross und mittig (der Beweis, mit Farbwelt-Wahl darunter)
       Akt 2  die drei Posts NEBENEINANDER (füllt die Breite, statt schmaler Spalte)
       Akt 3  das Angebot, ruhig zentriert, mit genau einer primären Handlung. ── */
  @media (min-width:900px){
    #reveal{max-width:68rem;padding-top:3.6rem}
    .rv-sub{max-width:34ch}
    .rv-hero{margin:2.4rem 0 1.6rem}
    .rv-shot-frame{width:min(100%,30rem)}
    .rv-switcher{margin-bottom:3.2rem}
    .rv-posts-wrap{gap:1.6rem;margin:0 0 3.4rem}
    /* Drei Karussells nebeneinander, oben ausgerichtet — ungleich lange Captions
       duerfen die Reihe nicht auseinanderziehen. */
    .rv-posts-stack{display:grid;grid-template-columns:repeat(3,1fr);gap:2.6rem;max-width:100%;align-items:start}
    /* Nebeneinander gibt es Platz: die Caption laeuft ganz aus, statt im
       7,5-Zeilen-Kasten mitten im Satz abzureissen (im schmalen Stapel fiel das
       nicht auf, in der Dreierreihe liest es sich wie ein Fehler). Ungleich lange
       Captions sind dank align-items:start unproblematisch. */
    .rv-cap-text{max-height:none;overflow:visible}
    .rv-offer{max-width:46rem;margin:0 auto}
    /* 30ch reissen den Absatz auf Desktop in vier kurze Fetzen — hier ist Platz. */
    .rv-lead{max-width:46ch}
    .rv-scrollhint{display:none}
  }

  @media (prefers-reduced-motion:reduce){
    #reveal *,#reveal *::before,#reveal *::after{animation:none!important;transition-duration:.01ms!important}
    .rv{opacity:1;transform:none;filter:none}
  }
`;

/**
 * @param {{eyebrow:string,head:string,headAccent:string,sub:string,offerHead:string,offerSub:string,ctaPrimary:string,ctaSecondary:string,wmNote:string}} copy
 * @returns {string} das versteckte `<section id="reveal" hidden>` Markup
 */
export function revealMarkup(copy) {
  // Drei Post-Bloecke, vertikal gestapelt; jeder ein eigenes horizontales
  // Slide-Karussell (3 Slides). Bild-Quellen setzt rvApplyWorld() zur Laufzeit
  // (world-abhaengig) — im Markup stehen nur data-post/data-slide als Vertrag.
  const postsHtml = [1, 2, 3].map((p) => {
    const capIdx = p - 1;
    const slides = [1, 2, 3].map((s) =>
      `<div class="rv-slide"><img data-post="${p}" data-slide="${s}" alt="Post ${p}, Slide ${s}" loading="lazy"></div>`
    ).join('');
    const dots = [1, 2, 3].map((s) =>
      `<span class="rv-dot${s === 1 ? ' act' : ''}"></span>`
    ).join('');
    return `
      <article class="rv-post rv" data-post="${p}">
        <div class="rv-post-head"><span class="rv-post-n">Post ${p}</span><span class="rv-post-swipe">3 Slides · swipe <span class="arw" aria-hidden="true">→</span></span></div>
        <div class="rv-track" data-post="${p}">${slides}</div>
        <div class="rv-dots" data-post="${p}">${dots}</div>
        <div class="rv-post-cap"><p class="rv-cap-text" data-cap="${capIdx}">Caption wird geladen …</p><button type="button" class="rv-cap-copy" data-cap="${capIdx}">Caption kopieren</button></div>
      </article>`;
  }).join('');
  return `
<section id="reveal" hidden>
  <div class="rv-atmo" aria-hidden="true"></div>
  <!-- Wrapper rv-lead-col / rv-main-col sind mobil display:contents (Layout
       unverändert), ab Desktop (>=900px) werden sie zu 2 Spalten: Held+Switcher
       links sticky, Posts+Angebot rechts (Editorial-Split, nutzt die Fläche). -->
  <div class="rv-lead-col">
  <span class="rv-eyebrow rv"><span class="dot"></span>${esc(copy.eyebrow)}</span>
  <h2 class="rv-h2 rv">${esc(copy.head)} <em>${esc(copy.headAccent)}</em></h2>
  <p class="rv-sub rv">${esc(copy.sub)}</p>

  <!-- Held: das komplette, gerenderte Profil (f-<welt>-profil, 1080x1350). Es traegt
       schon Handle, Avatar, Bio, Stats UND das 3x3-Raster in sich — genau darum wird
       es NICHT mehr in einen Avatar-Kreis gequetscht (der fruehere "komische" Look),
       sondern in echter 4:5-Groesse als Held gezeigt. -->
  <div class="rv-hero rv">
    <div class="rv-shot-frame"><img class="rv-shot" id="rv-shot" alt="Deine komplette Instagram-Vorschau" loading="lazy"></div>
  </div>

  <div class="rv-switcher rv" id="rv-switcher" role="group" aria-label="Farbwelt wählen">
    <button class="act" type="button" data-welt="0"><span class="sw rv-sw-a"></span>Farbwelt A</button>
    <button type="button" data-welt="1"><span class="sw rv-sw-b"></span>Farbwelt B</button>
  </div>
  </div><!-- /rv-lead-col -->

  <div class="rv-main-col">
  <!-- Die drei echten Posts als volle Instagram-Karussells: vertikal gestapelt
       (durchscrollen), jeder ein horizontales 3-Slide-Karussell in wahrer
       4:5-Groesse mit Dots + fertiger, sofort postbarer Caption + Kopieren.
       So ist es echter Content, kein Vorschau-Teaser. -->
  <div class="rv-posts-wrap rv">
    <span class="rv-posts-label">Deine ersten Posts — fertig zum Posten</span>
    <div class="rv-posts-stack" id="rv-posts">${postsHtml}
    </div>
  </div>

  <div class="rv-offer">
    <h3 class="rv" id="rv-offer-head">${esc(copy.offerHead)}</h3>
    <p class="rv-lead rv">${esc(copy.offerLead)}</p>
    <ul class="rv-values rv">
      ${copy.values.map((v) => `<li><span class="ck" aria-hidden="true">✓</span>${esc(v)}</li>`).join('')}
    </ul>
    <a class="rv-cta rv" id="rv-cta-primary" href="${ANFRAGE_URL}">${esc(copy.ctaPrimary)} <span class="ic">→</span></a>
    <!-- Digistore-Kauf-CTA später -->
    <div class="rv-actions rv">
      <button type="button" class="rv-cta2" id="rv-cta-download">${esc(copy.ctaSecondary)}</button>
      <button type="button" class="rv-cta2 rv-cta-share" id="rv-cta-share"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>${esc(copy.ctaShare)}</button>
    </div>
    <a class="rv-contact rv" id="rv-contact" href="${ANFRAGE_URL}">${esc(copy.contactLabel)} <span aria-hidden="true">→</span></a>
    <p class="rv-wm rv">${esc(copy.wmNote)}</p>
    <!-- Erwartungssteuerung, bewusst DEUTLICHER als vorher ("Beispiel-Vorschau" war
         zu leise) — aber vorwaerts formuliert: erst klar sagen, was das hier ist,
         dann was daraus wird. Kein Ergebnis- oder Reichweitenversprechen (UWG). -->
    <p class="rv-disclaimer rv">&lowast; Das ist ein Schnellentwurf aus drei Antworten — bewusst grob. Dein echter Auftritt entsteht mit dir: von Hand, in deiner Sprache, ohne unser Zeichen.</p>
    <!-- Eskalations-Knopf: nur die Token-Inhaberin sieht diese Seite. Meldet sie
         (z. B. ein Foto, das sie nie hochgeladen hat), geht der Feed sofort
         offline + Founder-Alarm. Bewusst leise gesetzt — ein Ventil, kein CTA. -->
    <button type="button" class="rv-report rv" id="rv-report">Stimmt hier etwas nicht? Missbrauch melden</button>
  </div>
  </div><!-- /rv-main-col -->
</section>

<div class="rv-scrollhint" id="rv-hint" hidden><span>scroll</span><span class="arw"></span></div>`;
}

/**
 * Client-Skript fuer den Reveal. Haengt an dieselbe `<script>`-Ausgabe wie
 * result.js's PAGE_SCRIPT (EIN Tag, EIN Scope) — nutzt dessen bereits
 * deklarierte `$`, `reduce`, `TOKEN`, `IMG_BASE`. `revealSection()` wird
 * von `showReveal()` (PAGE_SCRIPT) aufgerufen, sobald `state:'ready'` kommt.
 * Bewusst KEIN Scroll-Listener — sowohl der Blur-up-Reveal als auch das
 * Ausblenden des Scroll-Hinweises laufen ueber IntersectionObserver.
 */
export const REVEAL_SCRIPT = `
  let rvActiveWorld = 0;

  // Vorname (kommt via /api/status -> applyIdentity in result.js) macht die
  // Offer-Headline persoenlich. Ohne Namen bleibt der neutrale Text stehen.
  function rvSetVorname(name) {
    if (!name) return;
    const h = document.getElementById('rv-offer-head');
    if (h) h.textContent = 'Du willst mehr, ' + name + '?';
  }

  // Handle fuers Teilen (von applyIdentity gesetzt).
  let rvHandle = '';
  function rvSetHandle(h) { rvHandle = String(h || '').replace(/^@+/, ''); }

  function rvLoadImg(img, src) {
    img.classList.remove('loaded');
    img.onload = function () { img.classList.add('loaded'); };
    img.onerror = function () { console.error('[reveal] Bild nicht ladbar:', src); };
    img.src = src;
  }

  function rvApplyWorld(world) {
    rvActiveWorld = world;
    const shot = $('rv-shot');
    if (shot) rvLoadImg(shot, IMG_BASE + 'f-' + world + '-profil.jpg');
    // Tauscht die Quellen ALLER Slides in ALLEN 3 Post-Bloecken (world 0<->1).
    document.querySelectorAll('#rv-posts img').forEach((img) => {
      const src = IMG_BASE + 'f-' + world + '-p' + img.dataset.post + '-s' + img.dataset.slide + '.jpg';
      rvLoadImg(img, src);
    });
    document.querySelectorAll('#rv-switcher button').forEach((b) => {
      b.classList.toggle('act', Number(b.dataset.welt) === world);
    });
    // Der Wechsel LEUCHTET um: reveal-eigenes Licht + Sockel nehmen den Ton der
    // gewählten Welt an (A warm/terracotta, B teal), die globale Szenen-Stimmung
    // (--mood -> Orb) folgt markenkonform (emerald/teal). So ist der Switch ein
    // sichtbarer "wow, es lebt"-Moment, nicht nur ein Bildtausch.
    const R = $('reveal');
    const warm = world === 0;
    if (R) {
      R.style.setProperty('--rv-glow-1', warm ? 'rgba(194,65,12,.20)' : 'rgba(31,166,224,.22)');
      R.style.setProperty('--rv-glow-2', 'rgba(0,184,136,.13)');
      R.style.setProperty('--rv-ped', warm ? 'rgba(194,65,12,.42)' : 'rgba(31,166,224,.44)');
    }
    try { document.documentElement.style.setProperty('--mood', warm ? '#00B888' : '#1FA6E0'); } catch (e) {}
  }

  // Dots pro Post-Karussell: welche Slide gerade sichtbar ist. IntersectionObserver
  // mit dem Track als root (kein Scroll-Listener-Churn, Spec §6). Beim Farbwelt-
  // Wechsel bleiben Dots gueltig — nur die Bildquellen tauschen, nicht die Slides.
  function rvWireDots() {
    document.querySelectorAll('.rv-track').forEach((track) => {
      const post = track.dataset.post;
      const dotsWrap = document.querySelector('.rv-dots[data-post="' + post + '"]');
      if (!dotsWrap) return;
      const dots = [...dotsWrap.children];
      const slides = [...track.querySelectorAll('.rv-slide')];
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = slides.indexOf(e.target);
          dots.forEach((d, i) => d.classList.toggle('act', i === idx));
        });
      }, { root: track, threshold: .6 });
      slides.forEach((s) => io.observe(s));
    });
  }

  // Einmaliger Peek-Nudge auf dem ERSTEN Post: peekt kurz die 2. Slide an und
  // gleitet zurueck, sobald die Karte sichtbar wird — lehrt die Wisch-Geste, ohne
  // Text. Nur einmal, nur der erste Post (Rest kennt der Nutzer dann), nie bei
  // reduzierter Bewegung. Scroll-Snap waehrend des Nudges kurz aus, sonst schnappt
  // es sofort zurueck und der Peek ist unsichtbar.
  function rvWireSwipeNudge() {
    if (reduce) return;
    const track = document.querySelector('.rv-track[data-post="1"]');
    if (!track) return;
    let getan = false;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting || getan) return;
        getan = true; io.disconnect();
        setTimeout(() => {
          const w = track.clientWidth;
          track.style.scrollSnapType = 'none';
          track.scrollTo({ left: Math.round(w * 0.3), behavior: 'smooth' });
          setTimeout(() => {
            track.scrollTo({ left: 0, behavior: 'smooth' });
            setTimeout(() => { track.style.scrollSnapType = ''; }, 650);
          }, 640);
        }, 500);
      });
    }, { threshold: 0.6 });
    io.observe(track);
  }

  function rvWireSwitcher() {
    const el = $('rv-switcher');
    if (!el) return;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      rvApplyWorld(Number(b.dataset.welt));
    });
  }

  // Klick-Tracking darf den Klick nie blockieren — Fehler bewusst nur geloggt.
  function rvWirePrimaryCta() {
    const el = $('rv-cta-primary');
    if (!el) return;
    el.addEventListener('click', () => {
      try {
        if (navigator.sendBeacon) navigator.sendBeacon('/api/track?e=cta_call&t=' + TOKEN);
      } catch (err) {
        console.error('[reveal] Tracking fehlgeschlagen:', err);
      }
    });
  }

  // Laedt EIN Bild herunter: das komplette Profil der aktiven Farbwelt (enthaelt
  // Avatar, Bio, Raster). Frueher wurden 4 Dateien gleichzeitig getriggert — das
  // blockieren Browser (nur die erste kommt durch, wirkt kaputt). Ueber fetch->Blob
  // ist EIN Download zuverlaessig; Fallback: Bild im Tab oeffnen (lange druecken/speichern).
  async function rvDownload(e) {
    e.preventDefault();
    try { if (navigator.sendBeacon) navigator.sendBeacon('/api/track?e=cta_save&t=' + TOKEN); } catch (err) {}
    const src = IMG_BASE + 'f-' + rvActiveWorld + '-profil.jpg';
    try {
      const blob = await (await fetch(src)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'social2scale-vorschau.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error('[reveal] Download fehlgeschlagen, oeffne im Tab:', err);
      window.open(src, '_blank');
    }
  }
  function rvWireDownload() {
    const el = $('rv-cta-download');
    if (el) el.addEventListener('click', rvDownload);
  }

  // Eskalations-Knopf: Feed sofort sperren lassen (z. B. untergeschobenes Foto).
  // Ein Klick, keine Rueckfrage-Modals (Dialoge waeren hier Huerden) — der Server
  // ist idempotent, ein Versehen kann der Founder-Kontakt aufloesen.
  function rvWireReport() {
    const el = $('rv-report');
    if (!el) return;
    el.addEventListener('click', async () => {
      el.disabled = true;
      try {
        await fetch('/api/report/' + TOKEN, { method: 'POST' });
        el.textContent = 'Danke — wir haben die Vorschau offline genommen und melden uns.';
        el.classList.add('done');
      } catch (err) {
        console.error('Meldung fehlgeschlagen:', err);
        el.disabled = false;
        el.textContent = 'Melden hat nicht geklappt — bitte nochmal versuchen.';
      }
    });
  }

  // Teilen mit Followern (den Mehrwert in Kooperation posten -> Gespraechs-Aufhaenger).
  // Web Share API mit Datei, wo unterstuetzt (Mobile); sonst Text+Link; sonst Fallback
  // auf den Download, damit "Teilen" nie ins Leere klickt. Bricht NIE die Seite.
  function rvBtnFlash(btn, msg) {
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.textContent = msg; btn.classList.add('done');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('done'); }, 2200);
  }
  async function rvShare() {
    try { if (navigator.sendBeacon) navigator.sendBeacon('/api/track?e=cta_share&t=' + TOKEN); } catch (e) {}
    const url = 'https://social2scale.com';
    const at = rvHandle ? '@' + rvHandle + ' · ' : '';
    // Link IN den Text: viele Plattformen (WhatsApp) verwerfen das url-Feld, sobald
    // ein Bild dabei ist — im Text ueberlebt der Link garantiert (viraler Loop).
    const text = at + 'Schau dir meinen neuen Feed an ✨ gebaut mit social2scale.\\n\\nWillst du auch so einen? Kostenlos testen: ' + url;
    const src = IMG_BASE + 'f-share.jpg';   // gebrandete Share-Card (Gradient + Logo + QR)
    const btn = $('rv-cta-share');
    // MOBIL: natives Share-Sheet (Insta/TikTok/WhatsApp direkt). Desktop-Share mit
    // Datei ist unzuverlaessig (macOS packt's als ZIP) — deshalb nur bei coarse pointer.
    if (matchMedia('(pointer:coarse)').matches && navigator.canShare) {
      try {
        const blob = await (await fetch(src)).blob();
        const file = new File([blob], 'social2scale-share.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, url }); return; }
      } catch (err) {
        if (err && err.name === 'AbortError') return;   // Nutzer hat abgebrochen
        console.error('[reveal] Native Share fehlgeschlagen:', err);
      }
    }
    // DESKTOP: EIN sauberes Bild (Share-Card) speichern + Caption/Link in die
    // Zwischenablage. Kein ZIP, kein Desktop-Share-Weirdness.
    try {
      const blob = await (await fetch(src)).blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = u; a.download = 'social2scale-share.jpg';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch (err) {
      console.error('[reveal] Share-Card-Download fehlgeschlagen:', err);
      window.open(src, '_blank');
    }
    try { await navigator.clipboard.writeText(text); } catch (e) {}
    rvBtnFlash(btn, 'Bild gespeichert · Text kopiert ✓');
  }
  function rvWireShare() {
    const el = $('rv-cta-share');
    if (el) el.addEventListener('click', rvShare);
  }

  // Kontakt-CTA: dieselbe Absicht wie der primaere Ruf -> selber Beacon, dann navigieren.
  function rvWireContact() {
    const el = $('rv-contact');
    if (!el) return;
    el.addEventListener('click', () => {
      try { if (navigator.sendBeacon) navigator.sendBeacon('/api/track?e=cta_call&t=' + TOKEN); } catch (err) {}
    });
  }

  // Captions (farbwelt-unabhaengig) einmal holen und in die Post-Karten setzen.
  // Fehlt die Datei, bleiben die Platzhalter — nie ein Fehlerzustand.
  let rvCaptions = [];
  async function rvLoadCaptions() {
    try {
      const res = await fetch('/api/content/' + TOKEN);
      const data = await res.json();
      if (Array.isArray(data.captions)) rvCaptions = data.captions;
    } catch (err) {
      console.error('[reveal] Captions nicht ladbar:', err);
    }
    document.querySelectorAll('.rv-cap-text').forEach((el) => {
      const t = rvCaptions[Number(el.dataset.cap)];
      el.textContent = t || 'Deine persönliche Caption gestalten wir im Paket mit dir.';
    });
  }
  function rvWireCaptionCopy() {
    document.querySelectorAll('.rv-cap-copy').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = rvCaptions[Number(btn.dataset.cap)];
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          const was = btn.textContent;
          btn.textContent = 'Kopiert ✓'; btn.classList.add('done');
          setTimeout(() => { btn.textContent = was; btn.classList.remove('done'); }, 1800);
          try { if (navigator.sendBeacon) navigator.sendBeacon('/api/track?e=cta_caption&t=' + TOKEN); } catch (e) {}
        } catch (err) {
          console.error('[reveal] Caption kopieren fehlgeschlagen:', err);
        }
      });
    });
  }

  // Scroll-Hinweis ausblenden, sobald der Switcher sichtbar ist — kein
  // Scroll-Listener, IntersectionObserver reicht.
  function rvWireScrollHint() {
    const hint = $('rv-hint'), anchor = $('rv-switcher');
    if (!hint || !anchor) return;
    const hintIo = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { hint.style.opacity = '0'; hintIo.disconnect(); }
    }, { threshold: .1 });
    hintIo.observe(anchor);
  }

  function revealSection() {
    const section = $('reveal');
    if (!section) return;
    section.hidden = false;
    const hint = $('rv-hint');
    if (hint) hint.hidden = false;   // Scroll-Hinweis erst JETZT (nicht schon waehrend des Bauens)
    rvApplyWorld(0);
    rvWireDots();
    rvWireSwipeNudge();
    rvWireSwitcher();
    rvWirePrimaryCta();
    rvWireDownload();
    rvWireReport();
    rvWireShare();
    rvWireContact();
    rvWireCaptionCopy();
    rvLoadCaptions();
    rvWireScrollHint();

    const rvs = [...section.querySelectorAll('.rv')];
    if (reduce) {
      rvs.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .18 });
    rvs.forEach((el) => io.observe(el));
    // die obersten sofort gestaffelt zeigen (Blur-up), Rest beim Reinscrollen.
    rvs.slice(0, 4).forEach((el, i) => setTimeout(() => el.classList.add('in'), 120 + i * 130));

    // "Scroll dich rein" für den Nutzer erledigen: sanft ins Reveal ziehen, damit
    // nicht der fertige 100%-Build-Screen als toter Rest oben stehen bleibt.
    // Guard: NUR wenn er noch ganz oben ist (scrollY<40) — nie jemanden überfahren,
    // der schon selbst scrollt. Bei reduzierter Bewegung: kein Auto-Scroll.
    if (!reduce) setTimeout(() => {
      if (window.scrollY < 40) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1150);
  }
`;
