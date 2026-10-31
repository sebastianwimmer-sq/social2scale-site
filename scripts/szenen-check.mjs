#!/usr/bin/env node
/**
 * Prüft die Motive je Abschnitt (28.10.2026, Quelle scripts/szenen-quelle.mjs, Plan docs/superpowers/specs/2026-10-28-szenen-je-abschnitt.md).
 *
 *   node scripts/szenen-check.mjs               Quelle, Chromium Desktop, Chromium reduce (Kontrast am Pixel), WebKit iPhone, Ruckeln
 *   node scripts/szenen-check.mjs --selbsttest  vier kaputte Fälle MÜSSEN rot werden:
 *                                                leere szenen.js (nichts geht an), Papiertext zu hell (Kontrast),
 *                                                Deko breiter als das Handy (seitliches Scrollen),
 *                                                Lampenschein auf Wissen, der per top mitwandert (Layout-Sprung, Fehler vom 28.10.)
 *
 *  1. Eigenes Motiv: jedes Motiv nur auf einer Seite (außer Bühnenmarke und Notizkarte, die Komponente unter jedem Abschluss)
 *  2. Jeder Inhaltsabschnitt hat ein Motiv (Ausnahmen benannt: Kopf mit Raum, Pflichttext)
 *  3. Deko trägt keinen Text (Inhalt bleibt unverändert, Screenreader hören nichts Neues)
 *  4. Beim Hinsehen geht die Szene an (.sz-an), Teile leuchten in der Bildmitte (.sz-lit), Scroll-Szenen bekommen --sp
 *  5. Bewegung reduzieren: alles sofort im Endzustand
 *  6. Kontrast am Pixel: Text unsichtbar schalten, Grund darunter fotografieren, gegen die Textfarbe rechnen (4,5 bzw. 3 bei großer Schrift)
 *  7. iPhone (WebKit): kein seitliches Scrollen, Szenen gehen an
 *  8. Ruckeln beim Scrollen: CPU x4, Anteil Bilder > 50 ms unter 5 %; Layout-Sprünge dabei (CLS ohne Eingabe) ≤ 0,1
 *  9. Das LCP-Element liegt nie in einer Deko
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { SEITEN } from './szenen-quelle.mjs';

const { chromium, webkit, devices } = await import('/opt/homebrew/lib/node_modules/playwright/index.mjs');
const WURZEL = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const GETEILT = ['markierung', 'notizkarte'];
// Abschnitte ohne eigenes Motiv, mit Grund: Kopf trägt den Raum (raum-bauen.mjs), Pflichttext bleibt ruhig
const OHNE_MOTIV = [/class="hero"/, /class="[a-z]+-hero"/, /class="dk-start"/, /legal-blk/, /class="blk offer"/];
const RUCKEL_GRENZE = 5;
const TYPEN = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4' };
const url = (datei) => '/' + datei.replace(/index\.html$/, '');

let verbiegen = null;
const server = await new Promise((fertig) => {
  const s = createServer(async (anf, ant) => {
    let pfad = resolve(WURZEL, '.' + decodeURIComponent(anf.url.split('?')[0]));
    if (pfad !== WURZEL && !pfad.startsWith(WURZEL + sep)) { ant.writeHead(403); return ant.end('nein'); }
    if (anf.url.split('?')[0].endsWith('/')) pfad = join(pfad, 'index.html');
    try {
      let inhalt = await readFile(pfad);
      if (verbiegen === 'js' && pfad.endsWith('/szenen/szenen.js')) inhalt = Buffer.from('/* leer */');
      if (verbiegen === 'kontrast' && pfad.endsWith('/szenen/preise.css')) inhalt = Buffer.from(inhalt.toString() + '\n[data-sz="mappe"] .pr-details summary,[data-sz="mappe"] .pr-details summary *{color:#26302D !important}');
      // genau der Fehler vom 28.10.: der Lampenschein wandert per top statt per transform
      if (verbiegen === 'sprung' && pfad.endsWith('/szenen/wissen.css')) inhalt = Buffer.from(inhalt.toString() + '\n[data-sz="lesetisch"] .lt-pool{inset:auto 0 auto 0;height:560px;top:clamp(0px,calc(var(--sp,0) * 100% - 280px),calc(100% - 560px))}');
      if (verbiegen === 'breite' && pfad.endsWith('/szenen/preise.css')) inhalt = Buffer.from(inhalt.toString() + '\n[data-sz]{overflow-x:visible !important}[data-sz="massband"] .mb-band{left:-40px;right:-400px}');
      if (pfad.endsWith('.html')) inhalt = Buffer.from(inhalt.toString().replace(/;?\s*upgrade-insecure-requests/, ''));
      ant.writeHead(200, { 'Content-Type': TYPEN[extname(pfad)] || 'application/octet-stream' });
      ant.end(inhalt);
    } catch { ant.writeHead(404); ant.end('weg'); }
  });
  s.listen(0, '127.0.0.1', () => fertig(s));
});
const BASIS = `http://127.0.0.1:${server.address().port}`;

