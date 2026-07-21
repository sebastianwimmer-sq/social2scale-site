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

const ASSET_BASE = 'https://social2scale.com/assets';
const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAAD5FwCxWtZhzGlpX';

const PAGE_STYLE = `
  .app{position:relative;z-index:2;min-height:100dvh;max-width:460px;margin:0 auto;display:flex;flex-direction:column}
  /* Kopfleiste */
  .top{display:flex;align-items:center;gap:12px;padding:1rem 1.25rem .4rem}
  .wm-logo{height:22px;width:auto;max-width:158px;object-fit:contain;object-position:left center;display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.5))}
  .prog{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.09);overflow:hidden}
  .prog>i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--emerald-soft),var(--emerald) 38%,var(--teal) 66%,var(--emerald-soft));background-size:230% 100%;transform-origin:left;transform:scaleX(.02);box-shadow:0 0 12px rgba(31,201,152,.55);transition:transform .7s var(--e-spring);animation:flow 2.6s linear infinite}
  @keyframes flow{to{background-position:-230% 0}}
  .cnt{font-family:var(--ff-label);font-size:10.5px;font-weight:600;letter-spacing:.08em;color:var(--faint);font-variant-numeric:tabular-nums}

  /* ── BUEHNE mit schwebendem Glas-iPhone ── */
  .stage{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;perspective:1400px;padding:.4rem 0}
  .disclaimer{font-family:var(--ff-body);font-size:.72rem;line-height:1.45;color:var(--faint);text-align:center;max-width:30ch;margin-top:1rem}
  .device{position:relative;width:min(60%,232px);will-change:transform}
  /* Doppelrand: aeussere Metallschale */
  .device .shell{position:relative;border-radius:34px;padding:6px;background:linear-gradient(155deg,#31353c 0%,#15171b 38%,#080a0d 100%);
    box-shadow:0 0 0 .5px rgba(255,255,255,.14), inset 0 1px 1px rgba(255,255,255,.22), inset 0 -1px 2px rgba(0,0,0,.6),
      0 55px 90px -42px rgba(0,0,0,.9), 0 0 70px -16px var(--mood);transition:box-shadow 1.3s var(--e-out)}
  .pv{position:relative;border-radius:28px;overflow:hidden;background:#000;font-family:var(--ff-ios);box-shadow:inset 0 1px 1px rgba(255,255,255,.1)}
  /* Screen-Glare (Glas-Reflexion) */
  .pv::after{content:"";position:absolute;inset:0;z-index:8;pointer-events:none;background:linear-gradient(133deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.03) 18%,transparent 40%)}
  /* Bodenreflexion */
  .device .refl{position:absolute;left:8%;right:8%;bottom:-30px;height:36px;border-radius:50%;background:radial-gradient(ellipse,var(--mood),transparent 72%);opacity:.32;filter:blur(13px);transition:background 1.3s var(--e-out);animation:breathe 5.5s var(--e-out) infinite}
  @keyframes breathe{0%,100%{opacity:.28;transform:scaleX(.96)}50%{opacity:.5;transform:scaleX(1.06)}}
  .pv-bar{display:flex;align-items:center;padding:8px 11px 5px;color:#fff;font-size:10.5px;font-weight:700}
  .pv-bar .h{transition:opacity .4s}.pv-bar .dots{margin-left:auto;letter-spacing:1px;opacity:.55}
  .pv-prof{display:flex;align-items:center;gap:11px;padding:2px 11px 7px}
  .pv-av{width:42px;height:42px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;color:#04130D;background:linear-gradient(135deg,var(--mood),#0E1319);box-shadow:inset 0 1px 2px rgba(255,255,255,.3);transition:background 1s var(--e-out),transform .5s var(--e-spring)}
  .pv-stats{display:flex;gap:9px;flex:1;justify-content:space-around;color:#fff}
  .pv-stat{text-align:center;white-space:nowrap}.pv-stat b{display:block;font-size:11px;font-weight:700}.pv-stat span{font-size:7.5px;color:rgba(255,255,255,.65)}
  .pv-meta{padding:0 11px 7px;color:#fff}
  .pv-meta .n{font-size:10.5px;font-weight:700;min-height:12px;transition:opacity .4s}
  .pv-meta .b{font-size:9.5px;color:rgba(255,255,255,.8);min-height:11px;line-height:1.3;transition:opacity .4s}
  .pv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5px;background:#000}
  .pv-tile{aspect-ratio:1;position:relative;overflow:hidden;background:#0c0c0c;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;font-family:var(--ff-label);font-weight:600;font-size:6px;line-height:1.15;color:transparent;transition:background .8s var(--e-out),color .6s var(--e-out)}
  .pv-tile.f1{background:var(--mood-t);color:var(--mood-ti)}.pv-tile.f2{background:var(--mood);color:#04130D}.pv-tile.f3{background:#ECECE4;color:#23201C}
  .pv-tile.empty::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.05) 50%,transparent 80%);background-size:220% 100%;animation:sh 1.9s linear infinite}
  @keyframes sh{to{background-position:-220% 0}}
  .pop{animation:pop .55s var(--e-spring)}
  @keyframes pop{0%{transform:scale(.85);opacity:.4;filter:blur(3px)}100%{transform:scale(1);opacity:1;filter:blur(0)}}

  /* ── GLAS-SHEET (Frage) ── */
  .sheet{position:relative;flex:none;margin:0 .5rem .5rem;border-radius:30px 30px 26px 26px;padding:1px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 30%,transparent);box-shadow:0 -20px 50px -30px rgba(0,0,0,.7)}
  .sheet-in{border-radius:29px 29px 25px 25px;background:linear-gradient(180deg,rgba(12,16,20,.72),rgba(7,10,13,.82));-webkit-backdrop-filter:blur(30px) saturate(1.5);backdrop-filter:blur(30px) saturate(1.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.1);padding:1.1rem 1.35rem 1.4rem;min-height:41vh;display:flex;flex-direction:column;justify-content:center}
  .grab{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,.16);margin:0 auto 1.1rem}

  .q{display:none}.q.on{display:block}
  .q.on>*{opacity:0;transform:translateY(14px);filter:blur(6px);animation:rise .6s var(--e-out) forwards}
  .q.on>*:nth-child(1){animation-delay:.02s}.q.on>*:nth-child(2){animation-delay:.09s}.q.on>*:nth-child(3){animation-delay:.16s}.q.on>*:nth-child(4){animation-delay:.23s}.q.on>*:nth-child(5){animation-delay:.3s}
  @keyframes rise{to{opacity:1;transform:none;filter:none}}
  .eyebrow{font-family:var(--ff-label);font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--emerald-soft)}
  h2{font-family:var(--ff-serif);font-weight:460;font-size:clamp(1.7rem,1.3rem + 2.6vw,2.3rem);line-height:1.02;letter-spacing:-.025em;margin:.65rem 0 1rem;text-wrap:balance}
  h2 em{font-style:italic;font-weight:430;background:var(--flow);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

  /* Doppelrand-Glas-Eingabe */
  .field{border-radius:16px;padding:1px;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.02));transition:background .3s var(--e-out)}
  .field:focus-within{background:linear-gradient(180deg,rgba(0,184,136,.6),rgba(31,166,224,.3))}
  .field-in{position:relative;border-radius:15px;background:linear-gradient(180deg,rgba(16,19,23,.9),rgba(9,11,14,.95));box-shadow:inset 0 1px 1px rgba(255,255,255,.08)}
  .field .pre{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--faint);font-size:1.05rem;pointer-events:none;z-index:1}
  input[type=text],input[type=email],textarea{width:100%;font-family:var(--ff-body);font-size:1.08rem;color:var(--ink);background:transparent;border:0;padding:15px 16px;outline:none}
  input.hashandle{padding-left:30px}
  textarea{resize:none;min-height:78px;line-height:1.5}
  ::placeholder{color:var(--faint)}
  .chips{display:flex;flex-wrap:wrap;gap:9px}
  .chip{position:relative;font-family:var(--ff-label);font-weight:600;font-size:13.5px;color:var(--ink);border:0;border-radius:100px;padding:1px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.02));cursor:pointer;transition:transform .3s var(--e-spring)}
  .chip span{display:block;border-radius:100px;padding:10px 17px;background:linear-gradient(180deg,rgba(18,21,25,.9),rgba(11,13,16,.95));box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:background .3s var(--e-out),color .3s}
  .chip:hover{transform:translateY(-2px)}
  .chip[aria-pressed=true]{background:var(--flow)}
  .chip[aria-pressed=true] span{background:radial-gradient(130% 130% at 0% 0%,color-mix(in oklab,var(--mood) 30%,transparent),rgba(14,17,20,.92) 62%);color:#fff}

  .react{margin-top:10px;font-size:.9rem;color:var(--emerald-soft);min-height:20px;display:flex;align-items:center;gap:7px;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s var(--e-out)}
  .react.show{opacity:1;transform:none}
  .react .tick{display:inline-flex;align-items:center;color:var(--emerald-soft)}
  .next .ic svg,.react .tick svg{display:block}
  .react.warn{color:#F0C08B}.react.warn b{color:var(--emerald-soft);cursor:pointer;border-bottom:1px solid rgba(0,184,136,.4)}

  .foot{margin-top:1.15rem;display:flex;flex-direction:column;gap:11px}
  /* Magnetischer Button-in-Button */
  .next{position:relative;text-decoration:none;font-family:var(--ff-label);font-weight:700;font-size:15px;color:var(--emerald-ink);background:var(--flow);border:0;border-radius:100px;padding:6px 6px 6px 24px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;overflow:hidden;
    box-shadow:0 16px 38px -14px rgba(0,184,136,.6),0 16px 38px -18px rgba(31,166,224,.45),inset 0 1px 0 rgba(255,255,255,.4);transition:transform .35s var(--e-spring)}
  .next::before{content:"";position:absolute;top:0;left:-30%;width:35%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);transition:left .6s var(--e-out)}
  .next:hover::before{left:130%}
  .next .lab{padding:9px 0}
  .next:active{transform:scale(.975)}
  .next:disabled{opacity:.6;cursor:not-allowed}
  .next .ic{width:38px;height:38px;border-radius:50%;background:rgba(4,32,26,.18);display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:inset 0 1px 1px rgba(255,255,255,.25);transition:transform .35s var(--e-spring)}
  .next:hover .ic{transform:translate(3px,-1px) scale(1.06)}
  .back{background:none;border:0;color:var(--faint);font-family:var(--ff-label);font-weight:600;font-size:12.5px;cursor:pointer;align-self:center;padding:4px;transition:color .25s}
  .back:hover{color:var(--muted)}
  .hint{font-family:var(--ff-body);font-size:.82rem;color:var(--faint);text-align:center}
  .consent{display:flex;gap:9px;align-items:flex-start;font-size:.8rem;color:var(--muted);line-height:1.45}
  .consent input{margin-top:2px;accent-color:var(--emerald)}
  .turnstile-wrap{display:flex;justify-content:center}

  .consent a{color:var(--emerald-soft);text-decoration:none;border-bottom:1px solid rgba(0,184,136,.35)}
  .legal{margin-top:.9rem;text-align:center;font-family:var(--ff-label);font-size:10px;letter-spacing:.06em;color:var(--faint)}
  .legal a{color:var(--muted);text-decoration:none;transition:color .2s}
  .legal a:hover{color:var(--emerald-soft)}
  /* Kurze Screens (SE & Landscape): Handy skaliert, Sheet passt sich an, nichts ueberlappt den Header */
  @media (max-height:780px) and (max-width:520px){ .device{width:min(40vw,140px)} .sheet-in{min-height:auto;padding:.9rem 1.3rem 1.15rem} h2{font-size:1.55rem;margin:.5rem 0 .75rem} .disclaimer{margin-top:.5rem;font-size:.66rem} .foot{margin-top:.85rem} .stage{padding:.1rem 0} }
  @media (max-height:650px) and (max-width:520px){ .device{width:min(33vw,112px)} h2{font-size:1.35rem} }
  @media (prefers-reduced-motion:reduce){.q.on>*{opacity:1;transform:none;filter:none}}
`;

