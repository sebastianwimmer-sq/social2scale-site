#!/usr/bin/env node
/**
 * Prueft die Bewegungsschicht (bewegung.css / bewegung.js) auf allen sechs Seiten.
 *
 *   node scripts/bewegung-check.mjs              Chromium, WebKit, Chromium mit reduce
 *   node scripts/bewegung-check.mjs --selbsttest  liefert eine LEERE bewegung.css aus —
 *                                                 dann MUSS das Tor rot werden
 *
 * Drei Fehlerklassen, an denen solche Schichten sonst still scheitern (kern.md):
 *  1. Nach dem Durchscrollen ist etwas noch verborgen (Linie ungezeichnet,
 *     Foto zugeblendet, .reveal ohne .on) — unlesbar ist schlimmer als ruhig.
 *  2. Bei prefers-reduced-motion laeuft trotzdem etwas.
 *  3. Die Bewegung passiert gar nicht (Gegenprobe VOR dem Scrollen: weiter
 *     unten muessen Linien noch ungezeichnet und Phasen unter 1 sein).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const { chromium, webkit } = await import('/opt/homebrew/lib/node_modules/playwright/index.mjs');
const WURZEL = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const SEITEN = ['/', '/preise/', '/ablauf/', '/results/', '/for-you/', '/about/'];
const TYPEN = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.mp4': 'video/mp4' };

const server = await new Promise((fertig) => {
  const s = createServer(async (anf, ant) => {
    let pfad = join(WURZEL, decodeURIComponent(anf.url.split('?')[0]));
    if (pfad.endsWith('/')) pfad += 'index.html';
    try {
      let inhalt = await readFile(pfad);
      if (SELBSTTEST && pfad.endsWith('/bewegung.css')) inhalt = Buffer.from('/* leer */');
      if (pfad.endsWith('.html')) inhalt = Buffer.from(inhalt.toString().replace(/;?\s*upgrade-insecure-requests/, ''));
      ant.writeHead(200, { 'Content-Type': TYPEN[extname(pfad)] || 'application/octet-stream' });
      ant.end(inhalt);
    } catch { ant.writeHead(404); ant.end('weg'); }
  });
  s.listen(0, () => fertig(s));
});
const BASIS = `http://localhost:${server.address().port}`;
const ETIKETTEN = '.ix,.pr-rh,.rs-rh,.fw-rh,.ab-rh';
let rot = 0;
const melde = (ok, text) => { if (!ok) rot++; console.log(`  ${ok ? '🟢' : '🔴'} ${text}`); };

async function seite(browser, pfad, motion) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: motion });
  await c.route('**/closing.social2scale.com/**', (r) => r.abort());
  const p = await c.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  await p.goto(BASIS + pfad, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  return { c, p, fehler };
}

// 3. Gegenprobe: bewegt sich ueberhaupt etwas?
{
  const b = await chromium.launch();
  for (const [pfad, was] of [['/about/', 'Linien + Fotos'], ['/ablauf/', 'Phasen']]) {
    const { c, p } = await seite(b, pfad, 'no-preference');
    const r = await p.evaluate((sel) => ({
      linien: [...document.querySelectorAll(sel)].filter((e) => getComputedStyle(e, '::after').transform === 'matrix(0, 0, 0, 1, 0, 0)').length,
      fotos: [...document.querySelectorAll('.ab-pic img')].filter((i) => getComputedStyle(i).clipPath !== 'none').length,
      phasen: [...document.querySelectorAll('.fl-phase')].map((x) => parseFloat(getComputedStyle(x).getPropertyValue('--weg')) || 0),
    }), ETIKETTEN);
    const bewegt = pfad === '/ablauf/' ? r.phasen.some((v) => v < 1) && r.linien > 0 : r.linien > 0 && r.fotos > 0;
    melde(bewegt, `Gegenprobe ${pfad}: ${was} starten verborgen (Linien ${r.linien}, Fotos ${r.fotos}, Phasen ${r.phasen.join('/') || '-'})`);
    await c.close();
  }
  await b.close();
}

// 1. + 2. Nach dem Durchscrollen alles sichtbar; reduce: nichts laeuft
for (const [name, motor, motion] of [['Chromium', chromium, 'no-preference'], ['WebKit', webkit, 'no-preference'], ['Chromium reduce', chromium, 'reduce']]) {
  const b = await motor.launch();
  for (const pfad of SEITEN) {
    const { c, p, fehler } = await seite(b, pfad, motion);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 450) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(60); }
    await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'
      || a.effect.getComputedTiming().iterations === Infinity), null, { timeout: 15000 }).catch(() => {});
    const r = await p.evaluate((sel) => ({
      nichtOn: document.querySelectorAll('.reveal:not(.on)').length,
      linien: [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => getComputedStyle(e, '::after'))
        .filter((cs) => cs.content !== 'none' && cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)').length,
      fotos: [...document.querySelectorAll('.ab-pic img')].filter((i) => { const cp = getComputedStyle(i).clipPath; return cp !== 'none' && !/inset\(0(px)?\)/.test(cp); }).length,
      laufend: document.getAnimations().filter((a) => a.playState === 'running').length,
    }), ETIKETTEN);
    const probleme = [];
    if (r.nichtOn) probleme.push(`${r.nichtOn} .reveal nicht an`);
    if (r.linien) probleme.push(`${r.linien} Linien ungezeichnet`);
    if (r.fotos) probleme.push(`${r.fotos} Fotos zu`);
    if (motion === 'reduce' && r.laufend) probleme.push(`${r.laufend} Animationen laufen trotz reduce`);
    if (fehler.length) probleme.push(`Skriptfehler: ${fehler[0]}`);
    melde(!probleme.length, `${name.padEnd(15)} ${pfad.padEnd(10)} ${probleme.join(' · ') || 'alles sichtbar'}`);
    await c.close();
  }
  await b.close();
}
server.close();

if (SELBSTTEST) {
  console.log(rot ? `\n✓ Selbsttest: leere bewegung.css wurde erkannt (${rot} rot)` : '\n✗ Selbsttest: Tor blind — leere bewegung.css blieb gruen');
  process.exit(rot ? 0 : 1);
}
console.log(rot ? `\n✗ bewegung-check: ${rot} Befund(e)` : '\n✓ bewegung-check: Bewegung greift, nach dem Scrollen ist alles sichtbar, reduce steht still.');
process.exit(rot ? 1 : 0);
