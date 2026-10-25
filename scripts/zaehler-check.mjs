#!/usr/bin/env node
/**
 * Tor: jede Seite, die ihren Aufruf zaehlt, steht auf der Erlaubt-Liste des Zaehlers im CRM.
 *
 * Der Zaehler (closing.social2scale.com/api/pv, _portal/lib/siteviews.js im Repo
 * social2scale-clients) nimmt nur Pfade von seiner Liste an — alles andere landet still
 * als „/sonstige“. So standen bis 25.10.2026 alle 14 englischen Seiten im CRM unter
 * „/sonstige“ — in der Woche bis 25.10. der groesste Posten (24 Aufrufe, Startseite 16), die
 * englische Haelfte der Website war unsichtbar
 * (Ticket #372). Dasselbe war vorher mit der Wissens-Sektion passiert.
 *
 * Geprueft wird gegen den Stand auf origin/main des Portals — das ist, was live zaehlt.
 * Reihenfolge beim Ausliefern deshalb: erst das Portal (neue Pfade erlaubt), dann die Seite.
 *
 *   node scripts/zaehler-check.mjs                  gegen origin/main von ~/social2scale-clients
 *   node scripts/zaehler-check.mjs --portal=<datei> gegen eine lokale siteviews.js
 *   node scripts/zaehler-check.mjs --selbsttest     rot UND gruen an Fixtures
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PORTAL_REPO = process.env.S2S_CLIENTS || join(homedir(), 'social2scale-clients');
const ZAEHLT = 'closing.social2scale.com/api/pv';

/** Pfade (/…/) aller Seiten im Repo, die ihren Aufruf melden. 404 meldet absichtlich jeden Pfad. */
export function zaehlendeSeiten() {
  const dateien = execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8' }).trim().split('\n');
  return dateien
    .filter((d) => d !== '404.html' && !d.startsWith('scripts/') && !d.startsWith('free-content/'))
    .filter((d) => readFileSync(d, 'utf8').includes(ZAEHLT))
    .map((d) => '/' + d.replace(/index\.html$/, ''));
}

/**
 * Befunde: Seiten, die als /sonstige enden, und Funnel-Schritte ohne englische Schwester.
 * @param {string[]} seiten  @param {(p: string) => string} normalisiere  @param {string[]} erlaubt
 */
export function befunde(seiten, normalisiere, erlaubt) {
  const aus = seiten.filter((p) => normalisiere(p) === '/sonstige').map((p) => `Seite ${p} zählt als /sonstige`);
  for (const p of erlaubt.filter((x) => x.startsWith('/vorschau/'))) {
    if (normalisiere('/en' + p) === '/sonstige') aus.push(`Funnel-Schritt /en${p} fehlt (englischer Funnel)`);
  }
  return aus;
}

async function portalLaden(datei) {
  const quelle = datei
    ? readFileSync(datei, 'utf8')
    : execFileSync('git', ['-C', PORTAL_REPO, 'show', 'origin/main:_portal/lib/siteviews.js'], { encoding: 'utf8' });
  const ordner = mkdtempSync(join(tmpdir(), 'zaehler-'));
  try {
    const ziel = join(ordner, 'siteviews.mjs');
    writeFileSync(ziel, quelle);
    return await import(pathToFileURL(ziel).href);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
}

function selbsttest() {
  const liste = (erlaubt) => (p) => (erlaubt.includes(p) ? p : '/sonstige');
  const voll = ['/', '/en/', '/vorschau/', '/en/vorschau/'];
  const faelle = [
    ['alles erlaubt → grün', befunde(['/', '/en/'], liste(voll), voll).length, 0],
    ['englische Seite fehlt → rot', befunde(['/', '/en/'], liste(['/', '/vorschau/', '/en/vorschau/']), voll).join(), 'Seite /en/ zählt als /sonstige'],
    ['EN-Funnel-Schritt fehlt → rot', befunde(['/'], liste(['/', '/vorschau/']), ['/', '/vorschau/']).join(), 'Funnel-Schritt /en/vorschau/ fehlt (englischer Funnel)'],
  ];
  let rot = 0;
  for (const [name, ist, soll] of faelle) {
    const ok = ist === soll;
    if (!ok) rot++;
    console.log(`${ok ? '🟢' : '🔴'} ${name}${ok ? '' : ` — ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`}`);
  }
  process.exit(rot ? 1 : 0);
}

const arg = process.argv.slice(2);
if (arg.includes('--selbsttest')) selbsttest();
else {
  let m;
  try {
    m = await portalLaden((arg.find((a) => a.startsWith('--portal=')) || '').slice(9) || null);
  } catch (e) {
    // Nicht gemessen ist nie gruen (kern.md).
    console.error(`🔴 Zähler nicht gemessen — Portal-Liste nicht lesbar (${PORTAL_REPO}): ${e.message.split('\n')[0]}`);
    process.exit(1);
  }
  const seiten = zaehlendeSeiten();
  if (!seiten.length) { console.error('🔴 0 zählende Seiten gefunden — Tor misst nichts'); process.exit(1); }
  const b = befunde(seiten, m.normalisierePfad, m.ERLAUBTE_PFADE);
  if (b.length) {
    for (const x of b) console.error('🔴 ' + x);
    console.error(`→ Pfad in _portal/lib/siteviews.js (social2scale-clients) ergänzen und das Portal zuerst ausliefern.`);
    process.exit(1);
  }
  console.log(`🟢 Zähler: ${seiten.length} Seiten und alle Funnel-Schritte (DE + EN) stehen auf der Liste`);
}