function pageMarkup(turnstileSiteKey) {
  return `
<div class="app">
  <div class="top">
    <img class="wm-logo" src="${ASSET_BASE}/sig-wordmark.png" alt="social2scale" height="24">
    <span class="prog"><i id="bar"></i></span>
    <span class="cnt" id="cnt">1/5</span>
  </div>

  <div class="stage">
    <div class="device" id="device">
      <div class="shell"><div class="pv">
        <div class="pv-bar"><span class="h" id="pv-handle">dein.profil</span><span class="dots">···</span></div>
        <div class="pv-prof">
          <div class="pv-av" id="pv-av">·</div>
          <div class="pv-stats"><div class="pv-stat"><b>9</b><span>Beiträge</span></div><div class="pv-stat"><b>1.2k</b><span>Follower</span></div><div class="pv-stat"><b>318</b><span>Folgt</span></div></div>
        </div>
        <div class="pv-meta"><div class="n" id="pv-name">&nbsp;</div><div class="b" id="pv-bio">&nbsp;</div></div>
        <div class="pv-grid" id="pv-grid">
          <div class="pv-tile empty"></div><div class="pv-tile empty"></div><div class="pv-tile empty"></div>
          <div class="pv-tile empty"></div><div class="pv-tile empty"></div><div class="pv-tile empty"></div>
        </div>
      </div></div>
      <div class="refl"></div>
    </div>
    <p class="disclaimer">&lowast; Beispiel-Vorschau — deinen echten Feed gestalten wir danach persönlich mit dir.</p>
  </div>

  <div class="sheet"><div class="sheet-in">
    <div class="grab"></div>
    <div id="card">
      <div class="q on" data-step="0">
        <span class="eyebrow">Deine Vorschau</span>
        <h2>Schau zu, wie dein Feed <em>entsteht</em>.</h2>
        <div class="foot"><button class="next" data-go="1"><span class="lab">Los geht’s</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></button><p class="hint">In 60 Sekunden: dein Instagram-Auftritt, maßgeschneidert</p></div>
      </div>

      <div class="q" data-step="1">
        <span class="eyebrow">Dein Name</span>
        <h2>Wie dürfen wir dich <em>nennen</em>?</h2>
        <div class="field"><div class="field-in"><input type="text" id="f-name" placeholder="Dein Vorname" autocomplete="given-name"></div></div>
        <div class="react" id="r-name"></div>
        <div class="foot"><button class="next" data-req="f-name" data-go="2"><span class="lab">Weiter</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></button><button class="back" data-go="0">Zurück</button></div>
      </div>

      <div class="q" data-step="2">
        <span class="eyebrow">Dein Handle</span>
        <h2>Dein <em>Instagram-Name</em>?</h2>
        <div class="field"><div class="field-in"><span class="pre">@</span><input type="text" id="f-handle" class="hashandle" placeholder="deinname" autocapitalize="off" autocorrect="off"></div></div>
        <div class="react" id="r-handle"></div>
        <div class="foot"><button class="next" data-req="f-handle" data-go="3"><span class="lab">Weiter</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></button><button class="back" data-go="1">Zurück</button></div>
      </div>

      <div class="q" data-step="3">
        <span class="eyebrow">Dein Thema</span>
        <h2>Worum geht’s <em>bei dir</em>?</h2>
        <div class="field"><div class="field-in"><textarea id="f-thema" placeholder="z.B. Yoga & Achtsamkeit für gestresste Berufstätige."></textarea></div></div>
        <div class="react" id="r-thema"></div>
        <div class="foot"><button class="next" data-req="f-thema" data-go="4"><span class="lab">Weiter</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></button><button class="back" data-go="2">Zurück</button></div>
      </div>

      <div class="q" data-step="4">
        <span class="eyebrow">Deine Stimmung</span>
        <h2>Welche <em>Stimmung</em> bist du?</h2>
        <div class="chips" id="stimmung" role="group" aria-label="Stimmung">
          <button class="chip" data-mood="ruhig" aria-pressed="false"><span>Ruhig &amp; natürlich</span></button>
          <button class="chip" data-mood="klar" aria-pressed="false"><span>Klar &amp; professionell</span></button>
          <button class="chip" data-mood="warm" aria-pressed="false"><span>Warm &amp; nahbar</span></button>
          <button class="chip" data-mood="mutig" aria-pressed="false"><span>Kraftvoll &amp; mutig</span></button>
        </div>
        <div class="react" id="r-mood"></div>
        <div class="foot"><button class="next" data-req="stimmung" data-go="5"><span class="lab">Weiter</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></button><button class="back" data-go="3">Zurück</button></div>
      </div>

      <div class="q" data-step="5">
        <span class="eyebrow">Letzter Schritt</span>
        <h2>Fast fertig — <em>wohin damit</em>?</h2>
        <div class="field"><div class="field-in"><input type="email" id="f-mail" placeholder="dein@email.de" autocomplete="email" autocapitalize="off"></div></div>
        <div class="react" id="r-mail"></div>
        <div class="foot">
          <label class="consent"><input type="checkbox" id="f-consent"><span>Ja, schickt mir meine Gratis-Vorschau. Es gilt die <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a> — abmelden jederzeit mit einem Klick.</span></label>
          <div class="turnstile-wrap"><div class="cf-turnstile" data-sitekey="${turnstileSiteKey}" data-theme="dark"></div></div>
          <button class="next" id="btnSubmit" data-req="f-mail"><span class="lab">Meinen Feed bauen</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span></button>
          <button class="back" data-go="4">Zurück</button>
        </div>
      </div>

      <div class="q" data-step="6">
        <span class="eyebrow">Fast geschafft</span>
        <h2>Schau in dein <em>Postfach</em>, <span id="echo">…</span>.</h2>
        <p class="hint" style="text-align:left;font-size:.92rem;color:var(--muted);margin-bottom:.2rem">Ein Bestätigungs-Link ist unterwegs. Ein Klick — und dein Feed oben wird live fertig gebaut.</p>
        <div class="foot"><a class="next" id="openmail" target="_blank" rel="noopener"><span class="lab">Postfach öffnen</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></a><button class="back" id="resend">Mail nicht angekommen? Nochmal schicken</button><button class="back" data-go="5">E-Mail ändern</button></div>
      </div>
    </div>
    <p class="legal"><a href="https://social2scale.com/impressum/" target="_blank" rel="noopener">Impressum</a> · <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutz</a></p>
  </div></div>
</div>`;
}

