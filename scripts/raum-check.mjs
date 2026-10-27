#!/usr/bin/env node
/**
 * Prueft den Raum (raum.css / raum.js, Richtung E „Lichtstudio“, 27.10.2026) auf jeder Seite, die ihn traegt.
 *
 *   node scripts/raum-check.mjs                       Chromium, WebKit, Chromium reduce, Ruckeln bei CPU x4
 *   node scripts/raum-check.mjs --selbsttest          zwei kaputte Faelle, beide MUESSEN rot werden:
 *                                                      leere raum.js (Licht nie an, Raum antwortet nicht) und
 *                                                      raum.css mit filter:blur auf dem bewegten Kegel
 *
 * Was hier gemessen wird (regeln/web.md › Tiefe und Immersion, Plan docs/superpowers/specs/2026-10-27-immersiv-design.md):
 *  1. Licht an: der Raum geht beim Hinsehen an (.an) und der Kegel steht danach voll
 *  2. Antwort: eine Ebene verschiebt sich bei Maus (≥ 4 px) und beim Scrollen
 *  3. Halten: wo Endloses laeuft, gibt es den Knopf, und danach steht die Schleife (rAF zaehlen)
 *  4. Ruhig (reduce): Licht sofort an, kein Versatz, kein Staub, keine Schleife
 *  5. Bewegte Ebenen ohne filter:blur. (Das Liquid Glass der Leiste bleibt: gemessen wird das Ruckeln in 7, nicht die Bauart.)
 *  6. Das erste grosse Bild (LCP) ist nie Leinwand oder Video und nie ein spaet ladendes Bild (loading=lazy)
 *  7. Ruckeln beim Scrollen: CPU x4, 14-px-Schritte, Anteil Bilder > 50 ms unter 5 %
 *  8. Eigener Ort: jede Seite traegt einen anderen raum--Modifikator
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const { chromium, webkit } = await import('/opt/homebrew/lib/node_modules/playwright/index.mjs');
const WURZEL = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const SEITEN = ['/', '/ablauf/'];
const RUCKEL_GRENZE = 5;
const MIN_VERSATZ_PX = 4;
const TYPEN = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4' };

// Kaputte Faelle fuer den Selbsttest: je Lauf genau eine Datei verbogen
let verbiegen = null;
const server = await new Promise((fertig) => {
  const s = createServer(async (anf, ant) => {
    // Nur Dateien IM Baum und nur lokal (12.10.2026: Pfadausbruch + WLAN)
    let pfad = resolve(WURZEL, '.' + decodeURIComponent(anf.url.split('?')[0]));
    if (pfad !== WURZEL && !pfad.startsWith(WURZEL + sep)) { ant.writeHead(403); return ant.end('nein'); }
    if (anf.url.split('?')[0].endsWith('/')) pfad = join(pfad, 'index.html');
    try {
      let inhalt = await readFile(pfad);
      if (verbiegen === 'js' && pfad.endsWith('/raum.js')) inhalt = Buffer.from('/* leer */');
      if (verbiegen === 'blur' && pfad.endsWith('/raum.css')) inhalt = Buffer.from(inhalt.toString() + '\n.raum-kegel{filter:blur(12px)}');
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

// rAF mitzaehlen, LCP mitschreiben — vor jedem Skript der Seite
const VORLAUF = () => {
  window.__raf = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => raf((t) => { window.__raf++; f(t); });
  window.__lcp = null;
  try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.element; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch { /* WebKit */ }
};
const versatz = () => {
  const e = document.querySelector('[data-raum] .raum-kegel');
  const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
  return { x: m.m41, y: m.m42 };
};
const rafIn = async (p, ms) => { const a = await p.evaluate(() => window.__raf); await p.waitForTimeout(ms); return (await p.evaluate(() => window.__raf)) - a; };

async function oeffne(browser, pfad, motion) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: motion });
  await c.route('**/closing.social2scale.com/**', (r) => r.abort());
  await c.addInitScript(VORLAUF);
  const p = await c.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  await p.goto(BASIS + pfad, { waitUntil: 'load' });
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  return { c, p, fehler };
}

