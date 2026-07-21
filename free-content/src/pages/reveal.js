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
  #reveal{position:relative;z-index:2;max-width:34rem;margin:0 auto;padding:2.4rem 1.25rem 4rem;display:flex;flex-direction:column;align-items:center;text-align:center}
  #reveal[hidden]{display:none}
  .rv-eyebrow{font-family:var(--ff-label);font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);display:inline-flex;align-items:center;gap:.55rem}
  .rv-eyebrow .dot{width:22px;height:1.5px;border-radius:2px;background:var(--flow);box-shadow:0 0 8px rgba(0,184,136,.45)}
  .rv-h2{font-family:var(--ff-serif);font-weight:500;font-size:clamp(2rem,1.5rem + 3vw,3.2rem);line-height:1.02;letter-spacing:-.025em;margin:1rem 0 .5rem;text-wrap:balance}
  .rv-h2 em{font-style:italic;font-weight:440;background:var(--flow);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .rv-sub{font-size:1rem;color:var(--muted);max-width:30ch;margin:0 auto}

  .rv{opacity:0;transform:translateY(28px);filter:blur(10px);transition:opacity .9s var(--e-out),transform 1s var(--e-spring),filter .9s var(--e-out)}
  .rv.in{opacity:1;transform:none;filter:none}

  .rv-space{perspective:1500px;margin:2rem 0 1.6rem}
  .rv-phone{position:relative;width:min(74vw,280px);aspect-ratio:300/600;border-radius:50px;padding:10px;background:linear-gradient(150deg,#23262B,#0B0D10 60%);box-shadow:0 0 0 1.5px #2b2e33,0 2px 2px rgba(255,255,255,.08) inset,0 60px 120px -45px rgba(0,0,0,.9),0 0 80px -14px rgba(0,184,136,.18),0 0 90px -20px rgba(31,166,224,.14)}
  .rv-ios{position:relative;height:100%;border-radius:40px;overflow:hidden;background:#000;font-family:var(--ff-ios);display:flex;flex-direction:column}
  .rv-island{position:absolute;top:8px;left:50%;transform:translateX(-50%);width:78px;height:22px;background:#000;border-radius:13px;z-index:40}
  .rv-statusbar{display:flex;align-items:center;justify-content:space-between;padding:11px 20px 2px;color:#fff;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
  .rv-statusbar .sys{display:flex;align-items:center;gap:4px}
  .rv-home-ind{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:100px;height:5px;border-radius:3px;background:rgba(255,255,255,.9);z-index:40}
  .rv-ig{flex:1;background:#000;color:#fff;display:flex;flex-direction:column;text-align:left}
  .rv-ig-top{display:flex;align-items:center;padding:5px 13px 7px;font-size:14px;font-weight:700}
  .rv-ig-top .chev{font-size:9px;margin-left:4px}
  .rv-ig-top .sp{margin-left:auto;font-size:15px;letter-spacing:2px}
  .rv-ig-prof{display:flex;align-items:center;gap:18px;padding:2px 14px 7px}
  .rv-ig-av{width:56px;height:56px;border-radius:50%;flex:none;padding:2px;background:linear-gradient(45deg,#F58529,#DD2A7B,#8134AF);overflow:hidden}
  .rv-ig-av img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;opacity:0;transition:opacity .5s var(--e-out)}
  .rv-ig-av img.loaded{opacity:1}
  .rv-ig-stats{display:flex;flex:1;justify-content:space-around}
  .rv-ig-stat{text-align:center}
  .rv-ig-stat b{display:block;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
  .rv-ig-stat span{font-size:11px;color:rgba(255,255,255,.85)}
  .rv-ig-meta{padding:0 14px 8px}
  .rv-ig-meta .n{font-size:12.5px;font-weight:700}
  .rv-ig-meta .b{font-size:12.5px;color:rgba(255,255,255,.9);line-height:1.35}
  .rv-ig-tabs{display:flex;border-top:.5px solid rgba(255,255,255,.14)}
  .rv-ig-tabs .tab{flex:1;text-align:center;padding:8px 0;opacity:.5;font-size:15px}
  .rv-ig-tabs .tab.act{opacity:1;border-bottom:1.5px solid #fff}
  .rv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5px;background:#000}
  .rv-tile{aspect-ratio:1;position:relative;overflow:hidden;background:#0c0c0c}
  .rv-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s var(--e-out)}
  .rv-tile img.loaded{opacity:1}

  .rv-switcher{display:inline-flex;gap:4px;padding:4px;border-radius:100px;background:rgba(244,245,243,.05);border:1px solid var(--hair);margin-bottom:2.2rem}
  .rv-switcher button{font-family:var(--ff-label);font-weight:700;font-size:12.5px;letter-spacing:.02em;color:var(--muted);background:transparent;border:0;padding:.55rem 1.1rem;border-radius:100px;cursor:pointer;display:inline-flex;align-items:center;gap:.5rem;transition:color .3s var(--e-out),background .4s var(--e-out)}
  .rv-switcher button .sw{width:13px;height:13px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3)}
  .rv-switcher button.act{color:var(--emerald-ink);background:var(--flow)}
  .rv-switcher button.act .sw{border-color:rgba(4,32,26,.35)}
  .rv-sw-a{background:linear-gradient(135deg,#EAD9CE,#C2410C)}
  .rv-sw-b{background:linear-gradient(135deg,#CFE0E4,#1FA6E0)}

  .rv-offer{display:flex;flex-direction:column;align-items:center;gap:1rem;width:100%}
  .rv-offer h3{font-family:var(--ff-serif);font-weight:480;font-size:clamp(1.5rem,1.2rem + 1.6vw,2.1rem);letter-spacing:-.02em;line-height:1.08}
  .rv-offer .p{color:var(--muted);font-size:.96rem;max-width:34ch}
  .rv-cta{display:inline-flex;align-items:center;gap:.7rem;font-family:var(--ff-label);font-weight:700;font-size:15px;letter-spacing:.01em;text-decoration:none;padding:1rem 1.1rem 1rem 1.5rem;border-radius:100px;color:var(--emerald-ink);background:var(--flow);box-shadow:0 16px 40px -16px rgba(0,184,136,.6),0 16px 40px -20px rgba(31,166,224,.45),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .4s var(--e-spring)}
  .rv-cta:active{transform:scale(.97)}
  .rv-cta .ic{width:30px;height:30px;border-radius:50%;background:rgba(4,32,26,.16);display:flex;align-items:center;justify-content:center;font-size:15px;transition:transform .4s var(--e-spring)}
  .rv-cta:hover .ic{transform:translate(3px,-1px)}
  .rv-cta2{font-family:var(--ff-label);font-weight:600;font-size:14px;color:var(--ink);text-decoration:none;padding:.8rem 1.3rem;border-radius:100px;border:1px solid var(--hair-2);background:rgba(244,245,243,.04);cursor:pointer;transition:border-color .3s var(--e-out),background .3s var(--e-out)}
  .rv-cta2:hover{border-color:rgba(0,184,136,.4);background:rgba(0,184,136,.08)}
  .rv-wm,.rv-disclaimer{font-size:.8rem;color:var(--faint);max-width:34ch;margin-top:.3rem;line-height:1.5}

  .rv-scrollhint{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:5;font-family:var(--ff-label);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);display:flex;flex-direction:column;align-items:center;gap:6px;animation:rvbob 2s var(--e-out) infinite}
  .rv-scrollhint .arw{width:1px;height:20px;background:linear-gradient(var(--emerald-soft),transparent)}
  @keyframes rvbob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(5px)}}

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
  return `
<section id="reveal" hidden>
  <span class="rv-eyebrow rv"><span class="dot"></span>${esc(copy.eyebrow)}</span>
  <h2 class="rv-h2 rv">${esc(copy.head)} <em>${esc(copy.headAccent)}</em></h2>
  <p class="rv-sub rv">${esc(copy.sub)}</p>

  <div class="rv-space rv">
    <div class="rv-phone">
      <div class="rv-ios">
        <div class="rv-island"></div>
        <div class="rv-statusbar">
          <span id="rv-clock">9:41</span>
          <span class="sys">
            <svg width="16" height="10" viewBox="0 0 17 11" fill="#fff"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
            <svg width="15" height="10" viewBox="0 0 16 11" fill="#fff"><path d="M8 2.2c2.1 0 4 .8 5.4 2.1l1.3-1.4C13 1.2 10.6.2 8 .2S3 1.2 1.3 2.9l1.3 1.4C4 3 5.9 2.2 8 2.2zm0 3.3c1.1 0 2.2.4 3 1.2l1.3-1.4C11.9 4 10 3.2 8 3.2s-3.9.8-5.3 2.1L4 6.7c.8-.8 1.9-1.2 3-1.2zm0 3.2c.6 0 1.1.2 1.5.6L8 11l-1.5-1.4c.4-.4.9-.6 1.5-.6z"/></svg>
            <svg width="23" height="11" viewBox="0 0 25 12"><rect x="1" y="1" width="20" height="10" rx="3" fill="none" stroke="#fff" stroke-opacity=".5"/><rect x="2.5" y="2.5" width="15" height="7" rx="1.5" fill="#fff"/><rect x="22.5" y="4" width="1.5" height="4" rx=".75" fill="#fff" fill-opacity=".5"/></svg>
          </span>
        </div>
        <div class="rv-ig">
          <div class="rv-ig-top">dein.profil<span class="chev">▾</span><span class="sp">⋯</span></div>
          <div class="rv-ig-prof">
            <div class="rv-ig-av"><img id="rv-avatar" alt="" loading="lazy"></div>
            <div class="rv-ig-stats">
              <div class="rv-ig-stat"><b>9</b><span>Beiträge</span></div>
              <div class="rv-ig-stat"><b>1.2k</b><span>Follower</span></div>
              <div class="rv-ig-stat"><b>318</b><span>Gefolgt</span></div>
            </div>
          </div>
          <div class="rv-ig-meta"><div class="n">Dein Feed</div><div class="b">ist fertig, live.</div></div>
          <div class="rv-ig-tabs"><div class="tab act">▦</div><div class="tab">▷</div><div class="tab">☆</div></div>
          <div class="rv-grid" id="rv-grid">
            <div class="rv-tile"><img data-slot="s1" alt="" loading="lazy"></div>
            <div class="rv-tile"><img data-slot="s2" alt="" loading="lazy"></div>
            <div class="rv-tile"><img data-slot="s3" alt="" loading="lazy"></div>
          </div>
        </div>
        <div class="rv-home-ind"></div>
      </div>
    </div>
  </div>

  <div class="rv-switcher rv" id="rv-switcher" role="group" aria-label="Farbwelt wählen">
    <button class="act" type="button" data-welt="0"><span class="sw rv-sw-a"></span>Farbwelt A</button>
    <button type="button" data-welt="1"><span class="sw rv-sw-b"></span>Farbwelt B</button>
  </div>

  <div class="rv-offer">
    <h3 class="rv">${esc(copy.offerHead)}</h3>
    <p class="p rv">${esc(copy.offerSub)}</p>
    <a class="rv-cta rv" id="rv-cta-primary" href="${ANFRAGE_URL}">${esc(copy.ctaPrimary)} <span class="ic">→</span></a>
    <!-- Digistore-CTA später -->
    <a class="rv-cta2 rv" id="rv-cta-download" href="#">${esc(copy.ctaSecondary)}</a>
    <p class="rv-wm rv">${esc(copy.wmNote)}</p>
    <p class="rv-disclaimer rv">&lowast; Beispiel-Vorschau — deinen echten Feed gestalten wir danach persönlich mit dir.</p>
  </div>
</section>

<div class="rv-scrollhint" id="rv-hint"><span>scroll</span><span class="arw"></span></div>`;
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

  function rvLoadImg(img, src) {
    img.classList.remove('loaded');
    img.onload = function () { img.classList.add('loaded'); };
    img.onerror = function () { console.error('[reveal] Bild nicht ladbar:', src); };
    img.src = src;
  }

  function rvApplyWorld(world) {
    rvActiveWorld = world;
    const avatar = $('rv-avatar');
    if (avatar) rvLoadImg(avatar, IMG_BASE + 'f-' + world + '-profil.jpg');
    document.querySelectorAll('#rv-grid img').forEach((img) => {
      rvLoadImg(img, IMG_BASE + 'f-' + world + '-' + img.dataset.slot + '.jpg');
    });
    document.querySelectorAll('#rv-switcher button').forEach((b) => {
      b.classList.toggle('act', Number(b.dataset.welt) === world);
    });
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

  // Laedt die 4 Bilder (Profil + 3 Slides) der GERADE aktiven Farbwelt einzeln
  // herunter (kein Zip/Canvas-Compose — <a download> je Bild reicht).
  function rvWireDownload() {
    const el = $('rv-cta-download');
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.sendBeacon('/api/track?e=cta_save&t=' + TOKEN);
      ['profil', 's1', 's2', 's3'].forEach((slot, i) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = IMG_BASE + 'f-' + rvActiveWorld + '-' + slot + '.jpg';
          a.download = 'social2scale-vorschau-' + slot + '.jpg';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, i * 150);
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
    rvApplyWorld(0);
    rvWireSwitcher();
    rvWirePrimaryCta();
    rvWireDownload();
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
  }
`;