let rot = 0;
const melde = (ok, text) => { if (!ok) rot++; console.log(`  ${ok ? '🟢' : '🔴'} ${text}`); };

// ── 1–3 Quelle und Dateien ───────────────────────────────────────────────────────────────────────
async function quelle() {
  console.log('Quelle');
  const wo = new Map();
  for (const s of SEITEN) for (const a of s.abschnitte) {
    if (!wo.has(a.sz)) wo.set(a.sz, new Set());
    wo.get(a.sz).add(s.css + ':' + s.dateien[0]);
  }
  const doppelt = [...wo].filter(([sz, orte]) => orte.size > 1 && !GETEILT.includes(sz) && !(sz === 'notizkarte'));
  melde(doppelt.length === 0, `jedes Motiv auf genau einer Seite${doppelt.length ? ': doppelt ' + doppelt.map(([s, o]) => `${s} (${[...o].join(', ')})`).join('; ') : ` (${wo.size} Motive)`}`);
  let ohne = [], textInDeko = [];
  for (const s of SEITEN) for (const d of s.dateien) {
    const t = await readFile(resolve(WURZEL, d), 'utf8');
    const main = t.slice(t.indexOf('<main'), t.indexOf('</main>') + 7) || t;
    for (const m of main.matchAll(/<section[^>]*>/g)) {
      if (m[0].includes('data-sz=') || OHNE_MOTIV.some((r) => r.test(m[0]))) continue;
      if (s.css === 'wissen' && /w-blk/.test(m[0])) continue; // Absätze im Artikel liegen auf dem Lesetisch des Artikels
      ohne.push(`${d}: ${m[0].slice(0, 60)}`);
    }
    for (const m of t.matchAll(/<!-- SZENE ([a-z0-9-]+) -->([\s\S]*?)<!-- \/SZENE -->/g)) {
      const text = m[2].replace(/<[^>]+>/g, '').trim();
      if (text) textInDeko.push(`${d} › ${m[1]}: „${text.slice(0, 30)}“`);
    }
  }
  melde(ohne.length === 0, `jeder Inhaltsabschnitt hat ein Motiv${ohne.length ? ': ' + ohne.slice(0, 5).join(' | ') : ''}`);
  melde(textInDeko.length === 0, `Deko ohne Text${textInDeko.length ? ': ' + textInDeko.slice(0, 3).join(' | ') : ''}`);
}

// ── Browser-Helfer ───────────────────────────────────────────────────────────────────────────────
const VORLAUF = () => {
  window.__lcp = null;
  window.__cls = 0;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch { /* WebKit */ }
  try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.element; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch { /* WebKit */ }
};
async function oeffne(browser, pfad, opt = {}) {
  const c = await browser.newContext(opt.geraet ? { ...opt.geraet, reducedMotion: opt.motion || 'no-preference' } : { viewport: { width: 1440, height: 900 }, reducedMotion: opt.motion || 'no-preference' });
  await c.route('**/closing.social2scale.com/**', (r) => r.abort());
  await c.addInitScript(VORLAUF);
  const p = await c.newPage();
  await p.goto(BASIS + pfad, { waitUntil: 'load' });
  // Die Gestaltung lädt szenen.js nach (data-css): erst messen, wenn jedes Szenen-Stylesheet da ist
  await p.waitForFunction(() => {
    const soll = (document.querySelector('script[src="/szenen/szenen.js"]')?.dataset.css || '').split(',').filter(Boolean);
    const da = [...document.querySelectorAll('link[href^="/szenen/"]')];
    return soll.every((n) => da.some((l) => l.getAttribute('href') === `/szenen/${n}.css`)) && da.every((l) => l.sheet);
  }, null, { timeout: 8000 }).catch(() => {});
  return { c, p };
}

