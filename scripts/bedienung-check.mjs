#!/usr/bin/env node
/* bedienung-check.mjs — fuehlen sich die Knoepfe richtig an? (16.10.2026)
 *
 * Gemessen wird das Verhalten im Browser, nicht der Quelltext (die Knopf-Regeln stehen
 * in jeder Seite kopiert, bedienung.css ueberschreibt sie). Je sichtbarem Knopf:
 *   Maus   Hover aendert Licht/Verlauf · keine Keyframe-Animation · kein Sprung · Druck verkleinert
 *   Tasten :focus-visible mit >= 2 px durchgezogenem Rand
 *   Touch  nach dem Antippen bleibt kein Hover-Zustand haengen
 * Regeln + Quellen: kit-build/motion-loop/evidenz.json (hover-nur-bei-maus u. a.).
 *
 * Aufruf: node scripts/bedienung-check.mjs [--selbsttest]
 *   --selbsttest: Fixture mit den alten Regeln MUSS rot, die mit bedienung.css gruen werden.
 */
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const { chromium } = await import('/opt/homebrew/lib/node_modules/playwright/index.mjs');
const WURZEL = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const SEITEN = ['/', '/preise/', '/about/', '/wissen/', '/wissen/was-kostet-social-media-betreuung/'];
const KNOPF = '.btn-primary, .nav-cta, .w-btn, .btn-ghost';
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

// Fixtures: dieselben Knoepfe, einmal mit den alten Regeln (16.10. live), einmal mit bedienung.css.
const ALT = `.btn{position:relative;display:inline-block;padding:17px 32px;overflow:hidden;transition:transform .25s,box-shadow .25s}
.btn:hover{transform:translateY(-3px)}
.btn-primary{background:linear-gradient(135deg,#1FC998,#00B888 52%,#1FA6E0);color:#04130D}
.btn-primary::after{content:"";position:absolute;top:0;left:0;width:45%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);transform:translateX(-150%)}
.btn-primary:hover::after{animation:glint .85s forwards}
@keyframes glint{0%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
.btn:focus{outline:none}`;
const fixture = async (sauber) => `<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width"><style>${ALT}</style>${sauber ? `<style>${await readFile(resolve(WURZEL, 'bedienung.css'), 'utf8')}</style>` : ''}</head><body style="padding:80px;background:#03080D"><a class="btn btn-primary" href="#x">Kostenlos starten →</a></body></html>`;

async function routen(ctx, fixtures) {
  await ctx.route(/closing\.social2scale\.com|start\.social2scale\.com|challenges\.cloudflare\.com/, (r) => r.fulfill({ status: 204 }));
  await ctx.route('https://social2scale.com/**', async (r) => {
    const pfad = new URL(r.request().url()).pathname;
    if (fixtures && fixtures[pfad]) return r.fulfill({ status: 200, contentType: TYPEN['.html'], body: fixtures[pfad] });
    let f = resolve(WURZEL, '.' + decodeURIComponent(pfad)); if (pfad.endsWith('/')) f = resolve(f, 'index.html');
    if (f !== WURZEL && !f.startsWith(WURZEL + sep)) return r.fulfill({ status: 403 });
    try { r.fulfill({ status: 200, contentType: TYPEN[extname(f)] || 'application/octet-stream', body: await readFile(f) }); } catch { r.fulfill({ status: 404 }); }
  });
}

const ZUSTAND = (el) => { const s = getComputedStyle(el); return { schatten: s.boxShadow, verlauf: s.backgroundPosition, rand: s.borderColor, grund: s.backgroundColor, transform: s.transform }; };
const ruhe = (p) => p.waitForTimeout(450);

