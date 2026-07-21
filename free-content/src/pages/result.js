/**
 * Build-Screen (`GET /r/:token`) — portiert aus design/prototypes/build.html
 * (abgenommenes Design, "der emotionale Kern" von Plan 3). Aenderungen ggue.
 * dem Prototyp:
 *  - Fonts/Hintergrund (Foto, Orbs, Grain) kommen aus shell.js, hier nicht
 *    mehr definiert — keine eingebetteten Assets.
 *  - Der Auto-Play-Zeitstrahl des Prototyps (window.__setState/beats/render(done))
 *    ist ersetzt durch einen ECHTEN Poller gegen GET /api/status/:token.
 *  - Die "Ton an/Nochmal ansehen"-Regler waren Hinweise fuer die Design-Abnahme
 *    ("Ton anschalten, dann Nochmal ansehen") und keine Produkt-Funktion einer
 *    einmaligen echten Wartezeit — sie sind hier bewusst weggelassen.
 *
 * WICHTIG (siehe copy.js): buildStatus() liefert das `images`-Array NUR bei
 * state:'ready' — waehrend state:'building' gibt es nur `done` (eine Zahl,
 * echt aus R2 gezaehlt). Die Kacheln fuellen sich waehrend des Bauens also
 * proportional (Deko, wie im Prototyp), echte Fotos werden erst eingesetzt,
 * sobald `images` mitkommt — praktisch also erst im selben Poll, der auch
 * showReveal() ausloest.
 *
 * showReveal() ist jetzt echt ausgebaut (Plan 3 Task 4, siehe reveal.js) —
 * showError() bleibt bewusst MINIMAL (Plan 3 Task 5 baut das echte
 * Fehler-Erlebnis aus).
 */

import { htmlDoc } from './shell.js';
import { STEPS, TILE_LABELS, FRAME_IDS, ERROR_COPY, REVEAL } from './copy.js';
import { REVEAL_STYLE, REVEAL_SCRIPT, revealMarkup } from './reveal.js';

/** Nur die ersten drei Grid-Kacheln bekommen ein echtes Foto (s. copy.js TILE_LABELS). */
const GRID_FRAME_IDS = ['f-0-s1', 'f-0-s2', 'f-0-s3'];
const AVATAR_FRAME_ID = 'f-0-profil';
const CLASS_CYCLE = ['t-dark', 't-tint', 't-accent', 't-line'];