// 4 Hinsehen: jede Szene geht an, Teile leuchten, Scroll-Szenen bekommen --sp
async function verhalten(browser, pfad) {
  const { c, p } = await oeffne(browser, pfad);
  const szenen = await p.$$eval('[data-sz]', (l) => l.map((e) => e.getAttribute('data-sz')));
  const aus = [], teilAus = [], spFehlt = [];
  for (let i = 0; i < szenen.length; i++) {
    const el = (await p.$$('[data-sz]'))[i];
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    const an = await p.waitForFunction((k) => document.querySelectorAll('[data-sz]')[k].classList.contains('sz-an'), i, { timeout: 3000 }).then(() => true, () => false);
    if (!an) aus.push(szenen[i]);
    const teile = await el.$$('[data-sz-teil]');
    for (const t of teile) {
      await t.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      const lit = await p.waitForFunction((e) => e.classList.contains('sz-lit'), t, { timeout: 2000 }).then(() => true, () => false);
      if (!lit) { teilAus.push(szenen[i]); break; }
    }
    // --sp kommt im nächsten Frame nach dem Einschalten: darauf warten, nicht sofort lesen
    const sp = await p.waitForFunction((e) => getComputedStyle(e).getPropertyValue('--sp') !== '', el, { timeout: 1500 }).then(() => true, () => false);
    if (an && !sp) spFehlt.push(szenen[i]);
  }
  melde(aus.length === 0, `${pfad}: ${szenen.length} Szenen gehen beim Hinsehen an${aus.length ? ' — aus: ' + aus.join(', ') : ''}`);
  melde(teilAus.length === 0, `${pfad}: Teile leuchten in der Bildmitte${teilAus.length ? ' — nicht in: ' + teilAus.join(', ') : ''}`);
  melde(spFehlt.length === 0, `${pfad}: Szenen kennen ihren Scroll-Fortschritt${spFehlt.length ? ' — ohne --sp: ' + spFehlt.join(', ') : ''}`);
  const lcpInDeko = await p.evaluate(() => !!window.__lcp?.closest?.('.sz-deko'));
  melde(!lcpInDeko, `${pfad}: LCP liegt nicht in einer Deko`);
  await c.close();
}

