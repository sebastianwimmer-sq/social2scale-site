#!/usr/bin/env node
/* kollision-check.mjs — liegt Text auf Text, oder ein Knopf über fremdem Text? (03.11.2026)
 *
 * 03.11.: Auf /danke/studio/ lag der Hinweis „Gutschrift dauert …“ am Handy unter „Bewegung
 * anhalten“, auf /en/ zwei Halte-Knöpfe übereinander (hero-bewegung.js nur in DE entfernt).
 * Kein Tor hat es gesehen, weil jedes nur seine eigene Fläche misst.
 *
 * Gemessen nach Durchscrollen und beendeten Animationen: Zeilen-Boxen aller sichtbaren Texte
 * gegeneinander, dazu die Box jedes Knopfs/Links gegen fremden Text. Ein Knopf zählt nur, wenn
 * ein Tipp mitten in die Überlappung ihn auch trifft (ein Inline-<a> um ein Block-Bild meldet
 * eine zu große Box). Feste/klebende Ebenen und Text in geschlossenen <details> sind ausgenommen
 * (Firefox liefert dafür Boxen, sichtbar ist nichts).
 *
 * Aufruf: node scripts/kollision-check.mjs [--selbsttest]   (KOLLISION=schnell: 2 statt 4 Breiten)
 */
import { webkit } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { readFile, readdir } from 'node:fs/promises'; import { resolve, extname, sep } from 'node:path';
const W = resolve(import.meta.dirname, '..');
const SELBSTTEST = process.argv.includes('--selbsttest');
const BREITEN = process.env.KOLLISION === 'schnell' ? [320, 1440] : [320, 768, 1024, 1440];
const TYP = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };

// Fixtures: Knopf über Text und Text auf Text (rot), dieselben Teile mit Abstand und ein
// geschlossenes <details> mit langem Text unter der Zusammenfassung (grün).
const KOPF = '<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;font:16px/1.4 sans-serif;padding:40px 16px">';
const FIX = {
  '/fix-rot/': KOPF + '<div style="position:relative;height:120px"><p style="margin:0">Gutschrift dauert in der Regel nur Sekunden.</p><button style="position:absolute;left:0;top:4px;height:44px">Bewegung anhalten</button></div><p style="margin:0">Erste Zeile mit Text</p><p style="margin:-18px 0 0">Zweite Zeile darüber</p>',
  '/fix-haengt/': KOPF + '<p>Text</p><img src="/haengt-fuer-immer.png" alt="">',
  '/fix-gruen/': KOPF + '<p style="margin:0">Gutschrift dauert in der Regel nur Sekunden.</p><button style="height:44px;margin-top:16px">Bewegung anhalten</button><details><summary>Was wir dabei machen</summary><p>Anfragen weiterleiten</p></details><p>Alle Preise inklusive Umsatzsteuer.</p>',
};

async function seiten() {
  const out = [];
  const gehe = async (dir, pfad) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || /^(\.|node_modules|free-content|scripts|tests?|docs|assets|_)/.test(e.name)) continue;
      const html = await readFile(resolve(dir, e.name, 'index.html'), 'utf8').catch(() => null);
      if (html && !/http-equiv="refresh"/.test(html)) out.push(pfad + e.name + '/'); // Weiterleitungen sieht niemand
      await gehe(resolve(dir, e.name), pfad + e.name + '/');
    }
  };
  await gehe(W, '/');
  return ['/', ...out.sort()];
}

function messen() {
  const sichtbar = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } return true; };
  const fest = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) if (['fixed', 'sticky'].includes(getComputedStyle(a).position)) return true; return false; };
  const zeilen = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    const s = t.textContent.trim(); if (s.length < 2) continue;
    const el = t.parentElement;
    if (el.closest('[aria-hidden="true"],noscript,.sticky-cta,script,style,.skip,[hidden]')) continue;
    const zu = el.closest('details:not([open])'); if (zu && !el.closest('summary')) continue;
    if (!sichtbar(el) || fest(el)) continue;
    const rg = document.createRange(); rg.selectNodeContents(t);
    for (const q of rg.getClientRects()) if (q.width > 2 && q.height > 4) zeilen.push({ x: q.left, y: q.top + scrollY, r: q.right, b: q.bottom + scrollY, t: s.slice(0, 32), el });
  }
  const out = [];
  for (let i = 0; i < zeilen.length; i++) for (let j = i + 1; j < zeilen.length; j++) {
    const A = zeilen[i], B = zeilen[j];
    if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const ox = Math.min(A.r, B.r) - Math.max(A.x, B.x), oy = Math.min(A.b, B.b) - Math.max(A.y, B.y);
    if (ox > 3 && oy > Math.min(A.b - A.y, B.b - B.y) * 0.35) out.push(`„${A.t}“ liegt auf „${B.t}“ (y ${Math.round(A.y)})`);
  }
  for (const k of document.querySelectorAll('a,button')) {
    const kb = k.getBoundingClientRect(); if (kb.width < 2 || kb.height < 2) continue;
    if (k.closest('[aria-hidden="true"],.sticky-cta,[hidden]') || !sichtbar(k) || fest(k)) continue;
    const y0 = kb.top + scrollY, y1 = kb.bottom + scrollY;
    for (const Z of zeilen) {
      if (k.contains(Z.el) || Z.el.contains(k)) continue;
      const ox = Math.min(kb.right, Z.r) - Math.max(kb.left, Z.x), oy = Math.min(y1, Z.b) - Math.max(y0, Z.y);
      if (ox <= 3 || oy <= (Z.b - Z.y) * 0.35) continue;
      const mx = (Math.max(kb.left, Z.x) + Math.min(kb.right, Z.r)) / 2, my = (Math.max(y0, Z.y) + Math.min(y1, Z.b)) / 2 - scrollY;
      const h = my >= 0 && my <= innerHeight ? document.elementFromPoint(mx, my) : k;
      if (h && (h === k || k.contains(h))) out.push(`Knopf „${(k.textContent || k.getAttribute('aria-label') || '').trim().slice(0, 24)}“ liegt über „${Z.t}“ (y ${Math.round(Z.y)})`);
    }
  }
  return [...new Set(out)].slice(0, 6);
}