/** Statischer Text kommt trotzdem durch esc() — Konsistenz mit dem Rest des Moduls. */
function esc(v) {
  return String(v ?? '').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

const PAGE_STYLE = `
  .stage{position:relative;z-index:2;min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:2rem 1.25rem 2.4rem;gap:1.4rem}
  .caption{max-width:34rem;text-align:center;display:flex;flex-direction:column;gap:.5rem}
  .caption .kick{font-family:var(--ff-label);font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}
  .caption h2{font-family:var(--ff-serif);font-weight:460;font-size:clamp(1.4rem,1.1rem + 1.6vw,2rem);letter-spacing:-.02em;line-height:1.08}
  .caption h2 em{font-style:italic;font-weight:420;background:var(--flow);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .caption p{font-size:.9rem;color:var(--muted);line-height:1.5}
  .space{perspective:1600px;perspective-origin:50% 42%;padding:.5rem 0 1rem}
  .phone{position:relative;width:min(80vw,300px);aspect-ratio:300/620;border-radius:52px;padding:11px;will-change:transform;transform-style:preserve-3d;background:linear-gradient(150deg,#23262B,#0B0D10 60%);box-shadow:0 0 0 1.5px #2b2e33,0 2px 2px rgba(255,255,255,.08) inset,0 70px 130px -45px rgba(0,0,0,.9),0 0 80px -14px rgba(0,184,136,.16),0 0 90px -20px rgba(31,166,224,.14)}
  .phone::after{content:"";position:absolute;left:50%;bottom:-42px;width:60%;height:26px;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(0,184,136,.24),rgba(31,166,224,.12),transparent 72%);filter:blur(12px);animation:breathe 5s var(--e-out) infinite}
  @keyframes breathe{0%,100%{opacity:.45;transform:translateX(-50%) scale(1)}50%{opacity:.8;transform:translateX(-50%) scale(1.12)}}
  .ios{position:relative;height:100%;border-radius:42px;overflow:hidden;background:#000;font-family:var(--ff-ios);display:flex;flex-direction:column}
  .island{position:absolute;top:9px;left:50%;transform:translateX(-50%);width:82px;height:24px;background:#000;border-radius:14px;z-index:40}
  .statusbar{position:relative;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:12px 22px 2px;color:#fff;font-size:12px;font-weight:600}
  .statusbar .time{font-variant-numeric:tabular-nums;letter-spacing:.02em}
  .statusbar .sys{display:flex;align-items:center;gap:5px}
  .statusbar .sys svg{display:block}
  .home-ind{position:absolute;bottom:7px;left:50%;transform:translateX(-50%);width:108px;height:5px;border-radius:3px;background:rgba(255,255,255,.9);z-index:40}
  .ig{flex:1;background:#000;color:#fff;overflow:hidden;display:flex;flex-direction:column;position:relative}
  .ig-top{display:flex;align-items:center;gap:6px;padding:6px 14px 8px}
  .ig-top .name{font-size:15px;font-weight:700;display:flex;align-items:center;gap:4px}
  .ig-top .name .chev{font-size:10px;opacity:.9}
  .ig-top .sp{margin-left:auto;display:flex;gap:16px;opacity:.95}
  .ig-prof{display:flex;align-items:center;gap:20px;padding:2px 16px 8px}
  .ig-av{width:62px;height:62px;border-radius:50%;flex:none;padding:2px;background:linear-gradient(45deg,#F58529,#DD2A7B,#8134AF);overflow:hidden}
  .ig-av>div{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--emerald),#0E1319);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:24px;color:#04130D;border:2px solid #000;overflow:hidden}
  .ig-av img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}
  .ig-stats{display:flex;gap:20px;flex:1;justify-content:space-around}
  .ig-stat{text-align:center}
  .ig-stat b{display:block;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}
  .ig-stat span{font-size:12px;color:rgba(255,255,255,.85)}
  .ig-meta{padding:0 16px}
  .ig-meta .n{font-size:13px;font-weight:700}
  .ig-meta .b{font-size:13px;color:rgba(255,255,255,.9);line-height:1.35}
  .ig-btns{display:flex;gap:6px;padding:10px 16px 12px}
  .ig-btns button{flex:1;font-family:var(--ff-ios);font-size:13px;font-weight:600;color:#fff;background:#363638;border:0;border-radius:9px;padding:7px 0}
  .ig-tabs{display:flex;border-top:.5px solid rgba(255,255,255,.14)}
  .ig-tabs .tab{flex:1;display:flex;align-items:center;justify-content:center;padding:9px 0;opacity:.5}
  .ig-tabs .tab.act{opacity:1;border-bottom:1.5px solid #fff}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5px;background:#000;position:relative}
  .tile{aspect-ratio:1;position:relative;overflow:hidden;background:#0c0c0c}
  .tile::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(0,184,136,.12) 50%,transparent 80%);background-size:220% 100%;animation:shimmer 1.5s linear infinite}
  .tile.done::before{animation:none;opacity:0}
  .tile .fill{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:6px;text-align:center;font-family:var(--ff-label);font-weight:600;font-size:8.5px;letter-spacing:.01em;line-height:1.2;opacity:0;transform:scale(1.08);filter:blur(6px);transition:opacity .5s var(--e-out),transform .6s var(--e-spring),filter .5s var(--e-out)}
  .tile.done .fill{opacity:1;transform:scale(1);filter:blur(0)}
  .tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .tile.land{z-index:3}
  .tile.land::after{content:"";position:absolute;inset:0;box-shadow:0 0 0 1.5px rgba(0,184,136,.95),0 0 22px 5px rgba(0,184,136,.55);animation:ring .7s var(--e-out) forwards}
  @keyframes ring{0%{opacity:1;transform:scale(.92)}100%{opacity:0;transform:scale(1.14)}}
  .t-dark{background:#1a1512;color:#F4F0E9}.t-accent{background:#C2410C;color:#F4F0E9}
  .t-tint{background:#EAD9CE;color:#23201C}.t-line{background:#F4F0E9;color:#6B645A}
  .sweep{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(31,201,152,.16),transparent);height:40%;animation:sweep 2.4s var(--e-out) infinite}
  @keyframes sweep{0%{transform:translateY(-120%)}100%{transform:translateY(320%)}}
  @keyframes shimmer{to{background-position:-220% 0}}
  .sheet{position:absolute;left:0;right:0;bottom:0;z-index:20;padding:9px 14px calc(13px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(4,10,14,.05),rgba(4,10,14,.88) 55%);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(0,184,136,.24);border-radius:22px 22px 42px 42px}
  .sheet .row1{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .sheet .mark{width:18px;height:18px;border-radius:6px;background:var(--flow);display:flex;align-items:center;justify-content:center;font-family:var(--ff-label);font-weight:800;font-size:9px;color:var(--emerald-ink)}
  .sheet .brand{font-family:var(--ff-label);font-weight:600;font-size:12.5px;letter-spacing:-.005em}
  .sheet .eq{margin-left:auto;display:flex;align-items:flex-end;gap:2px;height:14px;transition:opacity .4s var(--e-out)}
  .sheet .eq i{width:2.5px;background:var(--emerald-soft);border-radius:2px;height:40%;animation:eq 1s ease-in-out infinite}
  .sheet .eq i:nth-child(2){animation-delay:.18s;background:var(--teal)}.sheet .eq i:nth-child(3){animation-delay:.36s}.sheet .eq i:nth-child(4){animation-delay:.54s;background:var(--teal)}
  @keyframes eq{0%,100%{height:30%}50%{height:100%}}
  .sheet .track{height:3px;border-radius:3px;background:rgba(244,245,243,.12);overflow:hidden}
  .sheet .fillbar{height:100%;border-radius:3px;background:var(--flow);transform-origin:left;transform:scaleX(0);transition:transform .8s var(--e-spring);box-shadow:0 0 10px rgba(0,184,136,.5)}
  .sheet .row2{display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-family:var(--ff-body);font-size:12px}
  .sheet .step{color:var(--ink);font-weight:500;position:relative;overflow:hidden;height:16px}
  .sheet .step span{display:block;transition:transform .4s var(--e-out),opacity .4s var(--e-out)}
  .sheet .count{color:var(--faint);font-weight:600;font-variant-numeric:tabular-nums}
  .bloom{position:absolute;inset:0;z-index:25;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 60%,rgba(0,184,136,.5),rgba(31,166,224,.28) 40%,transparent 60%)}
  .bloom.fire{animation:bloom 1.6s var(--e-out) forwards}
  @keyframes bloom{0%{opacity:0;transform:scale(.55)}28%{opacity:.95}100%{opacity:0;transform:scale(1.6)}}
  .err{position:absolute;inset:0;z-index:30;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;padding:1.5rem;text-align:center;background:rgba(3,8,13,.92);backdrop-filter:blur(6px)}
  .err h3{font-family:var(--ff-serif);font-size:1.15rem;font-weight:460}
  .err p{font-size:.85rem;color:var(--muted);max-width:22ch;line-height:1.5}
  .err a{font-family:var(--ff-label);font-weight:700;font-size:.8rem;color:var(--emerald-ink);background:var(--flow);border-radius:100px;padding:.6rem 1.1rem;text-decoration:none}
  @media (prefers-reduced-motion:reduce){
    *,*::before,*::after{animation:none!important;transition-duration:.01ms!important}
    .tile .fill{opacity:1;transform:none;filter:none}
    .sweep{display:none}
  }
`;

function tilesHtml() {
  return TILE_LABELS.map((label, i) => {
    const cls = CLASS_CYCLE[i % CLASS_CYCLE.length];
    const frameAttr = GRID_FRAME_IDS[i] ? ` data-frame="${esc(GRID_FRAME_IDS[i])}"` : '';
    return `<div class="tile"${frameAttr}><div class="fill ${cls}">${esc(label)}</div></div>`;
  }).join('');
}

function pageMarkup() {
  return `
<div class="stage">
  <div class="caption">
    <span class="kick">social2scale · live</span>
    <h2>Dein Feed entsteht <em>gerade</em>.</h2>
    <p>Das dauert normalerweise 15–40 Sekunden. Bleib einfach hier.</p>
  </div>

  <div class="space">
    <div class="phone" id="phone">
      <div class="ios">
        <div class="island"></div>
        <div class="statusbar">
          <span class="time" id="clock">9:41</span>
          <span class="sys">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="#fff"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="#fff"><path d="M8 2.2c2.1 0 4 .8 5.4 2.1l1.3-1.4C13 1.2 10.6.2 8 .2S3 1.2 1.3 2.9l1.3 1.4C4 3 5.9 2.2 8 2.2zm0 3.3c1.1 0 2.2.4 3 1.2l1.3-1.4C11.9 4 10 3.2 8 3.2s-3.9.8-5.3 2.1L4 6.7c.8-.8 1.9-1.2 3-1.2zm0 3.2c.6 0 1.1.2 1.5.6L8 11l-1.5-1.4c.4-.4.9-.6 1.5-.6z"/></svg>
            <svg width="25" height="12" viewBox="0 0 25 12"><rect x="1" y="1" width="20" height="10" rx="3" fill="none" stroke="#fff" stroke-opacity=".5"/><rect x="2.5" y="2.5" width="15" height="7" rx="1.5" fill="#fff"/><rect x="22.5" y="4" width="1.5" height="4" rx=".75" fill="#fff" fill-opacity=".5"/></svg>
          </span>
        </div>

        <div class="ig">
          <div class="ig-top">
            <span class="name">dein.profil <span class="chev">▾</span></span>
            <span class="sp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </span>
          </div>
          <div class="ig-prof">
            <div class="ig-av" id="avatar"><div>·</div></div>
            <div class="ig-stats">
              <div class="ig-stat"><b>9</b><span>Beiträge</span></div>
              <div class="ig-stat"><b>1.2k</b><span>Follower</span></div>
              <div class="ig-stat"><b>318</b><span>Gefolgt</span></div>
            </div>
          </div>
          <div class="ig-meta">
            <div class="n">Dein Feed</div>
            <div class="b">entsteht gerade, live.</div>
          </div>
          <div class="ig-btns"><button class="pri">Profil bearbeiten</button><button>Teilen</button></div>
          <div class="ig-tabs">
            <div class="tab act"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg></div>
            <div class="tab"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 8l6 4-6 4V8z" fill="#fff"/></svg></div>
            <div class="tab"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3z"/></svg></div>
          </div>
          <div class="grid" id="grid">${tilesHtml()}<div class="sweep" id="sweep"></div></div>
        </div>

        <div class="sheet" id="sheet">
          <div class="row1">
            <span class="mark">s2</span><span class="brand">social2scale baut deinen Feed</span>
            <span class="eq" id="eq"><i></i><i></i><i></i><i></i></span>
          </div>
          <div class="track"><div class="fillbar" id="fill"></div></div>
          <div class="row2">
            <span class="step" id="step"><span id="stepText">${esc(STEPS[0].text)}</span></span>
            <span class="count" id="count">0 / ${FRAME_IDS.length}</span>
          </div>
        </div>

        <div class="bloom" id="bloom"></div>
        <div class="err" id="err" style="display:none"></div>
        <div class="home-ind"></div>
      </div>
    </div>
  </div>
</div>
${revealMarkup(REVEAL)}`;
}

// Token/URLs kommen server-seitig als vorgefertigte Literale rein (kein
// Zusammenbau im Client) — so steht `/api/status/<token>` und `/img/<token>/`
// WOERTLICH im ausgelieferten HTML (statt erst zur Laufzeit zusammengebaut).
const PAGE_SCRIPT = `
  const POLL_INTERVAL_MS = 1500;
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiles = [...document.querySelectorAll('.tile')];
  const sweepEl = $('sweep'), eqEl = $('eq'), fillEl = $('fill'), countEl = $('count'),
    avatarEl = $('avatar'), errEl = $('err'), bloomEl = $('bloom');

  // ── Live-Uhrzeit in der Statusleiste ──
  function tickClock() { const d = new Date(); $('clock').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
  tickClock(); setInterval(tickClock, 15000);

  // ── Fortschrittstext mit sanftem Wechsel (portiert aus build.html) ──
  let lastStepText = '';
  function setStep(text) {
    if (!text || text === lastStepText) return;
    lastStepText = text;
    const el = $('stepText');
    if (reduce) { el.textContent = text; return; }
    el.style.transform = 'translateY(-100%)'; el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = text; el.style.transition = 'none'; el.style.transform = 'translateY(100%)';
      requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = 'translateY(0)'; el.style.opacity = '1'; });
    }, 200);
  }

  // ── Echte Bilder einsetzen, sobald buildStatus() sie mitliefert (nur bei ready) ──
  function applyRealTile(tile, images) {
    const frame = tile.dataset.frame;
    if (!frame || tile.dataset.real === '1') return;
    const key = 'free/' + TOKEN + '/' + frame + '.jpg';
    if (images.indexOf(key) === -1) return;
    tile.dataset.real = '1';
    const fill = tile.querySelector('.fill');
    if (fill) fill.remove();
    const img = document.createElement('img');
    img.src = IMG_BASE + frame + '.jpg'; img.loading = 'lazy'; img.alt = '';
    tile.appendChild(img); tile.classList.add('done');
  }
  function applyAvatar(images) {
    if (avatarEl.dataset.real === '1') return;
    const key = 'free/' + TOKEN + '/' + AVATAR_FRAME_ID + '.jpg';
    if (images.indexOf(key) === -1) return;
    avatarEl.dataset.real = '1'; avatarEl.innerHTML = '';
    const img = document.createElement('img');
    img.src = IMG_BASE + AVATAR_FRAME_ID + '.jpg'; img.loading = 'lazy'; img.alt = '';
    avatarEl.appendChild(img);
  }

  let total = TOTAL_DEFAULT;
  function render(done, step, images) {
    total = Math.max(1, total);
    const progress = Math.min(1, done / total);
    fillEl.style.transform = 'scaleX(' + progress + ')';
    countEl.textContent = done + ' / ' + total;
    const filled = Math.round(progress * tiles.length);
    tiles.forEach((tile, i) => {
      const wasDone = tile.classList.contains('done');
      const isDone = i < filled;
      tile.classList.toggle('done', isDone);
      if (isDone && !wasDone && !reduce) { tile.classList.add('land'); setTimeout(() => tile.classList.remove('land'), 700); }
      if (isDone && images) applyRealTile(tile, images);
    });
    if (images) applyAvatar(images);
    setStep(step);
    const fertig = done >= total;
    sweepEl.style.display = fertig ? 'none' : '';
    eqEl.style.opacity = fertig ? '0' : '1';
  }

  // ── Fertig: Bloom auf dem Build-Handy + das echte Reveal darunter einblenden ──
  function showReveal() {
    setStep('Fertig — scroll dich rein.');
    eqEl.style.opacity = '0';
    if (!reduce) { bloomEl.classList.remove('fire'); void bloomEl.offsetWidth; bloomEl.classList.add('fire'); }
    revealSection();
  }

  // ── Minimal (Plan 3 Task 5 baut die volle, grundabhaengige Fehlerseite aus) ──
  function showError(reason) {
    console.error('[build] Fehlerzustand:', reason);
    errEl.innerHTML = '<h3>' + ERROR_TEXT.title + '</h3><p>' + ERROR_TEXT.body + '</p>' +
      '<a href="mailto:info@social2scale.com">Kurz melden</a>';
    errEl.style.display = 'flex';
  }

  // ── Poller: ersetzt den Auto-Play-Zeitstrahl des Prototyps durch den echten Stand ──
  let pollTimer = null;
  async function poll() {
    let data;
    try {
      const res = await fetch(STATUS_URL);
      if (!res.ok) { console.error('[build] Status-Antwort nicht ok:', res.status); return; }
      data = await res.json();
    } catch (err) {
      console.error('[build] Status-Abruf fehlgeschlagen:', err);
      return;
    }
    if (typeof data.total === 'number' && data.total > 0) total = data.total;
    render(data.done || 0, data.step, data.images);
    if (data.state === 'ready') { clearInterval(pollTimer); showReveal(); return; }
    if (data.state === 'failed' || data.state === 'not_found') { clearInterval(pollTimer); showError(data.state); return; }
  }
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);

  // ── rAF: Handy-Schweben + Bokeh-Staub (Tiefe, portiert aus build.html) ──
  const phoneEl = $('phone'); let px = 0, py = 0;
  addEventListener('pointermove', (e) => { px = (e.clientX / innerWidth - .5) * 2; py = (e.clientY / innerHeight - .5) * 2; });
  const cv = $('dust'), c2 = cv ? cv.getContext('2d') : null; let dust = [];
  function sizeCanvas() {
    if (!cv) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(innerWidth, 900) / 18);
    dust = Array.from({ length: n }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, z: Math.random(), vx: (Math.random() - .5) * .12, vy: -0.05 - Math.random() * .11 }));
  }
  sizeCanvas(); addEventListener('resize', sizeCanvas);
  let t0 = null;
  function loop(ts) {
    if (t0 === null) t0 = ts; const t = (ts - t0) / 1000;
    const ry = Math.sin(t * .5) * 3.2 + px * 5, rx = -Math.cos(t * .4) * 2.2 - py * 3.5;
    phoneEl.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(' + (Math.sin(t * .8) * 3) + 'px)';
    if (c2) {
      c2.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of dust) {
        p.x += p.vx * (0.4 + p.z); p.y += p.vy * (0.4 + p.z);
        if (p.y < -5) { p.y = innerHeight + 5; p.x = Math.random() * innerWidth; }
        if (p.x < -5) p.x = innerWidth + 5;
        if (p.x > innerWidth + 5) p.x = -5;
        c2.globalAlpha = 0.07 + p.z * 0.24;
        c2.fillStyle = p.z > .62 ? 'rgba(31,166,224,1)' : (p.z > .32 ? 'rgba(31,201,152,1)' : 'rgba(244,245,243,1)');
        c2.beginPath(); c2.arc(p.x, p.y, 0.4 + p.z * 1.5, 0, 7); c2.fill();
      }
      c2.globalAlpha = 1;
    }
    requestAnimationFrame(loop);
  }
  if (!reduce) requestAnimationFrame(loop); else if (cv) cv.style.display = 'none';
`;

/**
 * Baut den Build-Screen (`GET /r/:token`).
 * @param {string} token - bereits validiert (Route-Match `[a-f0-9]{8,128}`).
 * @returns {Response}
 */
export function resultPage(token) {
  const statusUrl = `/api/status/${token}`;
  const imgBase = `/img/${token}/`;

  const head = `<style>${PAGE_STYLE}${REVEAL_STYLE}</style>`;
  const bootstrap =
    `const TOKEN=${JSON.stringify(token)};` +
    `const STATUS_URL=${JSON.stringify(statusUrl)};` +
    `const IMG_BASE=${JSON.stringify(imgBase)};` +
    `const AVATAR_FRAME_ID=${JSON.stringify(AVATAR_FRAME_ID)};` +
    `const TOTAL_DEFAULT=${JSON.stringify(FRAME_IDS.length)};` +
    `const ERROR_TEXT=${JSON.stringify(ERROR_COPY.default)};`;
  const body = `${pageMarkup()}<script>${bootstrap}${PAGE_SCRIPT}${REVEAL_SCRIPT}</script>`;

  return htmlDoc({ title: 'Dein Feed entsteht · social2scale', head, body });
}
