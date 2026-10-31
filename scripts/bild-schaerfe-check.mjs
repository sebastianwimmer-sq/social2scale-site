#!/usr/bin/env node
/* bild-schaerfe-check.mjs — wird ein sichtbares Hintergrundbild zu stark vergroessert? (16.10.2026)
 *
 * Sebi 16.10.: „Hintergrundbilder sind so unscharf, wirkt unprofessionell“. Gemessen: am iPhone
 * vergroesserte „cover“ das growth-Bild 3,9-fach (Abschnitt 3× so hoch wie breit). Faktor =
 * angezeigte Bildpunkte (CSS-px × Geraete-Pixeldichte) / echte Pixel, mit der echten background-size.
 * Rot ab MAX_FAKTOR. Aufruf: node scripts/bild-schaerfe-check.mjs [--selbsttest]
 */
import { chromium, webkit, devices } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { readFile } from 'node:fs/promises'; import { resolve, extname } from 'node:path';
const W = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const MAX_FAKTOR = 1.5; // 16.10.2026: Sebi sah den Hero bei ×2,0 noch „verschwommen“; mit den Originalen liegen alle ≤ 1,2
const befunde = [];
// Fixture: 400-px-Bild als cover auf voller Breite (zu klein) und dasselbe Bild auf 200 px (scharf)
const FIX = { '/fix-rot/': '<!doctype html><body style="margin:0"><div style="height:900px;background:url(/assets/workspace.webp) center/cover"></div></body>', '/fix-gruen/': '<!doctype html><body style="margin:0"><div style="width:300px;height:170px;background:url(/assets/growth.webp) center/cover"></div></body>' };
const SEITEN = SELBSTTEST ? Object.keys(FIX) : [/* Startseite seit 30.10. ohne Hintergrundbild (start-studio.css) */ '/preise/', '/onboarding/', '/about/', '/results/', '/for-you/'] /* /gratis/ und /anfrage/ leiten sofort weiter */;
const TYP = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
for (const [name, eng, opt] of [['Desktop 1440 @2x', chromium, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }], ['iPhone 15 Pro @3x', webkit, devices['iPhone 15 Pro']]]) {
  const b = await eng.launch(); const c = await b.newContext(opt);
  await c.route(/closing|start\.social|challenges/, r => r.fulfill({ status: 204 }));
  await c.route('https://social2scale.com/**', async r => { const pn = new URL(r.request().url()).pathname; if (FIX[pn]) return r.fulfill({ body: FIX[pn], contentType: TYP['.html'] }); let f = resolve(W, '.' + pn); if (pn.endsWith('/')) f += '/index.html'; try { r.fulfill({ body: await readFile(f), contentType: TYP[extname(f)] }); } catch { r.fulfill({ status: 404 }); } });
  const p = await c.newPage();
  for (const s of SEITEN) {
    await p.goto('https://social2scale.com' + s, { waitUntil: 'load' }); await p.waitForTimeout(800);
    const r = await p.evaluate(async () => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        for (const pseudo of [null, '::before']) {
          const st = getComputedStyle(el, pseudo); const m = st.backgroundImage.match(/url\("?([^")]+\.(?:avif|webp|jpg|png))"?\)/); if (!m) continue;
          const img = new Image(); img.src = m[1]; await img.decode().catch(() => {});
          if (!img.naturalWidth) continue;
          const box = el.getBoundingClientRect(); if (box.width < 150 || box.height < 150 || getComputedStyle(el).display === 'none') continue;
          // echte background-size der Bildschicht lesen (cover | <breite> auto | ...)
          const oben = (s) => { const out = []; let tiefe = 0, akt = ''; for (const ch of s) { if (ch === '(') tiefe++; if (ch === ')') tiefe--; if (ch === ',' && !tiefe) { out.push(akt); akt = ''; } else akt += ch; } out.push(akt); return out; };
          const urls = oben(st.backgroundImage); const idx = urls.findIndex((u) => u.includes(m[1]));
          const groesse = (oben(st.backgroundSize)[idx] || oben(st.backgroundSize).pop()).trim();
          let sc;
          if (groesse === 'cover') sc = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
          else if (groesse === 'contain') sc = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
          else { const w = groesse.split(' ')[0]; sc = w.endsWith('%') ? box.width * parseFloat(w) / 100 / img.naturalWidth : w.endsWith('px') ? parseFloat(w) / img.naturalWidth : box.height / img.naturalHeight; }
          out.push({ bild: m[1].split('/').pop(), box: Math.round(box.width) + '×' + Math.round(box.height), faktor: +(sc * devicePixelRatio).toFixed(2) });
        }
      }
      return out;
    });
    for (const x of r) { console.log('  ' + name.padEnd(18), s.padEnd(12), x.bild.padEnd(22), x.box.padEnd(10), '×' + x.faktor); if (x.faktor > MAX_FAKTOR) befunde.push(`${name} ${s} ${x.bild}: ${x.faktor}-fach vergrößert (Grenze ${MAX_FAKTOR}) — größeres Bild oder kleinere Fläche`); }
    if (!r.length && !SELBSTTEST && s === '/onboarding/') befunde.push(`${name} ${s}: kein Hintergrundbild gemessen — nicht gemessen ist nicht grün`);
  }
  await b.close();
}
if (SELBSTTEST) {
  const rot = befunde.some((b) => b.includes('/fix-rot/')), gruen = !befunde.some((b) => b.includes('/fix-gruen/'));
  if (rot && gruen) { console.log('✓ Selbsttest bild-schaerfe-check: zu kleines Bild rot, passendes grün.'); process.exit(0); }
  console.error('✗ SELBSTTEST bild-schaerfe-check: ' + JSON.stringify(befunde)); process.exit(1);
}
if (befunde.length) { console.error('\n✗ bild-schaerfe-check: ' + befunde.length + ' Befund(e):\n  ' + befunde.join('\n  ')); process.exit(1); }
console.log('\n✓ bild-schaerfe-check: kein sichtbares Hintergrundbild über ' + MAX_FAKTOR + '-fach vergrößert.');
