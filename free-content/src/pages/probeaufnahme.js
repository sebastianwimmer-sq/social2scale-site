/**
 * Probeaufnahme (28.10.2026) — das eigene System des Funnels „Passt du zu uns?“.
 *
 * Bild: Sie steht im Studio. Über dem Set hängt eine Traverse mit neun Lampen. Die erste brennt schon,
 * wenn sie ankommt (Endowed Progress, Nunes & Drèze 2006: 34 % statt 19 % Abschluss), jede beantwortete
 * Frage schaltet die nächste ein, das Set wird heller. Der Steckbrief ist der Aufnahmezettel auf dem
 * Klemmbrett — hell wie Papier (Lesbarkeit, positive Polarität). Beim Ergebnis löst einmal der Blitz aus,
 * der Zettel bekommt den Stempel „Passt“. Belege: ~/kit-build/kunden-wirkung-evidenz.json
 * (fortschritt-schenken, selbst-mitbauen, lesen-hell, vestibulaer-ab-40).
 *
 * Kein neuer Text (EN entsteht aus derselben Seite, form-en.js). Kein Endlos-Lauf. Bewegung reduzieren:
 * Lampen schalten ohne Übergang, kein Blitz. Die Seite liest nur data-schritt am .app (gesetzt von show()).
 */

const LAMPEN = 9;
// Lampen je Schritt: Start 1, Frage j (Position in CHECK) 1 + j, Ergebnis und jeder Weg danach alle
export const PROBE_STYLE = `
  .probe{position:fixed;inset:0;z-index:1;pointer-events:none;--licht:0}
  .probe .traverse{position:absolute;left:50%;top:14px;width:min(78vw,980px);height:12px;translate:-50% 0;border-radius:3px;
    background:repeating-linear-gradient(90deg,#2A2E33 0 2px,transparent 2px 18px),linear-gradient(180deg,#3A3F45,#1C1F23);
    box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 8px 16px -6px #000;display:flex;justify-content:space-between;padding:0 4%}
  .probe .lampe{position:relative;width:26px;height:12px}
  .probe .lampe::before{content:"";position:absolute;left:3px;top:10px;width:20px;height:16px;border-radius:3px 3px 9px 9px;
    background:linear-gradient(180deg,#30353B,#16181B);box-shadow:inset 0 -3px 0 #0B0C0E,0 4px 8px -2px #000;transition:box-shadow .35s ease}
  .probe .lampe::after{content:"";position:absolute;left:50%;top:24px;width:min(34vw,520px);height:100vh;translate:-50% 0;opacity:0;
    background:conic-gradient(from 180deg at 50% 0%,transparent 165deg,rgba(214,255,238,.15) 173deg,rgba(214,255,238,.24) 180deg,rgba(214,255,238,.15) 187deg,transparent 195deg);
    -webkit-mask:linear-gradient(180deg,#000 10%,transparent 85%);mask:linear-gradient(180deg,#000 10%,transparent 85%);transition:opacity .55s ease}
  .probe .lampe.an::before{box-shadow:inset 0 -3px 0 #F4FFF9,0 0 14px 2px rgba(214,255,238,.6),0 4px 8px -2px #000}
  .probe .lampe.an::after{opacity:1}
  .probe .lampe:nth-child(odd)::after{rotate:4deg}.probe .lampe:nth-child(even)::after{rotate:-4deg}
  .probe .set{position:absolute;left:0;right:0;bottom:0;height:46vh;opacity:calc(.25 + var(--licht) * .75);transition:opacity .6s ease;
    background:radial-gradient(60% 70% at 50% 100%,rgba(214,255,238,.20),transparent 70%)}
  .probe .blitz{position:absolute;inset:0;background:#F6FFFB;opacity:0}
  .probe.blitzt .blitz{animation:probeBlitz .5s ease-out 1}
  @keyframes probeBlitz{0%{opacity:0}8%{opacity:.78}100%{opacity:0}}
  body:has(.probe) .scene.studio .kegel{opacity:.25}

  /* Aufnahmezettel: der Steckbrief als Papier auf dem Klemmbrett */
  @media (min-width:900px){
    .brief{--ink:#15171B;--faint:#59606A;--emerald-soft:#0B6B52;border:0;border-radius:6px;padding-top:2.4rem;
      background:linear-gradient(180deg,#FFFEFA,#F1EDE2);
      box-shadow:0 0 0 10px #3B2E22,0 0 0 11px rgba(255,255,255,.06),0 2px 3px rgba(0,0,0,.3),0 40px 80px -36px rgba(0,0,0,.9)}
    .brief::before{content:"";position:absolute;left:50%;top:-18px;width:120px;height:34px;translate:-50% 0;border-radius:8px 8px 4px 4px;
      background:linear-gradient(180deg,#C9CED4,#8C939B 60%,#6E757D);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 4px 8px rgba(0,0,0,.5)}
    .brief .br-zeilen>div{border-top-color:rgba(21,23,27,.12)}
    .brief .br-zeilen>div:not(.voll) dd::before{background:rgba(21,23,27,.08)}
    .brief.passt{border:0}
    .brief .br-stempel{position:absolute;right:1.4rem;bottom:1.2rem;margin:0;padding:.35rem .8rem;border:3px solid currentColor;border-radius:8px;rotate:-8deg;
      color:#0B6B52;font-size:1.35rem;opacity:.9;-webkit-mask:radial-gradient(circle at 30% 40%,#000 55%,rgba(0,0,0,.75) 75%,#000);mask:radial-gradient(circle at 30% 40%,#000 55%,rgba(0,0,0,.75) 75%,#000)}
    .brief.passt .br-stempel{animation:probeStempel .32s cubic-bezier(.5,0,.7,.2) 1}
    @keyframes probeStempel{from{scale:1.6;opacity:0}to{scale:1;opacity:.9}}
  }
  @media (max-width:899px){
    .probe .traverse{top:6px;width:92vw;height:8px}
    .probe .lampe{width:18px}.probe .lampe::before{left:2px;top:7px;width:14px;height:11px}
    .probe .lampe::after{top:17px;width:60vw}
  }
  @media (prefers-reduced-motion:reduce){
    .probe .lampe::before,.probe .lampe::after,.probe .set{transition:none}
    .probe.blitzt .blitz,.brief.passt .br-stempel{animation:none}
  }
`;