const LADEN_MS = Number(process.env.KOLLISION_LADEN_MS) || (SELBSTTEST ? 2000 : 30000);
const liste = SELBSTTEST ? Object.keys(FIX) : await seiten();
const befunde = [];
const b = await webkit.launch();
for (const breite of BREITEN) {
  const handy = breite < 700;
  const c = await b.newContext({ viewport: { width: breite, height: handy ? 568 : 900 }, isMobile: handy, hasTouch: handy });
  await c.route(/closing|start\.social|challenges/, (r) => r.fulfill({ status: 204 }));
  // Der Kartenzähler kommt im Tor nie aus dem Netz (12./14.11.: echte Anfrage an mein.social2scale.com, Ergebnis hing
  // am Live-Stand). Feste Antwort mit freigegebener Karte: so wird die Zeile mitgemessen.
  await c.route(/mein\.social2scale\.com\/api\/spenden-zaehler/, (r) => r.fulfill({ contentType: TYP['.json'], headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ success: true, data: { betrag_eur: 10, karten: 2, empfaenger: 'ein Sorgentelefon für Kinder und Jugendliche', stand: '2026-11-14' } }) }));
  await c.route('https://social2scale.com/**', async (r) => {
    const pn = decodeURIComponent(new URL(r.request().url()).pathname);
    if (FIX[pn]) return r.fulfill({ body: FIX[pn], contentType: TYP['.html'] });
    if (pn === '/haengt-fuer-immer.png') return; // Fixture: Anfrage bleibt offen
    let f = resolve(W, '.' + pn); if (pn.endsWith('/')) f += '/index.html';
    if (!f.startsWith(W + sep)) return r.fulfill({ status: 403 });
    try { r.fulfill({ body: await readFile(f), contentType: TYP[extname(f)] || 'application/octet-stream' }); } catch { r.fulfill({ status: 404 }); }
  });
  for (const s of liste) {
    const p = await c.newPage();
    // Hängt das Laden (12./14.11. nachts: /en/pricing/ 30 s, tagsüber nie nachstellbar), einmal neu versuchen. Hängt es
    // wieder, ist das ein roter Befund mit den offenen Anfragen statt eines Absturzes ohne Grund.
    const offen = new Set();
    p.on('request', (q) => offen.add(q.url())); p.on('requestfinished', (q) => offen.delete(q.url())); p.on('requestfailed', (q) => offen.delete(q.url()));
    let geladen = false;
    for (let versuch = 0; versuch < 2 && !geladen; versuch++) {
      geladen = await p.goto('https://social2scale.com' + s, { waitUntil: 'load', timeout: LADEN_MS }).then(() => true, (e) => { if (!/Timeout/.test(e.message)) throw e; return false; });
    }
    if (!geladen) {
      befunde.push(`${breite} px ${s}: Seite lädt nicht fertig (2 × ${LADEN_MS / 1000} s) — nicht gemessen. Offen: ${[...offen].slice(0, 4).join(' · ') || 'keine Anfrage'}`);
      await p.close(); continue;
    }
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); } scrollTo(0, 0); });
    await p.waitForTimeout(250);
    await p.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (_) {} }));
    await p.waitForTimeout(150);
    const r = await p.evaluate(messen);
    for (const x of r) befunde.push(`${breite} px ${s}: ${x}`);
    await p.close();
  }
  await c.close();
}
await b.close();

if (SELBSTTEST) {
  const rotKnopf = befunde.some((x) => x.includes('/fix-rot/') && x.includes('Knopf'));
  const rotText = befunde.some((x) => x.includes('/fix-rot/') && x.includes('liegt auf'));
  const gruen = !befunde.some((x) => x.includes('/fix-gruen/'));
  const haengt = befunde.some((x) => x.includes('/fix-haengt/') && x.includes('lädt nicht fertig') && x.includes('haengt-fuer-immer.png'));
  if (rotKnopf && rotText && gruen && haengt) { console.log('✓ Selbsttest kollision-check: Knopf über Text und Text auf Text rot, hängende Seite rot mit Grund, Abstand und geschlossenes <details> grün.'); process.exit(0); }
  console.error('✗ SELBSTTEST kollision-check: ' + JSON.stringify(befunde, null, 1)); process.exit(1);
}
if (!liste.length) { console.error('✗ kollision-check: 0 Seiten gefunden — nicht gemessen ist nicht grün'); process.exit(1); }
if (befunde.length) { console.error(`\n✗ kollision-check: ${befunde.length} Befund(e):\n  ` + befunde.join('\n  ')); process.exit(1); }
console.log(`✓ kollision-check: ${liste.length} Seiten × ${BREITEN.join('/')} px, nichts liegt übereinander.`);