async function lauf() {
  const orte = new Map();
  // Chromium + WebKit, volle Bewegung
  for (const [name, motor] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const b = await motor.launch();
    for (const pfad of SEITEN) {
      const { c, p, fehler } = await oeffne(b, pfad, 'no-preference');
      const probleme = [];
      const an = await p.waitForFunction(() => {
        const r = document.querySelector('[data-raum]');
        return r && r.classList.contains('an') && parseFloat(getComputedStyle(r.querySelector('.raum-kegel')).opacity) > 0.9;
      }, null, { timeout: 6000 }).then(() => true, () => false);
      if (!an) probleme.push('Licht geht nicht an');
      if (name === 'Chromium') {
        await p.mouse.move(80, 300, { steps: 4 }); await p.waitForTimeout(1500); const links = await p.evaluate(versatz);
        await p.mouse.move(1360, 300, { steps: 4 }); await p.waitForTimeout(1500); const rechts = await p.evaluate(versatz);
        const dx = Math.abs(rechts.x - links.x);
        if (dx < MIN_VERSATZ_PX) probleme.push(`Maus bewegt den Raum nicht (${dx.toFixed(1)} px)`);
        await p.evaluate(() => scrollTo(0, 260)); await p.waitForTimeout(900); const unten = await p.evaluate(versatz);
        const dy = Math.abs(unten.y - rechts.y);
        if (dy < MIN_VERSATZ_PX) probleme.push(`Scrollen bewegt den Raum nicht (${dy.toFixed(1)} px)`);
        await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
        const r = await p.evaluate(() => ({
          blur: [...document.querySelectorAll('.raum-ebene, .raum-ebene *')].filter((e) => /blur/.test(getComputedStyle(e).filter)).map((e) => e.className),
          lcpSchlecht: !!(window.__lcp && (/^(CANVAS|VIDEO)$/.test(window.__lcp.tagName) || window.__lcp.loading === 'lazy')),
          lcp: window.__lcp ? window.__lcp.tagName + '.' + window.__lcp.className : 'keins',
          ort: [...document.querySelector('[data-raum]').classList].find((k) => k.startsWith('raum--')) || '',
          staub: !!document.querySelector('[data-raum] .raum-staub'),
          knopf: !!document.querySelector('.raum-halt'),
        }));
        if (r.blur.length) probleme.push(`filter:blur auf bewegter Ebene: ${r.blur.join(', ')}`);
        if (r.lcpSchlecht) probleme.push(`erstes grosses Bild ist Leinwand/Video oder laedt spaet (${r.lcp})`);
        if (!r.ort) probleme.push('kein raum--Ort gesetzt');
        else if (orte.has(r.ort)) probleme.push(`Ort ${r.ort} schon auf ${orte.get(r.ort)}`);
        else orte.set(r.ort, pfad);
        if (r.staub && !r.knopf) probleme.push('Staub laeuft endlos ohne Halte-Knopf');
        if (r.knopf) {
          await p.click('.raum-halt');
          const n = await rafIn(p, 1000);
          if (n > 5) probleme.push(`nach „anhalten“ laeuft die Schleife weiter (${n} Frames/s)`);
          await p.click('.raum-halt');
        }
      }
      if (fehler.length) probleme.push(`Skriptfehler: ${fehler[0]}`);
      melde(!probleme.length, `${name.padEnd(9)} ${pfad.padEnd(9)} ${probleme.join(' · ') || 'Licht an, Raum antwortet'}`);
      await c.close();
    }
    await b.close();
  }

  // Ruhig: Standbild mit Licht an
  {
    const b = await chromium.launch();
    for (const pfad of SEITEN) {
      const { c, p, fehler } = await oeffne(b, pfad, 'reduce');
      await p.waitForTimeout(400);
      await p.mouse.move(80, 300); await p.mouse.move(1360, 300, { steps: 4 });
      const n = await rafIn(p, 1000);
      const r = await p.evaluate(() => ({
        an: document.querySelector('[data-raum]').classList.contains('an'),
        transform: [...document.querySelectorAll('.raum-ebene')].filter((e) => getComputedStyle(e).transform !== 'none').length,
        staub: [...document.querySelectorAll('.raum-staub')].filter((e) => getComputedStyle(e).display !== 'none').length,
      }));
      const probleme = [];
      if (!r.an) probleme.push('Licht nicht sofort an');
      if (r.transform) probleme.push(`${r.transform} Ebenen mit Versatz`);
      if (r.staub) probleme.push('Staub sichtbar');
      if (n > 5) probleme.push(`Schleife laeuft (${n} Frames/s)`);
      if (fehler.length) probleme.push(`Skriptfehler: ${fehler[0]}`);
      melde(!probleme.length, `reduce    ${pfad.padEnd(9)} ${probleme.join(' · ') || 'Standbild, Licht an'}`);
      await c.close();
    }
    await b.close();
  }

  // Ruckeln beim Scrollen, nie im Stand (27.10.: Wichteln ruckelte nur beim Scrollen)
  {
    const b = await chromium.launch();
    for (const pfad of SEITEN) {
      const { c, p } = await oeffne(b, pfad, 'no-preference');
      await p.mouse.move(1100, 300);
      const cdp = await c.newCDPSession(p);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const r = await p.evaluate(async () => {
        scrollTo(0, 0); const t = []; let last = performance.now();
        const max = Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 3);
        await new Promise((ok) => { const step = (now) => { t.push(now - last); last = now; if (scrollY >= max - 2 || t.length > 600) return ok(); scrollBy(0, 14); requestAnimationFrame(step); }; requestAnimationFrame(step); });
        t.shift();
        return { n: t.length, anteil: t.filter((x) => x > 50).length / t.length * 100 };
      });
      melde(r.n > 20 && r.anteil < RUCKEL_GRENZE, `Ruckeln    ${pfad.padEnd(9)} ${r.anteil.toFixed(1)} % Bilder > 50 ms bei CPU x4 (${r.n} Bilder, Grenze ${RUCKEL_GRENZE} %)${r.n > 20 ? '' : ' — zu wenig gemessen'}`);
      await c.close();
    }
    await b.close();
  }
}

if (SELBSTTEST) {
  for (const fall of ['js', 'blur']) {
    verbiegen = fall; rot = 0;
    console.log(`\n── Selbsttest: ${fall === 'js' ? 'leere raum.js' : 'filter:blur auf dem Kegel'}`);
    await lauf();
    const ok = rot > 0;
    console.log(ok ? `✓ erkannt (${rot} rot)` : '✗ Tor blind — blieb gruen');
    if (!ok) { server.close(); process.exit(1); }
  }
  server.close();
  console.log('\n✓ Selbsttest raum-check: beide kaputten Faelle rot');
  process.exit(0);
}
await lauf();
server.close();
console.log(rot ? `\n✗ raum-check: ${rot} Befund(e)` : '\n✓ raum-check: Licht an, Raum antwortet, ruhig steht still, kein Ruckeln.');
process.exit(rot ? 1 : 0);
