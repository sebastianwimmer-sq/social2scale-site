#!/usr/bin/env node
/* uebergang-check.mjs — laeuft der Weg zur Anfrage so, wie uebergang.js ihn plant?
 *
 * Ein Seitenuebergang, der ausfaellt, meldet sich nirgends: die Seite laedt
 * dann einfach ohne. Gemessen wird deshalb IN der neuen Seite, beim Aufdecken:
 * welche Gruppen einen ALTEN Schnappschuss haben — nur dann kam das Element
 * wirklich von der vorigen Seite.
 *
 * Aufruf:  node scripts/uebergang-check.mjs [--selbsttest]
 *   --selbsttest liefert ein leeres uebergang.js aus — das Tor MUSS rot werden.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const { chromium } = await import('/opt/homebrew/lib/node_modules/playwright/index.mjs');
const WURZEL = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const TYPEN = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.mp4': 'video/mp4' };

const server = await new Promise((fertig) => {
  const s = createServer(async (anf, ant) => {
    let pfad = join(WURZEL, decodeURIComponent(anf.url.split('?')[0]));
    if (pfad.endsWith('/')) pfad += 'index.html';
    try {
      let inhalt = await readFile(pfad);
      if (SELBSTTEST && pfad.endsWith('/uebergang.js')) inhalt = Buffer.from('/* leer */');
      /* WebKit hebt http://localhost sonst auf https und laedt kein CSS (kern.md). */
      if (pfad.endsWith('.html')) inhalt = Buffer.from(inhalt.toString().replace(/;?\s*upgrade-insecure-requests/, ''));
      ant.writeHead(200, { 'Content-Type': TYPEN[extname(pfad)] || 'application/octet-stream' });
      ant.end(inhalt);
    } catch { ant.writeHead(404); ant.end('weg'); }
  });
  s.listen(0, () => fertig(s));
});
const BASIS = `http://localhost:${server.address().port}`;

const SONDE = `addEventListener('pagereveal', (e) => {
  window.__vt = { lief: !!e.viewTransition, alt: null, fertig: false, deckel: null };
  if (!e.viewTransition) { window.__vt.fertig = true; return; }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__vt.alt = document.getAnimations().map((a) => a.effect && a.effect.pseudoElement)
      .filter((p) => p && p.startsWith('::view-transition-old('))
      .map((p) => p.slice(22, -1));
    /* Liegt eine bildschirmfuellende feste Ebene ueber der Seite? (Bis 29.09.2026
       deckte eine Ladeblende jeden Wechsel mindestens 0,9 s zu — das Tor sah die
       Gruppen laufen und meldete gruen, obwohl man nichts davon sah.) */
    window.__vt.deckel = [...document.querySelectorAll('body *')].filter((el) => {
      const s = getComputedStyle(el); if (s.position !== 'fixed' || s.visibility === 'hidden' || +s.opacity < 0.5 || s.display === 'none') return false;
      const r = el.getBoundingClientRect(); return r.width * r.height > innerWidth * innerHeight * 0.8;
    }).map((el) => el.id || el.className || el.tagName).slice(0, 3);
    window.__vt.fertig = true;
  }));
});`;

const browser = await chromium.launch();
const befunde = [];
async function schritt(name, start, klick, erwartet, verboten = []) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(SONDE);
  const s = await ctx.newPage();
  await s.route('**/closing.social2scale.com/**', (r) => r.abort());
  await s.goto(BASIS + start, { waitUntil: 'load' });
  await s.evaluate(() => { window.__vt = null; });
  const el = s.locator(klick).first();
  await el.scrollIntoViewIfNeeded(); await s.waitForTimeout(700);
  await Promise.all([s.waitForURL('**/anfrage/**').catch(() => s.waitForLoadState('load')), el.click()]);
  await s.waitForFunction(() => window.__vt && window.__vt.fertig, null, { timeout: 5000 }).catch(() => {});
  const vt = await s.evaluate(() => window.__vt || {});
  await ctx.close();
  const alt = vt.alt || [];
  console.log(`  ${name.padEnd(36)} ${vt.lief ? 'Übergang ✓' : 'Übergang ✗'} · kam mit: ${alt.filter((n) => n !== 'root').join(', ') || '–'}`);
  if (!vt.lief) befunde.push(`${name}: kein Uebergang`);
  if ((vt.deckel || []).length) befunde.push(`${name}: feste Ebene deckt den Wechsel zu (${vt.deckel.join(', ')})`);
  for (const n of erwartet) if (!alt.includes(n)) befunde.push(`${name}: ${n} kommt nicht von der vorigen Seite`);
  for (const n of verboten) if (alt.includes(n)) befunde.push(`${name}: ${n} haette nicht wandern duerfen`);
}

await schritt('Abschluss-Knopf -> Anfrage', '/', '#cta-bottom', ['anfrage-karte', 'anfrage-titel', 'marke']);
await schritt('Nav-Knopf -> Anfrage', '/preise/', '#cta-top', ['anfrage-karte', 'marke'], ['anfrage-titel']);
/* Die Kopfleiste selbst steht mit animation:none still — ohne Animation sieht
   die Sonde sie nicht. Gemessen wird das Logo, das in ihr sitzt. */
await schritt('Startseite -> Preise (Logo bleibt)', '/', 'header.bar a[href="/preise/"]', ['marke'], ['anfrage-karte', 'anfrage-titel']);

await browser.close();
server.close();

if (SELBSTTEST) {
  if (befunde.length) { console.log(`\n✓ Selbsttest: ohne uebergang.js schlaegt das Tor an (${befunde.length} Befunde).`); process.exit(0); }
  console.error('\n✗ SELBSTTEST: ohne uebergang.js blieb das Tor gruen.'); process.exit(1);
}
if (befunde.length) { console.error(`\n✗ uebergang-check: ${befunde.length} Befund(e):`); befunde.forEach((b) => console.error('    ' + b)); process.exit(1); }
console.log('\n✓ uebergang-check: Knopf wird Karte, Satz wandert mit, Kopf bleibt stehen.');