// 5 + 6 Ruhig und Kontrast am Pixel
const KONTRAST_SAMMELN = () => {
  const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  window.__kontrast = (a, b) => { const x = lum(...a), y = lum(...b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  window.__lum = lum;
};
async function kontrast(browser, pfad) {
  const { c, p } = await oeffne(browser, pfad, { motion: 'reduce' });
  await p.evaluate(KONTRAST_SAMMELN);
  const ruhig = await p.evaluate(() => [...document.querySelectorAll('[data-sz]')].every((e) => e.classList.contains('sz-an')));
  melde(ruhig, `${pfad}: Bewegung reduzieren — alle Szenen sofort im Endzustand`);
  // offene Aufklapper messen (Mappe, Karteikarten): sonst sieht das Tor die Blätter nie
  await p.evaluate(() => document.querySelectorAll('[data-sz] details').forEach((d) => { d.open = true; }));
  const vh = 900, befunde = [];
  let gemessen = 0;
  const hoehe = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hoehe; y += vh - 100) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(120);
    const proben = await p.evaluate(() => {
      const aus = [];
      for (const sz of document.querySelectorAll('[data-sz]')) {
        const w = document.createTreeWalker(sz, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          if (!n.textContent.trim()) continue;
          const e = n.parentElement;
          if (e.closest('.sz-deko,[aria-hidden="true"],svg,.raum,.btn,.w-btn,.dk-cta,.ab-num,.fl-num')) continue;
          const cs = getComputedStyle(e);
          if (cs.visibility === 'hidden' || +cs.opacity < 0.1) continue;
          if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text' || getComputedStyle(e.parentElement).backgroundClip === 'text') continue;
          const r = document.createRange(); r.selectNodeContents(n);
          const box = [...r.getClientRects()].find((b) => b.width > 6 && b.height > 6);
          if (!box || box.top < 70 || box.bottom > innerHeight - 4 || box.left < 0 || box.right > innerWidth) continue;
          const roh = cs.webkitTextFillColor && !/transparent|rgba\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color;
          // rgb()/rgba() in 0–255, color(srgb …) in 0–1 (kern.md: Farb-Parser kennen color(srgb …))
          const zahlen = roh.match(/[\d.]+/g).map(Number);
          const farbe = roh.startsWith('color(srgb') ? [zahlen[0] * 255, zahlen[1] * 255, zahlen[2] * 255, zahlen[3] ?? 1] : zahlen;
          if (farbe.length > 3 && farbe[3] === 0) continue;
          const px = parseFloat(cs.fontSize), fett = +cs.fontWeight >= 700;
          aus.push({ sz: sz.getAttribute('data-sz'), text: n.textContent.trim().slice(0, 28), farbe, gross: px >= 24 || (px >= 18.66 && fett), box: { x: box.left, y: box.top, w: box.width, h: box.height } });
          if (aus.length > 220) return aus;
        }
      }
      return aus;
    });
    if (!proben.length) continue;
    await p.addStyleTag({ content: '[data-sz] *{color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important;caret-color:transparent !important}' });
    await p.waitForTimeout(60);
    const bild = (await p.screenshot({ type: 'png' })).toString('base64');
    const ergebnisse = await p.evaluate(async ({ bild, proben }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + bild; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
      const s = img.width / innerWidth;
      const mittel = (x, y) => { const d = cx.getImageData(Math.round(x * s) - 2, Math.round(y * s) - 2, 5, 5).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const k = d.length / 4; return [r / k, g / k, b / k]; };
      return proben.map((pr) => {
        const yy = pr.box.y + pr.box.h / 2;
        const punkte = [pr.box.x + 3, pr.box.x + pr.box.w / 2, pr.box.x + pr.box.w - 3].map((x) => mittel(x, yy));
        const [fr, fg, fb, fa = 1] = pr.farbe;
        const werte = punkte.map((g) => window.__kontrast([fr * fa + g[0] * (1 - fa), fg * fa + g[1] * (1 - fa), fb * fa + g[2] * (1 - fa)], g));
        return { ...pr, k: Math.min(...werte) };
      });
    }, { bild, proben });
    await p.evaluate(() => document.querySelectorAll('style').forEach((st) => { if (st.textContent.startsWith('[data-sz] *{color:transparent')) st.remove(); }));
    for (const e of ergebnisse) {
      gemessen++;
      if (e.k < (e.gross ? 3 : 4.5)) befunde.push(`${e.sz} „${e.text}“ ${e.k.toFixed(2)}:1`);
    }
  }
  const einzig = [...new Set(befunde)];
  melde(gemessen > 0 && einzig.length === 0, `${pfad}: Kontrast am Pixel (${gemessen} Zeilen gemessen)${einzig.length ? ' — zu schwach: ' + einzig.slice(0, 6).join(' | ') : ''}${gemessen === 0 ? ' — NICHTS gemessen' : ''}`);
  await c.close();
}

// 7 iPhone: nichts ragt seitlich heraus, Szenen gehen an
async function handy(browser, pfad) {
  const { c, p } = await oeffne(browser, pfad, { geraet: devices['iPhone 15 Pro'] });
  const hoehe = await p.evaluate(() => document.documentElement.scrollHeight);
  let breit = 0;
  for (let y = 0; y < hoehe; y += 500) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(40);
    breit = Math.max(breit, await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth));
  }
  // jede Szene einmal mittig ins Bild holen und warten, bis sie an ist (deterministisch statt Zeitfenster)
  const n = await p.evaluate(() => document.querySelectorAll('[data-sz]').length);
  for (let i = 0; i < n; i++) {
    await p.evaluate((k) => document.querySelectorAll('[data-sz]')[k].scrollIntoView({ block: 'center' }), i);
    await p.waitForFunction((k) => document.querySelectorAll('[data-sz]')[k].classList.contains('sz-an'), i, { timeout: 3000 }).catch(() => {});
  }
  melde(breit <= 1, `${pfad} iPhone: kein seitliches Scrollen${breit > 1 ? ` — ${breit}px zu breit` : ''}`);
  const aus = await p.evaluate(() => [...document.querySelectorAll('[data-sz]')].filter((e) => !e.classList.contains('sz-an')).map((e) => e.getAttribute('data-sz')));
  const alle = await p.evaluate(() => document.querySelectorAll('[data-sz]').length);
  melde(aus.length === 0, `${pfad} iPhone: ${alle - aus.length}/${alle} Szenen nach dem Durchscrollen an${aus.length ? ' — aus: ' + aus.join(', ') : ''}`);
  await c.close();
}

