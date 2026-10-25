#!/usr/bin/env node
/**
 * Tor: jede URL in sitemap.xml ist eine echte, indexierbare Seite.
 * Rot, wenn die Datei fehlt, die Seite noindex traegt, nur weiterleitet (meta refresh) oder
 * ihre Canonical auf eine andere URL zeigt. Anlass 25.10.2026: /gratis/ stand seit dem
 * Umbau zur Weiterleitung (16.10.) mit noindex in der Sitemap — widerspruechliche Signale
 * an Google/Bing, die den Eintrag dann als Fehler fuehren.
 *
 *   node scripts/sitemap-check.mjs [--wurzel=<dir>] | --selbsttest
 */
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const DOMAIN = 'https://social2scale.com';

export function befunde(wurzel) {
  const sm = join(wurzel, 'sitemap.xml');
  if (!existsSync(sm)) return ['sitemap.xml fehlt'];
  const urls = [...readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) return ['sitemap.xml ohne <loc> — Tor misst nichts'];
  const aus = [];
  for (const url of urls) {
    if (!url.startsWith(DOMAIN + '/')) { aus.push(`${url}: fremde Domain`); continue; }
    const pfad = url.slice(DOMAIN.length);
    const datei = join(wurzel, pfad.endsWith('/') ? pfad + 'index.html' : pfad);
    if (!existsSync(datei)) { aus.push(`${pfad}: Datei fehlt`); continue; }
    const html = readFileSync(datei, 'utf8');
    if (/<meta name="robots" content="[^"]*noindex/i.test(html)) aus.push(`${pfad}: noindex, gehört nicht in die Sitemap`);
    if (/<meta http-equiv="refresh"/i.test(html)) aus.push(`${pfad}: Weiterleitung, gehört nicht in die Sitemap`);
    const can = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1];
    if (can && can !== url) aus.push(`${pfad}: Canonical zeigt auf ${can}`);
  }
  return aus;
}

function selbsttest() {
  const w = mkdtempSync(join(tmpdir(), 'sitemap-check-'));
  const seite = (p, kopf) => { const f = join(w, p, 'index.html'); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, `<html><head>${kopf}</head></html>`); };
  const karte = (...p) => writeFileSync(join(w, 'sitemap.xml'), `<urlset>${p.map((x) => `<url><loc>${DOMAIN}${x}</loc></url>`).join('')}</urlset>`);
  seite('a', `<link rel="canonical" href="${DOMAIN}/a/">`);
  seite('weiter', '<meta name="robots" content="noindex, follow"><meta http-equiv="refresh" content="0; url=https://x/">');
  seite('b', `<link rel="canonical" href="${DOMAIN}/a/">`);
  const faelle = [
    ['saubere Seite → grün', () => karte('/a/'), (b) => b.length === 0],
    ['noindex-Weiterleitung → rot', () => karte('/a/', '/weiter/'), (b) => b.some((x) => /\/weiter\/: noindex/.test(x))],
    ['fremde Canonical → rot', () => karte('/b/'), (b) => b.some((x) => /Canonical zeigt auf/.test(x))],
    ['fehlende Datei → rot', () => karte('/gibtsnicht/'), (b) => b.some((x) => /Datei fehlt/.test(x))],
  ];
  let rot = 0;
  for (const [name, vor, ok] of faelle) {
    vor(); const b = befunde(w); const gut = ok(b);
    if (!gut) rot++;
    console.log(`${gut ? '🟢' : '🔴'} ${name}${b.length ? ' — ' + b.join(' | ') : ''}`);
  }
  rmSync(w, { recursive: true, force: true });
  process.exit(rot ? 1 : 0);
}

const arg = process.argv.slice(2);
if (arg.includes('--selbsttest')) selbsttest();
else {
  const w = (arg.find((a) => a.startsWith('--wurzel=')) || '').slice(9) || '.';
  const b = befunde(w);
  for (const x of b) console.error('🔴 ' + x);
  if (b.length) process.exit(1);
  console.log('🟢 Sitemap: jede URL ist eine echte, indexierbare Seite');
}
