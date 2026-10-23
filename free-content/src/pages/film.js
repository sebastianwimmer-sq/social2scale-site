/**
 * Setting-Film nach dem Eintragen (17.10.2026, Sebi: „nach dem eintragen brauchen wir so ne art
 * video und dann kommt er zum erstgespraech durch“, KI-Avatar + KI-Stimme, beide Wege).
 *
 * Bauart „Hybrid“ (Sebi 17.10.: Kosten klein halten, trotzdem high end): Avatar-Clips nur fuer
 * Begruessung und Abschluss, dazwischen zeichnet der Funnel die Szene live ueber das Video.
 * Medien + Zeitleiste: free-content/film/bauen.py → social2scale.com/assets/film-*.mp4, film-daten.js.
 *
 * Runde 3 (Sebi 17.10.: „immer extrem viel ki generische sachen“, „2 bildschirme auf der seite mit
 * der frau“, „motion graphic … muss ja sinn machen auch auf ui design basis“):
 *  - EIN Geraet: das Telefon, das ihren Feed gebaut hat, spielt den Film (FLIP vom Vorschau-Telefon
 *    auf den Film, die Vorschau verschwindet). Vor dem Start zeigt der Bildschirm ihren Feed.
 *  - Nur echtes Material: ihr Feed ist eine Kopie der Live-Vorschau (#device .pv), Phil und
 *    Sebastian randlos aus den Website-Fotos, ihre Antworten als Text. Keine Haken, Pillen,
 *    Mitteilungs-Attrappen, Kursiv-Akzente oder Versal-Etiketten.
 *  - Bewegung an der Person: langsamer Push, Punch-in je Satz, Rauszoomen in die Szene,
 *    Reinzoomen beim Abschluss. Toene an denselben Stellen baut bauen.py ins Video.
 *
 * KI-Kennzeichnung (AI Act Art. 50, docs/ki-kennzeichnung-ai-act.md): fotorealistischer Avatar
 * mit KI-Stimme → „KI-generiert“ steht sichtbar im Bild, solange der Film zu sehen ist.
 * Ton erst nach Klick (Autoplay mit Ton blockieren die Browser), Untertitel immer an.
 * Aussagen nur, was die Website belegt: zwei Gruender Phil und Sebastian (/about/), etwa 45
 * Minuten (/wissen/ablauf-zusammenarbeit/), kostenlos (Anfrage). Keine Zahlen, keine Uhrzeiten.
 */

import { FILM } from './film-daten.js';

const ASSET_BASE = 'https://social2scale.com/assets';
const PHIL = `${ASSET_BASE}/founder-philipp-880.webp`;
const SEBI = `${ASSET_BASE}/founder-sebastian-768.webp`;

function sekunden(s) {
  const r = Math.round(s);
  return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0');
}

function foto(src, klasse, b, h) {
  return `<img class="${klasse}" src="${src}" alt="" width="${b}" height="${h}" loading="lazy" decoding="async">`;
}