// 8b Layout-Sprünge BEIM SCROLLEN (Besucher-Sim 28.10.: ein per top verschobener Lichtschein ergab CLS 1,57).
// Sprünge beim Laden (Schriften, Raum) misst besucher-sim; hier zählt nur, was nach dem Laden beim Scrollen springt.
async function spruenge(browser, pfad) {
  const { c, p } = await oeffne(browser, pfad);
  await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__cls = 0; });
  const hoehe = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hoehe; y += 300) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(150); }
  const cls = await p.evaluate(() => window.__cls);
  melde(cls <= 0.1, `${pfad}: Layout springt beim Scrollen nicht (CLS ${cls.toFixed(3)} ≤ 0,1)`);
  await c.close();
}

// 8 Ruckeln beim Scrollen
async function ruckeln(browser, pfad) {
  const { c, p } = await oeffne(browser, pfad);
  const cdp = await c.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const anteil = await p.evaluate(async () => {
    const zeiten = []; let alt = performance.now();
    const ende = document.documentElement.scrollHeight - innerHeight;
    for (let y = 0; y < ende; y += 14) {
      scrollTo(0, y);
      await new Promise((f) => requestAnimationFrame(f));
      const t = performance.now(); zeiten.push(t - alt); alt = t;
    }
    return zeiten.length ? (zeiten.filter((z) => z > 50).length / zeiten.length) * 100 : 100;
  });
  melde(anteil < RUCKEL_GRENZE, `${pfad}: Ruckeln beim Scrollen (CPU x4) ${anteil.toFixed(1)} % Bilder > 50 ms`);

  await c.close();
}

async function lauf({ voll }) {
  await quelle();
  const seiten = [...new Set(SEITEN.flatMap((s) => [s.dateien[0]]))].map(url);
  const zusatz = voll ? ['/en/pricing/', '/en/knowledge/how-long-until-results/'] : [];
  const cr = await chromium.launch();
  console.log('\nChromium — Hinsehen');
  for (const s of voll ? [...seiten, ...zusatz] : ['/preise/']) await verhalten(cr, s);
  console.log('\nChromium reduce — Endzustand und Kontrast');
  for (const s of voll ? [...seiten, ...zusatz] : ['/preise/']) await kontrast(cr, s);
  console.log('\nRuckeln und Layout-Sprünge');
  for (const s of voll ? seiten : ['/preise/']) await ruckeln(cr, s);
  for (const s of voll ? seiten : ['/wissen/was-kostet-social-media-betreuung/']) await spruenge(cr, s);
  await cr.close();
  const wk = await webkit.launch();
  console.log('\nWebKit iPhone');
  for (const s of voll ? [...seiten, ...zusatz] : ['/preise/']) await handy(wk, s);
  await wk.close();
}

if (SELBSTTEST) {
  let ok = true;
  for (const fall of ['js', 'kontrast', 'breite', 'sprung']) {
    console.log(`\n── Selbsttest: ${fall} (muss rot werden)`);
    verbiegen = fall; rot = 0;
    await lauf({ voll: false });
    if (rot === 0) { ok = false; console.log(`🔴 Selbsttest „${fall}“ blieb grün — das Tor sieht den Fehler nicht`); }
    else console.log(`🟢 Selbsttest „${fall}“ rot wie erwartet (${rot} Befund(e))`);
  }
  verbiegen = null; rot = 0;
  console.log('\n── Gegenprobe: unverändert (muss grün sein)');
  await lauf({ voll: false });
  if (rot) { ok = false; console.log('🔴 Gegenprobe rot — das Tor meldet auf dem echten Stand Fehler'); }
  server.close();
  console.log(ok ? '\n✓ szenen-check --selbsttest: Tor sieht alle vier Fehler' : '\n✗ szenen-check --selbsttest');
  process.exit(ok ? 0 : 1);
}
await lauf({ voll: true });
server.close();
console.log(rot ? `\n✗ szenen-check: ${rot} Befund(e)` : '\n✓ szenen-check: alle Szenen grün');
process.exit(rot ? 1 : 0);