async function maus(browser, seiten, fixtures, befunde) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await routen(ctx, fixtures);
  const p = await ctx.newPage();
  for (const s of seiten) {
    await p.goto('https://social2scale.com' + s, { waitUntil: 'load' });
    // Druecken misst mit echtem Maus-Klick — das Linkziel wird fuer die Messung abgefangen.
    await p.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), true));
    // Sanftes Scrollen der Seite liefe nach dem Hinscrollen weiter und zoege den Knopf unter der Maus weg (16.10.).
    await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    const n = await p.locator(KNOPF).count();
    let gemessen = 0;
    for (let i = 0; i < n; i++) {
      const k = p.locator(KNOPF).nth(i);
      if (!(await k.isVisible())) continue;
      await k.scrollIntoViewIfNeeded(); await p.mouse.move(0, 0); await ruhe(p);
      const name = s + ' ' + ((await k.textContent()) || '').trim().slice(0, 24);
      const vorher = await k.evaluate(ZUSTAND);
      await k.hover(); await p.waitForTimeout(60);
      const oben = await k.evaluate((el) => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !e || el.contains(e) ? '' : (e.id || e.className || e.tagName); });
      if (oben) { befunde.push(`${s} ${((await k.textContent()) || '').trim().slice(0, 24)}: Knopf liegt unter „${String(oben).slice(0, 40)}“ — Klick und Hover treffen ihn nicht`); continue; }
      const laeuft = await k.evaluate((el) => document.getAnimations().filter((a) => a.effect && a.effect.target === el && a instanceof CSSAnimation).map((a) => (a.effect.pseudoElement || '') + a.animationName));
      await ruhe(p);
      const dabei = await k.evaluate(ZUSTAND);
      gemessen++;
      if (laeuft.length) befunde.push(`${name}: Keyframe-Animation beim Hover (${laeuft.join(', ')}) — springt beim Wegfahren`);
      if (/matrix\([^)]*,\s*-?[1-9][\d.]*\)$/.test(dabei.transform)) befunde.push(`${name}: Hover verschiebt den Knopf (${dabei.transform})`);
      if (['schatten', 'verlauf', 'rand', 'grund'].every((x) => vorher[x] === dabei[x])) befunde.push(`${name}: Hover zeigt keine Änderung (Verlauf ${vorher.verlauf}, Licht ${vorher.schatten.slice(0, 32)}…, Element ${await k.evaluate((el) => el.id || el.closest('[id]')?.id || el.className)}, :hover ${await k.evaluate((el) => el.matches(':hover'))}, danach ${dabei.verlauf} ${await k.evaluate((el) => getComputedStyle(el).backgroundPosition)})`);
      const box = await k.boundingBox();
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(120);
      const druck = await k.evaluate((el) => { const m = getComputedStyle(el).transform; return m === 'none' ? 1 : Number(m.slice(7).split(',')[0]); });
      await p.mouse.up(); await p.mouse.move(0, 0);
      if (!(druck < 0.995)) befunde.push(`${name}: Drücken zeigt keine Rückmeldung (Skalierung ${druck})`);
      await p.keyboard.press('Shift'); await k.focus();
      const ring = await k.evaluate((el) => { const s = getComputedStyle(el); return { stil: s.outlineStyle, breite: parseFloat(s.outlineWidth) || 0 }; });
      await k.blur();
      if (ring.stil === 'none' || ring.breite < 2) befunde.push(`${name}: Tastatur-Fokus ohne 2-px-Rand (${ring.stil} ${ring.breite}px)`);
    }
    if (!gemessen) befunde.push(`${s}: kein Knopf gemessen — nicht gemessen ist nicht grün`);
    else console.log(`  Maus  ${s.padEnd(44)} ${gemessen} Knöpfe`);
  }
  await ctx.close();
}

async function touch(browser, seiten, fixtures, befunde) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await routen(ctx, fixtures);
  const p = await ctx.newPage();
  for (const s of seiten) {
    await p.goto('https://social2scale.com' + s, { waitUntil: 'load' });
    // Antippen ohne Seitenwechsel: das Linkziel wird fuer die Messung abgefangen.
    await p.evaluate(() => document.addEventListener('click', (e) => e.preventDefault(), true));
    const k = p.locator('.btn-primary:visible').first();
    if (!(await k.count())) continue;
    await k.scrollIntoViewIfNeeded(); await ruhe(p);
    const vorher = await k.evaluate(ZUSTAND);
    await k.tap(); await ruhe(p);
    const danach = await k.evaluate(ZUSTAND);
    const haengt = ['schatten', 'verlauf', 'transform'].filter((x) => vorher[x] !== danach[x]);
    if (haengt.length) befunde.push(`${s} (Touch): nach dem Antippen bleibt der Hover hängen (${haengt.join(', ')})`);
    console.log(`  Touch ${s.padEnd(44)} ${haengt.length ? 'hängt' : 'ok'}`);
  }
  await ctx.close();
}

const browser = await chromium.launch();
if (SELBSTTEST) {
  const kaputt = [], sauber = [];
  await maus(browser, ['/fixture/'], { '/fixture/': await fixture(false) }, kaputt);
  await touch(browser, ['/fixture/'], { '/fixture/': await fixture(false) }, kaputt);
  await maus(browser, ['/fixture/'], { '/fixture/': await fixture(true) }, sauber);
  await touch(browser, ['/fixture/'], { '/fixture/': await fixture(true) }, sauber);
  await browser.close();
  const erwartet = ['Keyframe-Animation', 'verschiebt', 'Drücken', 'Tastatur-Fokus', 'hängen'];
  const fehlt = erwartet.filter((w) => !kaputt.some((b) => b.includes(w)));
  if (fehlt.length || sauber.length) {
    console.error('✗ SELBSTTEST bedienung-check:' + (fehlt.length ? ' alte Regeln nicht erkannt: ' + fehlt.join(', ') : '') + (sauber.length ? ' sauber trotzdem rot: ' + sauber.join(' | ') : ''));
    process.exit(1);
  }
  console.log(`✓ Selbsttest bedienung-check: alte Regeln ${kaputt.length}× rot (${erwartet.join(', ')}), bedienung.css grün.`);
  process.exit(0);
}
const befunde = [];
await maus(browser, SEITEN, null, befunde);
await touch(browser, SEITEN, null, befunde);
await browser.close();
if (befunde.length) { console.error(`\n✗ bedienung-check: ${befunde.length} Befund(e):\n  ` + befunde.join('\n  ')); process.exit(1); }
console.log('\n✓ bedienung-check: Hover nur mit Maus, ohne Sprung und Glanz; Druck, Fokus und Touch sauber.');