const SZENEN = {
  hallo: `
              <div class="fs fs-hallo fs-avatar"></div>`,
  post: `
              <div class="fs fs-post"><div class="fs-feed fx-feed" data-m="feed"></div></div>`,
  phil: `
              <div class="fs fs-phil">
                <div class="fs-duo" data-m="beide">${foto(PHIL, 'fs-p1', 880, 1100)}${foto(SEBI, 'fs-p2', 768, 960)}</div>
                <div class="fs-text">
                  <p class="fs-name" data-m="phil">Phil<span data-m="beide"> und Sebastian</span></p>
                  <p class="fs-zeile" data-m="beide">die zwei Gründer von social2scale</p>
                  <p class="fs-zeile fs-fakt" data-m="zeit">Erstgespräch mit Phil, etwa 45 Minuten</p>
                </div>
              </div>`,
  kennt: `
              <div class="fs fs-kennt">
                <div class="fs-duo fs-duo-kurz">${foto(PHIL, 'fs-p1', 880, 1100)}</div>
                <div class="fs-text">
                  <p class="fs-name">Phil</p>
                  <dl class="fs-liste">
                    <div data-m="antworten"><dt>Thema</dt><dd class="fx-thema"></dd></div>
                    <div data-m="antworten"><dt>Ziel</dt><dd class="fx-ziel"></dd></div>
                    <div data-m="antworten"><dt>Heute</dt><dd class="fx-stand"></dd></div>
                  </dl>
                  <p class="fs-zeile fs-fakt" data-m="zeit">Erstgespräch, etwa 45 Minuten</p>
                </div>
              </div>`,
  klaeren: `
              <div class="fs fs-klaeren">
                <p class="fs-zeile">Im Gespräch mit Phil</p>
                <dl class="fs-liste fs-gross">
                  <div data-m="ziel"><dt>Dein Ziel</dt><dd class="fx-ziel"></dd></div>
                  <div data-m="gruppe"><dt>Deine Zielgruppe</dt><dd class="fx-gruppe"></dd></div>
                  <div data-m="stand"><dt>Wo du heute stehst</dt><dd class="fx-stand"></dd></div>
                </dl>
                <p class="fs-weg" data-m="weg">Danach weißt du, welcher Weg zu dir passt.</p>
              </div>`,
  termin: `
              <div class="fs fs-termin fs-avatar"></div>`,
};

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
              <video class="film-v" playsinline preload="none" poster="${ASSET_BASE}/film-poster.jpg" src="${ASSET_BASE}/film-${weg}.mp4" aria-label="Film: was dich jetzt erwartet"></video>
              <span class="film-scrim" aria-hidden="true"></span>
              <div class="film-szene" aria-hidden="true">
              <div class="fs fs-sperre"><div class="fs-feed fx-feed"></div></div>${szenen}
              </div>
              <span class="film-insel" aria-hidden="true"></span>
              <p class="film-ut" aria-hidden="true"></p>
              <span class="film-ki">KI-generiert</span>
              <button type="button" class="film-start"><span class="film-play" aria-hidden="true"></span><span class="film-start-t"><b>Was dich jetzt erwartet</b><small>${sekunden(d.dauer)} · mit Ton</small></span></button>
              <div class="film-ende" hidden>
                ${foto(PHIL, 'film-ende-bild', 880, 1100)}
                <div class="film-ende-t">
                  <p class="film-ende-h">Erstgespräch mit Phil</p>
                  <p class="film-ende-s">etwa 45 Minuten, kostenlos</p>
                  <a class="next film-termin" target="_blank" rel="noopener"><span class="lab">Termin aussuchen</span><span class="ic" aria-hidden="true">→</span></a>
                  <button type="button" class="back film-nochmal">Nochmal ansehen</button>
                </div>
              </div>
              <button type="button" class="film-pause" hidden aria-label="Pause"></button>
              <span class="film-home" aria-hidden="true"></span>
            </div>
          </div>
          <figcaption>Avatar und Stimme sind KI-generiert. Was sie sagt, kommt von uns.</figcaption>
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
  .film-scrim{position:absolute;left:0;right:0;bottom:0;height:34%;z-index:2;pointer-events:none;background:linear-gradient(transparent,rgba(4,7,7,.72))}
  .film figcaption{font-size:.8rem;color:var(--muted);margin-top:.7rem;line-height:1.4;text-align:center}

  .film-szene{position:absolute;inset:0;pointer-events:none}
  .fs{position:absolute;inset:0;opacity:0;font-size:clamp(10px,5cqi,14px);color:var(--ink);background:#070a0a;transition:opacity .45s var(--e-out)}
  .fs-avatar{background:none}
  .film:not(.laeuft):not(.fertig) .fs-sperre{opacity:1}
  .film[data-szene="post"] .fs-post,.film[data-szene="phil"] .fs-phil,.film[data-szene="kennt"] .fs-kennt,
  .film[data-szene="klaeren"] .fs-klaeren{opacity:1}
  .fs p{margin:0}

  /* Ihr Feed: Kopie der Live-Vorschau, die leeren Kacheln fuellen sich mit ihrer Farbe */
  .fs-feed{position:absolute;left:0;right:0;top:44%;translate:0 -50%;transform-origin:50% 40%}
  .fs-sperre .fs-feed{top:14%;translate:none}
  .film[data-szene="post"] .fs-post .fs-feed{animation:fs-push 7.5s linear both}
  .fs-feed .pv{border-radius:0;box-shadow:none;background:transparent}
  .fs-feed .pv-tile.fx-leer{background:color-mix(in oklab,var(--mood) 22%,#0c0c0c);transform:scale(.6);opacity:0;
    transition:opacity .35s var(--e-out),transform .5s var(--e-spring);transition-delay:calc(.1s + var(--i) * .14s)}
  .fs-feed.an .pv-tile.fx-leer{opacity:1;transform:none}
  .fs-sperre .pv-tile.fx-leer{opacity:1;transform:none;background:#0c0c0c}
  .fs-sperre .fs-feed{opacity:.55}

  /* Fotos randlos, unten in den Grund auslaufend */
  .fs-duo{position:absolute;left:0;right:0;top:0;height:66%;overflow:clip;
    -webkit-mask-image:linear-gradient(#000 62%,transparent);mask-image:linear-gradient(#000 62%,transparent)}
  .fs-duo-kurz{height:50%}
  .fs-duo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 18%;
    transition:clip-path .8s var(--e-out),transform .8s var(--e-out)}
  .fs-p2{clip-path:inset(0 25% 0 25%);transform:translateX(75%)}
  .fs-duo.an .fs-p1{clip-path:inset(0 25% 0 25%);transform:translateX(-25%)}
  .fs-duo.an .fs-p2{transform:translateX(25%)}
  .film[data-szene="phil"] .fs-phil .fs-duo,.film[data-szene="kennt"] .fs-kennt .fs-duo{animation:fs-push 9s linear both}
  @keyframes fs-push{from{scale:1}to{scale:1.06}}
  .fs-text{position:absolute;left:7%;right:7%;bottom:27%;display:grid;gap:.35em}
  .fs-name{font-family:var(--ff-serif);font-weight:520;font-size:2.15em;line-height:1.02;letter-spacing:-.02em}
  .fs-name span{display:inline-block}
  .fs-zeile{font-size:.92em;color:var(--muted);line-height:1.35}
  .fs-fakt{color:var(--ink);margin-top:.35em}

  /* Antworten: ruhige Zeilen, sie kommen im Takt der Stimme */
  .fs-liste{margin:.3em 0 0;display:grid;gap:.5em}
  .fs-liste>div{display:grid;gap:.1em}
  .fs-liste dt{font-size:.8em;color:var(--faint)}
  .fs-liste dd{margin:0;font-size:1em;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
  .fs-kennt .fs-liste>div:nth-child(2){transition-delay:.25s}.fs-kennt .fs-liste>div:nth-child(3){transition-delay:.5s}
  .fs-klaeren{display:flex;flex-direction:column;justify-content:center;gap:1.1em;padding:0 8% 22%}
  .fs-gross{gap:1em}
  .fs-gross dd{font-family:var(--ff-serif);font-weight:480;font-size:1.5em;letter-spacing:-.01em;line-height:1.12}
  .fs-klaeren .fs-liste>div:not(.an){opacity:.22!important;transform:none!important}
  .fs-weg{font-family:var(--ff-serif);font-weight:480;font-size:1.25em;line-height:1.2;color:var(--emerald-soft);text-wrap:balance}

  /* Was eine Wortmarke zeigt, kommt in dem Moment, in dem es gesagt wird */
  .film [data-m]{transition:opacity .5s var(--e-out),transform .6s var(--e-spring)}
  .film .fs-text [data-m]:not(.an),.film .fs-liste>div:not(.an),.film .fs-weg:not(.an){opacity:0;transform:translateY(10px)}
  .fs-name span:not(.an){opacity:0;transform:translateX(-6px)!important}

  .film-ut{position:absolute;left:7%;right:7%;bottom:7.5%;margin:0;text-align:center;font-size:clamp(.8rem,5.2cqi,.98rem);font-weight:600;line-height:1.35;color:#F2F3F1;z-index:3;
    text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 14px rgba(0,0,0,.7);text-wrap:balance;min-height:4.05em;display:flex;align-items:flex-end;justify-content:center}
  .film-ki{position:absolute;top:8.2%;left:6%;z-index:4;font-family:var(--ff-label);font-size:.62rem;font-weight:600;letter-spacing:.04em;padding:.3rem .5rem;border-radius:7px;
    color:#F2F3F1;background:rgba(3,8,13,.62);border:1px solid var(--hair-2)}
  /* Start: eine Taste mit Ton ueber ihrem Feed */
  .film-start{position:absolute;left:5%;right:5%;bottom:6%;z-index:5;display:flex;align-items:center;gap:.7rem;padding:.65rem .75rem;border-radius:16px;cursor:pointer;text-align:left;
    font:inherit;color:#F2F3F1;background:rgba(3,8,13,.86);border:1px solid var(--hair-2);transition:transform .3s var(--e-spring),border-color .3s var(--e-out)}
  .film-start:hover{border-color:rgba(31,201,152,.55)}.film-start:active{transform:scale(.98)}
  .film-start:focus-visible,.film-pause:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:3px}
  .film-play{flex:none;width:44px;height:44px;border-radius:50%;background:var(--emerald);position:relative}
  .film-play::after{content:"";position:absolute;left:53%;top:50%;transform:translate(-50%,-50%);border-style:solid;border-width:8px 0 8px 13px;border-color:transparent transparent transparent var(--emerald-ink)}
  .film-start-t{min-width:0}.film-start-t b{display:block;font-size:.95rem;line-height:1.2}.film-start-t small{display:block;font-size:.78rem;color:#BEC0BB;margin-top:2px}
  .film.laeuft .film-start,.film.fertig .film-start{opacity:0;pointer-events:none}
  .film:not(.laeuft):not(.fertig) .film-ut,.film:not(.laeuft):not(.fertig) .film-scrim{opacity:0}
  .film-pause{position:absolute;top:7.4%;right:5%;z-index:5;width:44px;height:44px;border-radius:50%;border:1px solid var(--hair-2);background:rgba(3,8,13,.55);cursor:pointer}
  .film-pause::before,.film-pause::after{content:"";position:absolute;top:15px;width:4px;height:14px;border-radius:1px;background:#F2F3F1}
  .film-pause::before{left:16px}.film-pause::after{right:16px}
  .film-pause.steht::before{left:17px;top:14px;width:0;height:0;border-radius:0;background:none;border-style:solid;border-width:8px 0 8px 12px;border-color:transparent transparent transparent #F2F3F1}
  .film-pause.steht::after{display:none}
  .film-ende{position:absolute;inset:0;z-index:5;background:#070a0a}
  .film-ende-bild{position:absolute;left:0;right:0;top:0;width:100%;height:60%;object-fit:cover;object-position:50% 18%;
    -webkit-mask-image:linear-gradient(#000 60%,transparent);mask-image:linear-gradient(#000 60%,transparent)}
  .film-ende-t{position:absolute;left:8%;right:8%;bottom:7%;display:grid;gap:.55rem;text-align:center}
  .film-ende[hidden],.film-pause[hidden]{display:none}
  .film-ende-h{margin:0;font-family:var(--ff-serif);font-weight:520;font-size:clamp(1.3rem,10cqi,1.8rem);letter-spacing:-.02em;line-height:1.05;color:var(--ink);text-wrap:balance}
  .film-ende-s{margin:0 0 .4rem;font-size:.85rem;color:var(--muted)}
  .film-ende .next{width:100%;justify-content:center}
  .film.fertig .film-ut{opacity:0}
  @media (prefers-reduced-motion: reduce){
    .film .fs-text [data-m]:not(.an),.film .fs-liste>div:not(.an),.film .fs-weg:not(.an),.fs-name span:not(.an){transform:none!important}
    .fs-duo img,.fs-feed .pv-tile.fx-leer{transition-property:opacity;transform:none!important;clip-path:none!important}
    .fs-p2{opacity:0}.fs-duo.an .fs-p2{opacity:1;clip-path:inset(0 0 0 50%)!important}
    .fs-duo,.fs-feed{animation:none!important}
  }
`;

/**
 * Laeuft im selben Skript wie form.js (braucht $, zaehlen, buchungsLink). Zeitleiste kommt als JSON.
 * Szene, Untertitel und Zoom folgen video.currentTime; keine eigene Uhr, damit Pause/Springen stimmen.
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
    document.querySelectorAll('.film').forEach(f=>{
      if(!f._heim){f._heim=document.createComment('film');f.before(f._heim);}
      const hier=f.dataset.film===weg;
      if(!hier){const v=f.querySelector('.film-v');if(v&&!v.paused)v.pause();if(f.parentNode===stage)f._heim.after(f);return;}
      if(breit&&f.parentNode!==stage)stage.appendChild(f);
      if(!breit&&f.parentNode===stage)f._heim.after(f);
      filmFuellen(f);
      if(vorher)filmMorph(f.querySelector('.film-geraet'),vorher);
    });
  }
  // Das Vorschau-Telefon wird zum Film: Start an der alten Stelle und Groesse, dann an den neuen Platz.
  function filmMorph(g,a){
    const b=g.getBoundingClientRect();if(!b.width||!g.animate)return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){g.animate([{opacity:0},{opacity:1}],{duration:300});return;}
    const s=a.width/b.width,dx=a.left+a.width/2-(b.left+b.width/2),dy=a.top+a.height/2-(b.top+b.height/2);
    g.animate([{transform:'translate('+dx+'px,'+dy+'px) scale('+s+')'},{transform:'none'}],{duration:760,easing:'cubic-bezier(.16,1,.3,1)'});
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
      start=f.querySelector('.film-start'),pause=f.querySelector('.film-pause'),ende=f.querySelector('.film-ende');
    let raf=0;
    function stand(){
      const t=v.currentTime,a=d.abschnitte.find(x=>t>=x.von&&t<x.bis)||d.abschnitte[d.abschnitte.length-1];
      if(f.dataset.szene!==a.szene)f.dataset.szene=a.szene;
      const box=f.querySelector('.fs-'+a.szene);
      if(box)box.querySelectorAll('[data-m]').forEach(e=>e.classList.toggle('an',t>=(a.marken[e.dataset.m]??a.von)));
      filmKamera(v,d,a,t);
      const c=d.untertitel.find(x=>t>=x.von&&t<x.bis);const txt=c?c.text:'';
      if(ut.textContent!==txt)ut.textContent=txt;
    }
    function schleife(){stand();if(!v.paused&&!v.ended)raf=requestAnimationFrame(schleife);}
    function abspielen(){
      filmFuellen(f);ende.hidden=true;f.classList.remove('fertig');
      v.muted=false;const p=v.play();
      if(p&&p.catch)p.catch(err=>{console.error('Film startet nicht:',err);f.classList.remove('laeuft');pause.hidden=true;});
    }
    start.addEventListener('click',()=>{zaehlen('film-'+weg);abspielen();});
    f.querySelector('.film-nochmal').addEventListener('click',()=>{v.currentTime=0;abspielen();});
    f.querySelector('.film-termin').addEventListener('click',()=>zaehlen('film-'+weg+'-termin'));
    pause.addEventListener('click',()=>{if(v.paused)v.play();else v.pause();});
    v.addEventListener('play',()=>{f.classList.add('laeuft');pause.hidden=false;pause.classList.remove('steht');pause.setAttribute('aria-label','Pause');cancelAnimationFrame(raf);schleife();});
    v.addEventListener('pause',()=>{pause.classList.add('steht');pause.setAttribute('aria-label','Weiter abspielen');stand();});
    v.addEventListener('seeked',stand);
    v.addEventListener('ended',()=>{f.classList.remove('laeuft');f.classList.add('fertig');pause.hidden=true;ende.hidden=false;zaehlen('film-'+weg+'-ende');
      const t=f.querySelector('.film-termin');if(t)t.focus({preventScroll:true});});
  });
  matchMedia('(min-width:900px)').addEventListener('change',()=>filmZeigen(step));
`;