export const PROBE_MARKUP = `<div class="probe" id="probe" aria-hidden="true"><div class="set"></div><div class="traverse">${'<i class="lampe"></i>'.repeat(LAMPEN)}</div><div class="blitz"></div></div>`;

export const PROBE_SCRIPT = `
(function(){
  const probe=document.getElementById('probe'),app=document.querySelector('.app');if(!probe||!app)return;
  const lampen=[...probe.querySelectorAll('.lampe')],CH=[1,2,3,4,5,6,16,18];
  const ruhig=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alt=-1;
  function anzahl(n){if(n===0)return 1;const j=CH.indexOf(n);if(j>=0)return 1+j;return ${LAMPEN};}
  function setzen(){
    const n=+app.dataset.schritt||0,k=anzahl(n);
    lampen.forEach((l,i)=>l.classList.toggle('an',i<k));
    probe.style.setProperty('--licht',(k/${LAMPEN}).toFixed(3));
    if(n===17&&alt!==17&&!ruhig){probe.classList.remove('blitzt');void probe.offsetWidth;probe.classList.add('blitzt');}
    alt=n;
  }
  new MutationObserver(setzen).observe(app,{attributes:true,attributeFilter:['data-schritt']});
  setzen();
})();
`;

/**
 * Dunkelkammer (Warten auf den Feed, /r/:token). Solange gebaut wird, brennt nur das Bernsteinlicht;
 * die Kacheln entwickeln sich mit dem ECHTEN Fortschritt (result.js, done/total — Labor Illusion,
 * Buell & Norton 2011: sichtbare echte Arbeit hebt den Wert). Ist der Feed fertig (#reveal sichtbar),
 * geht das Licht an: Bernstein weg, weißes Arbeitslicht von oben. Kein Endlos-Lauf, kein neuer Text.
 */
export const DUNKEL_STYLE = `
  .dunkelkammer{position:fixed;inset:0;z-index:1;pointer-events:none}
  .dunkelkammer .rot{position:absolute;inset:0;opacity:1;transition:opacity 1.6s ease;
    background:radial-gradient(70% 55% at 82% 0%,rgba(255,150,70,.22),rgba(255,120,50,.06) 50%,transparent 75%),linear-gradient(180deg,rgba(40,14,4,.35),transparent 60%)}
  .dunkelkammer .gehaeuse{position:absolute;right:clamp(18px,8vw,120px);top:0;width:64px;height:40px;border-radius:0 0 8px 8px;
    background:linear-gradient(180deg,#2A2D31,#15171A);box-shadow:inset 0 -11px 0 #D9822F,inset 0 -12px 0 rgba(0,0,0,.4),0 8px 18px -4px #000;transition:box-shadow 1.2s ease}
  .dunkelkammer .weiss{position:absolute;inset:0;opacity:0;transition:opacity 1.4s ease .2s;
    background:radial-gradient(60% 55% at 50% 0%,rgba(236,255,247,.16),transparent 70%)}
  .dunkelkammer.licht .rot{opacity:0}
  .dunkelkammer.licht .weiss{opacity:1}
  .dunkelkammer.licht .gehaeuse{box-shadow:inset 0 -11px 0 #3A2A1E,inset 0 -12px 0 rgba(0,0,0,.4),0 8px 18px -4px #000}
  @media (prefers-reduced-motion:reduce){.dunkelkammer *{transition:none !important}}
`;
export const DUNKEL_MARKUP = '<div class="dunkelkammer" id="dunkelkammer" aria-hidden="true"><div class="rot"></div><div class="weiss"></div><div class="gehaeuse"></div></div>';
export const DUNKEL_SCRIPT = `
(function(){
  const dk=document.getElementById('dunkelkammer'),rv=document.getElementById('reveal');if(!dk||!rv)return;
  const pruefen=()=>dk.classList.toggle('licht',!rv.hidden);
  new MutationObserver(pruefen).observe(rv,{attributes:true,attributeFilter:['hidden']});
  pruefen();
})();
`;
