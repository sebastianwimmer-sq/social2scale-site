#!/usr/bin/env node
/**
 * Prüft die Startseite im Lichtstudio (30.10.2026, start-studio.css/js), DE und EN.
 *
 *   node scripts/start-check.mjs               alle Prüfungen
 *   node scripts/start-check.mjs --selbsttest  vier kaputte Fälle MÜSSEN rot werden:
 *                                              scroll-gebundene Bewegung, zu breit, schwacher Kontrast, Layout-Sprung
 *
 * Gemessen wird, was Sebi am 28.10. am Handy störte: alles bewegt sich gleichzeitig, die Seite baut sich
 * in Stufen auf, sie ist zu lang. Also: nach dem Scrollen steht alles still und nichts hängt am Scrollen,
 * beim Laden springt nichts, höchstens 7 Bildschirme am iPhone, Knopf über dem Falz, kein Querscrollen,
 * Schrift am Pixel lesbar, ohne Skript ist alles da.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';

const { chromium, webkit, devices } = await import('/opt/homebrew/lib/node_modules/playwright/index.mjs');
const WURZEL = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const SEITEN = ['/', '/en/'];
const MAX_BILDSCHIRME = 7;
const MAX_CLS = 0.02;
const TYPEN = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif' };

// Kaputte Fälle für den Selbsttest, je genau ein Fehler
const VERBIEGUNGEN = {
  scroll: { js: "\naddEventListener('scroll',function(){var a=document.querySelector('.st-abzug');if(a)a.style.transform='translateY('+(scrollY*0.2)+'px)';},{passive:true});" },
  breite: { css: '\n.st-tisch{margin-right:-220px !important}.st-set{overflow:visible !important}.st{overflow:visible !important}' },
  kontrast: { css: '\n.st-1 .st-unter{color:#3A4440 !important}' },
  sprung: { js: "\nsetTimeout(function(){var h=document.querySelector('.st-1 .st-innen');if(h)h.style.marginTop='160px';},700);" },
};
let verbiegen = null;

const server = await new Promise((fertig) => {
  const s = createServer(async (anf, ant) => {
    let pfad = resolve(WURZEL, '.' + decodeURIComponent(anf.url.split('?')[0]));
    if (pfad !== WURZEL && !pfad.startsWith(WURZEL + sep)) { ant.writeHead(403); return ant.end('nein'); }
    if (anf.url.split('?')[0].endsWith('/')) pfad = join(pfad, 'index.html');
    try {
      let inhalt = await readFile(pfad);
      const v = verbiegen && VERBIEGUNGEN[verbiegen];
      if (v?.css && pfad.endsWith(sep + 'start-studio.css')) inhalt = Buffer.from(inhalt.toString() + v.css);
      if (v?.js && pfad.endsWith(sep + 'start-studio.js')) inhalt = Buffer.from(inhalt.toString() + v.js);
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

async function durchscrollen(p) {
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 250) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60); }
}

// Lage aller Elemente in <main> relativ zur Seite: ändert sie sich beim Scrollen, hängt Bewegung am Scrollen
const lagen = (p) => p.evaluate(() => [...document.querySelectorAll('main *')].map((e) => {
  const r = e.getBoundingClientRect(); if (!r.width && !r.height) return 'leer'; return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)].join(',');
}));

async function ruhe(br, seite) {
  const c = await br.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await c.newPage();
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  await p.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await p.goto(BASIS + seite, { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  const cls = await p.evaluate(() => window.__cls);
  melde(cls <= MAX_CLS, `Laden     ${seite.padEnd(5)} Layout-Sprung ${cls.toFixed(3)} (Grenze ${MAX_CLS})`);
  await durchscrollen(p);
  // Endliche Bewegung darf auslaufen (Lichtstreif über dem betonten Wort 2,4 s), danach muss alles stehen
  await p.waitForFunction(() => !document.getAnimations().some((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity), null, { timeout: 4000 }).catch(() => {});
  const laufend = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length);
  const endlos = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity).length);
  melde(laufend === 0 && endlos === 0, `Still     ${seite.padEnd(5)} nach dem Scrollen ${laufend} laufende, ${endlos} endlose Animationen`);
  await p.evaluate(() => scrollTo(0, 600)); await p.waitForTimeout(400);
  const vorher = await lagen(p);
  await p.evaluate(() => scrollTo(0, 1400)); await p.waitForTimeout(400);
  const nachher = await lagen(p);
  const bewegt = vorher.filter((l, i) => l !== nachher[i]).length;
  melde(bewegt === 0, `Scroll    ${seite.padEnd(5)} ${bewegt} Elemente wandern mit dem Scrollen`);
  const an = await p.evaluate(() => [...document.querySelectorAll('[data-st-set]')].every((s) => s.classList.contains('an')));
  melde(an, `Licht     ${seite.padEnd(5)} ${an ? 'jedes Set hat sein Licht an' : 'ein Set bleibt dunkel'}`);
  melde(!fehler.length, `Skript    ${seite.padEnd(5)} ${fehler[0] || 'keine Fehler'}`);
  await c.close();
}

async function handy(wk, seite) {
  for (const geraet of ['iPhone 15 Pro', 'iPhone SE']) {
    const c = await wk.newContext({ ...devices[geraet] });
    const p = await c.newPage();
    await p.goto(BASIS + seite, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    const m = await p.evaluate(() => {
      const k = document.getElementById('cta').getBoundingClientRect();
      return { breite: document.documentElement.scrollWidth, innen: innerWidth, hoch: innerHeight, knopf: k.bottom, main: document.querySelector('main').offsetHeight };
    });
    const schirme = m.main / m.hoch;
    melde(m.breite <= m.innen, `Breite    ${seite.padEnd(5)} ${geraet}: ${m.breite} px bei ${m.innen} px`);
    melde(m.knopf <= m.hoch, `Falz      ${seite.padEnd(5)} ${geraet}: Knopf endet bei ${Math.round(m.knopf)} von ${m.hoch} px`);
    if (geraet === 'iPhone 15 Pro') melde(schirme <= MAX_BILDSCHIRME, `Länge     ${seite.padEnd(5)} ${schirme.toFixed(1)} Bildschirme (Grenze ${MAX_BILDSCHIRME})`);
    await c.close();
  }
}

// Kontrast am Pixel: Grund ohne Schrift fotografieren, gegen die gerechnete Schriftfarbe halten
async function kontrast(br, seite) {
  const c = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await c.newPage();
  await p.goto(BASIS + seite, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  const schwach = [];
  let gemessen = 0;
  for (let y = 0; y < h; y += 700) {
    await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(150);
    const ziele = await p.evaluate(() => {
      const raus = [];
      for (const e of document.querySelectorAll('main :is(h1,h2,h3,p,summary,b,small,a,span.st-buchst,span.st-marke)')) {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.top < 0 || r.bottom > innerHeight || !e.textContent.trim()) continue;
        if (e.closest('[aria-hidden="true"],[hidden]')) continue;
        // nur, was an der Messstelle wirklich zu sehen ist (nicht hinter dem Rand des Leuchttischs, nicht zugeklappt)
        const mx = r.left + Math.min(6, r.width / 3), my = r.top + r.height / 2;
        const oben = document.elementFromPoint(mx, my);
        if (!oben || !(oben === e || e.contains(oben))) continue;
        const s = getComputedStyle(e);
        if (s.webkitTextFillColor && s.webkitTextFillColor.includes('0)')) continue;  // Verlaufsschrift
        const fs = parseFloat(s.fontSize), fett = parseInt(s.fontWeight, 10) >= 700;
        raus.push({ x: Math.round(r.left + Math.min(6, r.width / 3)), y: Math.round(r.top + r.height / 2), farbe: s.color, gross: fs >= 24 || (fs >= 18.66 && fett), text: e.textContent.trim().slice(0, 40) });
      }
      return raus;
    });
    await p.addStyleTag({ content: 'main *{color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important}' });
    const bild = await p.screenshot();
    await p.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.startsWith('main *{color:transparent')) s.remove(); }));
    const grund = await p.evaluate(async ({ png, punkte }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
      const cv = new OffscreenCanvas(img.width, img.height); const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
      return punkte.map(({ x, y }) => [...cx.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 1, 1).data]);
    }, { png: bild.toString('base64'), punkte: ziele });
    ziele.forEach((z, i) => {
      const f = (z.farbe.match(/[\d.]+/g) || []).map(Number);
      const text = z.farbe.startsWith('color(srgb') ? [f[0] * 255, f[1] * 255, f[2] * 255] : f.slice(0, 3);
      const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, k) => s + v * [0.2126, 0.7152, 0.0722][k], 0);
      const a = lum(text), b = lum(grund[i]);
      const k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      gemessen++;
      if (k < (z.gross ? 3 : 4.5)) schwach.push(`„${z.text}“ ${k.toFixed(1)}:1`);
    });
  }
  melde(gemessen > 20 && !schwach.length, `Kontrast  ${seite.padEnd(5)} ${gemessen} Stellen gemessen${schwach.length ? ', zu schwach: ' + [...new Set(schwach)].slice(0, 4).join(' · ') : ', alle lesbar'}`);
  await c.close();
}

async function ohneSkript(br, seite) {
  const c = await br.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const p = await c.newPage();
  await p.goto(BASIS + seite, { waitUntil: 'load' });
  const m = await p.evaluate(() => ({
    karten: [...document.querySelectorAll('[data-st-karte]')].filter((k) => k.getBoundingClientRect().height > 0).length,
    knopf: !!document.getElementById('cta-bottom')?.getBoundingClientRect().height,
  }));
  melde(m.karten === 4 && m.knopf, `Ohne JS   ${seite.padEnd(5)} ${m.karten} von 4 Phasen sichtbar, Abschluss-Knopf ${m.knopf ? 'da' : 'fehlt'}`);
  await c.close();
}

async function lauf(nur) {
  const cr = await chromium.launch();
  const wk = await webkit.launch();
  const seiten = nur ? ['/'] : SEITEN;
  for (const s of seiten) {
    await ruhe(cr, s);
    await handy(wk, s);
    await kontrast(cr, s);
    if (!nur) await ohneSkript(cr, s);
  }
  await cr.close(); await wk.close();
}

if (SELBSTTEST) {
  const erwartet = { scroll: 'Scroll', breite: 'Breite', kontrast: 'Kontrast', sprung: 'Laden' };
  let blind = 0;
  for (const fall of Object.keys(VERBIEGUNGEN)) {
    verbiegen = fall; rot = 0;
    console.log(`\n── Selbsttest: ${fall}`);
    const log = console.log; const zeilen = [];
    console.log = (z) => { zeilen.push(z); log(z); };
    await lauf(true);
    console.log = log;
    const getroffen = zeilen.some((z) => z.includes('🔴') && z.includes(erwartet[fall]));
    console.log(getroffen ? `✓ erkannt (${erwartet[fall]} rot)` : `✗ Tor blind für ${fall}`);
    if (!getroffen) blind++;
  }
  server.close();
  console.log(blind ? '\n✗ start-check --selbsttest' : '\n✓ start-check --selbsttest: Tor sieht alle vier Fehler');
  process.exit(blind ? 1 : 0);
}
await lauf(false);
server.close();
console.log(rot ? `\n✗ start-check: ${rot} Befund(e)` : '\n✓ start-check: ruhig, ohne Sprung, kurz genug, lesbar, ohne Skript vollständig');
process.exit(rot ? 1 : 0);