// Live-Vorschau, Stimmung->Farbwelt, E-Mail-Tippfehler-Vorschlag, Postfach-oeffnen,
// Bokeh/Parallaxe: 1:1 aus dem Prototyp. Nur der letzte "Weiter"-Klick (Schritt 5)
// wurde von reiner Navigation auf einen echten POST /api/free-content umgestellt.
const PAGE_SCRIPT = `
  const $=(s)=>document.querySelector(s), qs=[...document.querySelectorAll('.q')];
  const TOTAL=5; let step=0;
  const START=Date.now();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOODS={
    ruhig:{a:'#5FA88C',t:'#1B2C24',ti:'#E7EFE9',word:'ruhig & natürlich'},
    klar:{a:'#1FA6E0',t:'#123244',ti:'#EAF4F8',word:'klar & professionell'},
    warm:{a:'#D98A5A',t:'#2B1D14',ti:'#F3E6DC',word:'warm & nahbar'},
    mutig:{a:'#E4573C',t:'#2A1310',ti:'#F6E4DF',word:'kraftvoll & mutig'}
  };
  function show(n){
    qs.forEach(q=>q.classList.toggle('on',+q.dataset.step===n)); step=n;
    const s=Math.min(Math.max(n,1),TOTAL);
    $('#bar').style.transform=\`scaleX(\${s/TOTAL})\`;
    $('#cnt').textContent=\`\${s}/\${TOTAL}\`; $('#cnt').style.visibility=n===0?'hidden':'visible';
    const inp=qs[n].querySelector('input,textarea'); if(inp) setTimeout(()=>inp.focus(),160);
    if(n===6){$('#echo').textContent=($('#f-name').value.trim()||'schön');const WM={'gmail.com':'https://mail.google.com','googlemail.com':'https://mail.google.com','web.de':'https://web.de','gmx.de':'https://www.gmx.net','gmx.net':'https://www.gmx.net','t-online.de':'https://email.t-online.de','outlook.com':'https://outlook.live.com','outlook.de':'https://outlook.live.com','hotmail.com':'https://outlook.live.com','hotmail.de':'https://outlook.live.com','yahoo.com':'https://mail.yahoo.com','yahoo.de':'https://mail.yahoo.com','icloud.com':'https://www.icloud.com/mail','me.com':'https://www.icloud.com/mail'};const mv=$('#f-mail').value.trim();const dom=mv.slice(mv.lastIndexOf('@')+1).toLowerCase();const om=$('#openmail');if(WM[dom]){om.href=WM[dom];om.style.display='';}else{om.style.display='none';}}
  }
  function react(id,html,cls){const el=$(id);el.innerHTML=html;el.className='react show'+(cls?' '+cls:'');}
  function clr(id){$(id).className='react';}
  const pvH=$('#pv-handle'),pvAv=$('#pv-av'),pvN=$('#pv-name'),pvB=$('#pv-bio');
  function bump(el){if(reduce)return;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}

  $('#f-name').addEventListener('input',e=>{const v=e.target.value.trim();pvN.textContent=v||' ';pvAv.textContent=v?v[0].toUpperCase():'·';if(v){bump(pvAv);react('#r-name',\`Schön, \${v}! Deine Vorschau wird persönlich.\`);}else clr('#r-name');});
  $('#f-handle').addEventListener('input',e=>{let v=e.target.value.trim().replace(/^@+/,'').replace(/\\s+/g,'');pvH.textContent=v||'dein.profil';if(v)bump(pvH);if(v.length>=3)react('#r-handle',\`@\${v} — sieht gut aus, das nehmen wir.\`);else clr('#r-handle');});
  $('#f-thema').addEventListener('input',e=>{const v=e.target.value.trim();pvB.textContent=v?v.slice(0,40)+(v.length>40?'…':''):' ';const tl=document.querySelectorAll('#pv-grid .pv-tile');if(v.length>8){['Dein Thema','Warum jetzt?','3 Schritte'].forEach((t,i)=>tl[i].textContent=t);react('#r-thema',\`Verstanden — daraus bauen wir deine Posts.\`);}else clr('#r-thema');});
  document.querySelectorAll('#stimmung .chip').forEach(c=>c.addEventListener('click',()=>{
    document.querySelectorAll('#stimmung .chip').forEach(x=>x.setAttribute('aria-pressed',x===c?'true':'false'));
    const m=MOODS[c.dataset.mood],R=document.documentElement.style;
    R.setProperty('--mood',m.a);R.setProperty('--mood-t',m.t);R.setProperty('--mood-ti',m.ti);
    const tl=document.querySelectorAll('#pv-grid .pv-tile'),cls=['f1','f2','f3','f2','f3','f1'],lab=['Dein Thema','Warum jetzt?','3 Schritte','Zitat','Einblick','Über dich'];
    tl.forEach((t,i)=>{t.classList.remove('empty','f1','f2','f3');t.classList.add(cls[i]);bump(t);if(!t.textContent.trim())t.textContent=lab[i];});
    bump(pvAv);react('#r-mood',\`\${m.word} — deine Farbwelt steht.\`);
  }));

  const DOM=['gmail.com','googlemail.com','web.de','gmx.de','gmx.net','t-online.de','hotmail.com','outlook.de','outlook.com','yahoo.de','yahoo.com','icloud.com','me.com'];
  function lev(a,b){const m=a.length,n=b.length,d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
  function suggest(mail){const at=mail.lastIndexOf('@');if(at<1)return null;const dom=mail.slice(at+1).toLowerCase();if(!dom||DOM.includes(dom))return null;let best=null,bd=3;for(const d of DOM){const x=lev(dom,d);if(x<bd){bd=x;best=d;}}return best?mail.slice(0,at+1)+best:null;}
  function validMail(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v.trim());}
  $('#f-mail').addEventListener('input',e=>{const v=e.target.value.trim(),s=suggest(v);if(s){react('#r-mail',\`Meintest du <b id="tf">\${s}</b>?\`,'warn');$('#tf').onclick=()=>{$('#f-mail').value=s;clr('#r-mail');$('#f-mail').focus();};}else if(validMail(v))react('#r-mail',\`Passt — dahin schicken wir deine Vorschau.\`);else clr('#r-mail');});

  function reqOk(req){if(!req)return true;if(req==='stimmung')return !!document.querySelector('#stimmung .chip[aria-pressed=true]');const el=document.getElementById(req);if(!el)return true;if(req==='f-mail')return validMail(el.value);return el.value.trim().length>0;}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;const to=+b.dataset.go,req=b.dataset.req;
    if(b.classList.contains('next')&&!reqOk(req)){if(req==='f-mail')react('#r-mail','Bitte gib eine gültige E-Mail-Adresse ein.','warn');else{const el=document.getElementById(req)||qs[step].querySelector('input,textarea');if(el&&el.focus){el.closest('.field').style.background='linear-gradient(180deg,rgba(240,168,139,.7),rgba(240,168,139,.2))';el.focus();}}return;}
    show(to);});
  $('#resend').addEventListener('click',()=>{const b=$('#resend');const t=b.textContent;b.textContent='Nochmal geschickt — schau ins Postfach';b.disabled=true;setTimeout(()=>{b.textContent=t;b.disabled=false;},3500);});

  // ── Echter Versand (Schritt 5 -> Backend) ──
  function turnstileToken(){
    if(window.turnstile&&typeof turnstile.getResponse==='function'){
      try{return turnstile.getResponse()||'';}catch(err){console.error('Turnstile-Token nicht lesbar:',err);return '';}
    }
    return '';
  }
  function turnstileReset(){
    if(window.turnstile&&typeof turnstile.reset==='function'){
      try{turnstile.reset();}catch(err){console.error('Turnstile-Reset fehlgeschlagen:',err);}
    }
  }
  const SUBMIT_FEHLER={
    email:'Bitte prüf deine E-Mail-Adresse.',
    disposable:'Bitte prüf deine E-Mail-Adresse.',
    email_domain:'Bitte prüf deine E-Mail-Adresse.',
    handle:'Bitte prüf deinen Instagram-Namen.',
    name:'Bitte gib deinen Namen ein.',
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
      ziel:thema,
      stimmung:(document.querySelector('#stimmung .chip[aria-pressed=true]')||{}).dataset?.mood||'',
      farbe:'',
      consent:true,
      elapsed:Date.now()-START,
      turnstile:turnstileToken(),
      source:'formular',
    };
    try{
      const res=await fetch('/api/free-content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      let data=null;
      try{data=await res.json();}catch(err){console.error('Antwort nicht lesbar:',err);}
      if(res.ok&&data&&data.ok){show(6);return;}
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

  // Pointer-Parallaxe am Gerät + Bokeh-Staub (eine rAF)
  const dev=$('#device');let px=0,py=0;
  addEventListener('pointermove',e=>{px=(e.clientX/innerWidth-.5)*2;py=(e.clientY/innerHeight-.5)*2;});
  const cv=$('#dust'),cx=cv.getContext('2d');let dust=[];
  function sizeC(){const dpr=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;cx.setTransform(dpr,0,0,dpr,0,0);dust=Array.from({length:Math.round(Math.min(innerWidth,800)/24)},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,z:Math.random(),vx:(Math.random()-.5)*.1,vy:-0.04-Math.random()*.1}));}
  sizeC();addEventListener('resize',sizeC);
  let t0=null;
  function loop(ts){if(t0===null)t0=ts;const t=(ts-t0)/1000;
    dev.style.transform=\`translateY(\${Math.sin(t*.7)*4}px) rotateX(\${-py*4}deg) rotateY(\${px*6+Math.sin(t*.5)*2}deg)\`;
    cx.clearRect(0,0,innerWidth,innerHeight);
    for(const p of dust){p.x+=p.vx*(.4+p.z);p.y+=p.vy*(.4+p.z);if(p.y<-4){p.y=innerHeight+4;p.x=Math.random()*innerWidth;}if(p.x<-4)p.x=innerWidth+4;if(p.x>innerWidth+4)p.x=-4;cx.globalAlpha=.05+p.z*.2;cx.fillStyle=p.z>.62?'rgba(31,166,224,1)':(p.z>.32?'rgba(31,201,152,1)':'rgba(244,245,243,1)');cx.beginPath();cx.arc(p.x,p.y,.4+p.z*1.4,0,7);cx.fill();}
    cx.globalAlpha=1;requestAnimationFrame(loop);}
  if(!reduce)requestAnimationFrame(loop);else cv.style.display='none';
  show(0);
`;

/**
 * Baut die Formular-Seite (`GET /`).
 * @param {{TURNSTILE_SITE_KEY?:string}} env
 * @returns {Response}
 */
export function formPage(env) {
  const turnstileSiteKey = env?.TURNSTILE_SITE_KEY || DEFAULT_TURNSTILE_SITE_KEY;
  const head =
    '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' +
    `<style>${PAGE_STYLE}</style>`;
  const body = `${pageMarkup(turnstileSiteKey)}<script>${PAGE_SCRIPT}</script>`;

  return htmlDoc({ title: 'Deine Gratis-Vorschau · social2scale', head, body });
}
