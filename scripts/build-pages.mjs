#!/usr/bin/env node
/**
 * Setzt Navigation, Mobil-Menue und Footer-Spalte aus lib/shell.mjs in die
 * Seiten ein. Alles zwischen <!-- SHELL:X --> und <!-- /SHELL:X --> wird
 * ersetzt.
 *
 * Aufruf: node scripts/build-pages.mjs
 * Seiten ohne Marker werden uebersprungen, nicht als Fehler behandelt —
 * so laesst sich Seite fuer Seite umstellen.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { navigation, mobilMenue, fuss } from '../lib/shell.mjs';
import { execFileSync } from 'node:child_process';
import { PAARE, datei, kopfZeilen } from '../lib/sprachen.mjs';
import { newsPaare } from '../lib/news.mjs';

const SEITEN = [
  { datei: 'index.html', aktiv: 'start' },
  { datei: 'ablauf/index.html', aktiv: 'ablauf' },
  { datei: 'leistungen/index.html', aktiv: 'leistungen' },
  { datei: 'about/index.html', aktiv: 'about' },
  { datei: 'for-you/index.html', aktiv: 'for-you' },
  { datei: 'results/index.html', aktiv: 'results' },
  // Englische Schwestern (lib/sprachen.mjs) — fehlen sie noch, werden sie
  // uebersprungen wie jede andere fehlende Datei.
  { datei: 'en/index.html', aktiv: 'start' },
  { datei: 'en/process/index.html', aktiv: 'ablauf' },
  { datei: 'en/services/index.html', aktiv: 'leistungen' },
  { datei: 'en/about/index.html', aktiv: 'about' },
  { datei: 'en/for-you/index.html', aktiv: 'for-you' },
  { datei: 'en/results/index.html', aktiv: 'results' },
  { datei: 'scale-week/index.html', aktiv: 'scale-week' },
  { datei: 'en/scale-week/index.html', aktiv: 'scale-week' },
  // Wochen-News (lib/news.mjs): /news/ und jede Ausgabe, beide Sprachen
  ...newsPaare().flatMap((p) => [p.de, p.en]).map((u) => ({ datei: `${u.slice(1)}index.html`, aktiv: 'news' })),
];

// Datei → URL-Pfad ('leistungen/index.html' → '/leistungen/').
const urlPfad = (d) => `/${d.replace(/index\.html$/, '')}`;

// hreflang + og:locale direkt vor </head>, fuer JEDE zweisprachige Seite —
// auch die ohne Shell-Marker (Wissen, Kontakt). build-wissen.mjs schreibt
// die Wissen-Seiten neu, deshalb laeuft dieser Schritt NACH build-wissen.
const KOPF = /\n?<!-- SPRACHE:KOPF -->[\s\S]*?<!-- \/SPRACHE:KOPF -->/;
function setzeKopf(html, pfad) {
  const zeilen = kopfZeilen(pfad);
  const ohne = html.replace(KOPF, '');
  if (!zeilen) return ohne;
  if (!ohne.includes('</head>')) throw new Error(`</head> fehlt in ${datei(pfad)}`);
  return ohne.replace('</head>', `<!-- SPRACHE:KOPF -->\n${zeilen}\n<!-- /SPRACHE:KOPF -->\n</head>`);
}

function ersetze(html, name, inhalt, datei) {
  const muster = new RegExp(
    `(<!-- SHELL:${name} -->)[\\s\\S]*?(<!-- /SHELL:${name} -->)`
  );
  if (!muster.test(html)) throw new Error(`Marker SHELL:${name} fehlt in ${datei}`);
  return html.replace(muster, `$1\n${inhalt}\n$2`);
}

let geaendert = 0;
for (const seite of SEITEN) {
  let html;
  try {
    html = readFileSync(seite.datei, 'utf8');
  } catch {
    console.log(`übersprungen (nicht vorhanden): ${seite.datei}`);
    continue;
  }
  if (!html.includes('<!-- SHELL:NAV -->')) {
    console.log(`übersprungen (noch keine Marker): ${seite.datei}`);
    continue;
  }

  // Der Footer kommt seit 19.11.2026 ganz aus fuss() — eingesetzt in der Schleife ueber alle Seiten weiter unten.
  const neu = ersetze(
    ersetze(html, 'NAV', navigation(seite.aktiv, urlPfad(seite.datei)), seite.datei),
    'MOBIL',
    mobilMenue(seite.aktiv, urlPfad(seite.datei)),
    seite.datei
  );

  if (neu !== html) {
    writeFileSync(seite.datei, neu, 'utf8');
    console.log(`aktualisiert: ${seite.datei}`);
    geaendert++;
  } else {
    console.log(`unveraendert: ${seite.datei}`);
  }
}

// Footer auf JEDER Seite mit Footer (19.11.2026), auch Wissen, Rechtstexte, Onboarding, 404: eine Quelle (lib/shell.mjs).
// Beim ersten Lauf wird der alte <footer class="site-footer"> durch den Marker-Block ersetzt, danach nur der Block.
const FUSS_BLOCK = /<!-- SHELL:FUSS -->[\s\S]*?<!-- \/SHELL:FUSS -->/;
const ALT_FUSS = /<footer class="site-footer"[\s\S]*?<\/footer>/;
const MENUE_AKTIV = Object.fromEntries(SEITEN.map((s) => [s.datei, s.aktiv]));
const alleSeiten = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.html'], { encoding: 'utf8' })
  .trim().split('\n').filter((d) => !/^(free-content|docs|tests|scripts|node_modules)\//.test(d));
for (const d of alleSeiten) {
  let html;
  try { html = readFileSync(d, 'utf8'); } catch { continue; }
  if (!FUSS_BLOCK.test(html) && !ALT_FUSS.test(html)) continue;
  const aktiv = MENUE_AKTIV[d] ?? (d.startsWith('wissen/') || d.startsWith('en/knowledge/') ? 'wissen' : '');
  const block = `<!-- SHELL:FUSS -->\n${fuss(aktiv, urlPfad(d))}\n<!-- /SHELL:FUSS -->`;
  const neu = FUSS_BLOCK.test(html) ? html.replace(FUSS_BLOCK, () => block) : html.replace(ALT_FUSS, () => block);
  if (neu !== html) { writeFileSync(d, neu, 'utf8'); console.log(`Footer: ${d}`); geaendert++; }
}

for (const pfad of PAARE.flatMap((p) => [p.de, p.en])) {
  let html;
  try {
    html = readFileSync(datei(pfad), 'utf8');
  } catch {
    continue;
  }
  const neu = setzeKopf(html, pfad);
  if (neu !== html) {
    writeFileSync(datei(pfad), neu, 'utf8');
    console.log(`Sprach-Kopf: ${datei(pfad)}`);
    geaendert++;
  }
}
console.log(`fertig — ${geaendert} Datei(en) geaendert.`);
