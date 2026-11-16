#!/usr/bin/env node
/**
 * Schreibt das Lichtstudio (Richtung E, 27.10.2026) in jede Seite — aus EINER Quelle, DE und EN gleich.
 *
 *   node scripts/raum-bauen.mjs            schreibt Raum-Blöcke, Seitenlicht, CSS- und JS-Verweis
 *   node scripts/raum-bauen.mjs --pruefen  schreibt nichts; Exit 1, wenn eine Seite vom Soll abweicht
 *                                          (z. B. weil build-wissen.mjs sie neu erzeugt hat)
 *
 * Zwei Teile:
 *  - Kopf-Ort: der Raum im Hero einer Seite (Wand, Verlaufslicht, Boden, Abzüge, Staub) — je Seite ein eigener Ort
 *  - Seitenlicht: ein ruhiger Kegel über der ganzen Seite, der dem Abschnitt folgt, den man gerade liest
 * Plan: docs/superpowers/specs/2026-10-27-immersiv-design.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const WURZEL = resolve(import.meta.dirname, '..');
const PRUEFEN = process.argv.includes('--pruefen');
const F = '/assets/feed/';

const abzug = ({ b, x, y, bild, hell }) =>
  `<figure class="raum-abzug" style="--b:${b};--x:${x};--y:${y}${hell ? `;--hell:${hell}` : ''}"><img data-src="${bild.startsWith('/') ? bild : F + bild}" alt="" width="360" height="450" decoding="async"></figure>`;
const podest = ({ b, x, y, h }) => `<span class="raum-podest" style="--b:${b};--x:${x};--y:${y};--h:${h}"></span>`;

// Kopf-Orte: was im Raum steht. Positionen in Ebenen-Koordinaten (Boden ab ~44 % von unten).
const KOPF = {
  // Startseite ruhig (Sebi 16.11.2026): nur Wand, Licht und Boden. Keine schwebenden Abzüge, kein Staub.
  start: { ruhig: true },
  // Alle Seiten ruhig (16.11.2026): der Kopf trägt Wand, Licht und Boden, sonst nichts. Der Verlauf macht den Raum (raum.css › Fluss).
  ablauf: { ruhig: true }, preise: { ruhig: true }, 'fuer-wen': { ruhig: true }, 'ueber-uns': { ruhig: true }, 'pruef-uns': { ruhig: true },
  danke: { mitte: [] },
  'studio-danke': { mitte: [] },
};

const kopfBlock = (ort) => {
  const o = KOPF[ort];
  const ebene = (cls, z, inhalt) => `<div class="raum-ebene${cls}" style="--z:${z}">${inhalt}</div>`;
  const teile = [
    ebene(' raum-wand', 5, ''),
    ebene(' raum-kegel', 12, ''),
    ebene(' raum-boden', 9, o.weg ? `<div class="raum-weg" style="--von:${o.weg.von};--bis:${o.weg.bis};--hoehe:${o.weg.hoehe}"></div>` : ''),
  ];
  if (o.podeste || o.fern) teile.push(ebene(' raum-fern', 7, (o.podeste || []).map(podest).join('') + (o.fern || []).map(abzug).join('')));
  if (o.mitte && o.mitte.length) teile.push(ebene(' raum-mitte', 16, o.mitte.map(abzug).join('')));
  if (!o.ruhig) teile.push('<canvas class="raum-ebene raum-staub" style="--z:20"></canvas>');
  return `<!-- RAUM (scripts/raum-bauen.mjs) --><div class="raum raum--${ort}" data-raum${o.spaet ? ' data-spaet' : ''} aria-hidden="true">${teile.join('')}</div><!-- /RAUM -->`;
};
const lichtBlock = (ort) => `<!-- RAUM-LICHT (scripts/raum-bauen.mjs) --><div class="raum-licht" data-raum-licht="${ort}" aria-hidden="true"></div><!-- /RAUM-LICHT -->`;

// Seiten: DE und EN teilen sich den Ort. anker = öffnendes Tag, hinter das der Kopf-Ort kommt.
const SEITEN = [
  { dateien: ['index.html', 'en/index.html'], kopf: 'start', anker: /<section class="hero" id="hero">/ },
  { dateien: ['ablauf/index.html', 'en/process/index.html'], kopf: 'ablauf', anker: /<section class="fl-hero">/ },
  { dateien: ['preise/index.html', 'en/pricing/index.html'], kopf: 'preise', anker: /<section class="pr-hero"[^>]*>/ },
  { dateien: ['for-you/index.html', 'en/for-you/index.html'], kopf: 'fuer-wen', anker: /<section class="fw-hero"[^>]*>/ },
  { dateien: ['about/index.html', 'en/about/index.html'], kopf: 'ueber-uns', anker: /<section class="ab-hero"[^>]*>/ },
  { dateien: ['results/index.html', 'en/results/index.html'], kopf: 'pruef-uns', anker: /<section class="rs-hero"[^>]*>/ },
  // /danke/ hat seit 15.11.2026 keinen Raum mehr: ruhige Seite ohne Lichtkegel (Sebi: high end clean).
  { dateien: ['danke/studio/index.html', 'danke/studio/abo/index.html', 'danke/studio/paket-100/index.html', 'danke/studio/paket-250/index.html', 'danke/studio/paket-500/index.html'], kopf: 'studio-danke', anker: /<section class="hero">/ },
  { dateien: ['wissen/index.html', 'wissen/ablauf-zusammenarbeit/index.html', 'wissen/selbst-machen-oder-agentur/index.html', 'wissen/social-media-agentur-auswaehlen/index.html', 'wissen/was-kostet-social-media-betreuung/index.html', 'wissen/wie-lange-bis-ergebnisse/index.html',
    'en/knowledge/index.html', 'en/knowledge/choosing-a-social-media-agency/index.html', 'en/knowledge/diy-or-agency/index.html', 'en/knowledge/how-long-until-results/index.html', 'en/knowledge/how-we-work-together/index.html', 'en/knowledge/social-media-management-cost/index.html'], licht: 'wissen' },
  { dateien: ['anfrage/index.html', 'en/contact/index.html'], licht: 'anfrage' },
  { dateien: ['links/index.html'], licht: 'links' },
  { dateien: ['onboarding/index.html'], licht: 'onboarding' },
  { dateien: ['datenschutz/index.html', 'impressum/index.html'], licht: 'recht' },
  { dateien: ['404.html'], licht: 'leer' },
];

const CSS = '<link rel="stylesheet" href="/raum.css">';
const JS = '<script src="/raum.js" defer></script>';

function soll(html, seite) {
  let t = html.replace(/<!-- RAUM \(scripts\/raum-bauen\.mjs\) -->[\s\S]*?<!-- \/RAUM -->/g, '')
    .replace(/<!-- RAUM-LICHT \(scripts\/raum-bauen\.mjs\) -->[\s\S]*?<!-- \/RAUM-LICHT -->\n?/g, '');
  if (seite.kopf) {
    const m = t.match(seite.anker);
    if (!m) throw new Error(`Anker fehlt (${seite.anker})`);
    t = t.replace(m[0], m[0] + kopfBlock(seite.kopf));
  }
  const ort = seite.kopf || seite.licht;
  if (!t.includes('</body>')) throw new Error('</body> fehlt');
  t = t.replace('</body>', lichtBlock(ort) + '\n</body>');
  if (!t.includes(CSS)) {
    if (!t.includes('</head>')) throw new Error('</head> fehlt');
    t = t.replace('</head>', CSS + '\n</head>');
  }
  if (!t.includes(JS)) t = t.replace('</head>', JS + '\n</head>');
  return t;
}

let abweichend = 0;
for (const seite of SEITEN) {
  for (const datei of seite.dateien) {
    const pfad = resolve(WURZEL, datei);
    const alt = await readFile(pfad, 'utf8');
    let neu;
    try { neu = soll(alt, seite); } catch (e) { console.log(`🔴 ${datei}: ${e.message}`); abweichend++; continue; }
    if (neu === alt) continue;
    abweichend++;
    if (PRUEFEN) console.log(`🔴 ${datei}: Raum fehlt oder veraltet (node scripts/raum-bauen.mjs)`);
    else { await writeFile(pfad, neu); console.log(`✎ ${datei} (${seite.kopf ? 'Kopf ' + seite.kopf + ' + ' : ''}Licht)`); }
  }
}
if (PRUEFEN) {
  console.log(abweichend ? `\n✗ raum-bauen --pruefen: ${abweichend} Seite(n) weichen ab` : '✓ raum-bauen: jede Seite trägt ihren Ort und das Seitenlicht');
  process.exit(abweichend ? 1 : 0);
}
console.log(`✓ raum-bauen: ${abweichend} Seite(n) geschrieben`);
