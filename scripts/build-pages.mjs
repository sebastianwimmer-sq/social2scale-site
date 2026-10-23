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
import { navigation, mobilMenue, fusszeile } from '../lib/shell.mjs';
import { PAARE, datei, kopfZeilen } from '../lib/sprachen.mjs';

const SEITEN = [
  { datei: 'index.html', aktiv: 'start' },
  { datei: 'ablauf/index.html', aktiv: 'ablauf' },
  { datei: 'preise/index.html', aktiv: 'preise' },
  { datei: 'about/index.html', aktiv: 'about' },
  { datei: 'for-you/index.html', aktiv: 'for-you' },
  { datei: 'results/index.html', aktiv: 'results' },
  // Englische Schwestern (lib/sprachen.mjs) — fehlen sie noch, werden sie
  // uebersprungen wie jede andere fehlende Datei.
  { datei: 'en/index.html', aktiv: 'start' },
  { datei: 'en/process/index.html', aktiv: 'ablauf' },
  { datei: 'en/pricing/index.html', aktiv: 'preise' },
  { datei: 'en/about/index.html', aktiv: 'about' },
  { datei: 'en/for-you/index.html', aktiv: 'for-you' },
  { datei: 'en/results/index.html', aktiv: 'results' },
];

// Datei → URL-Pfad ('preise/index.html' → '/preise/').
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

  const neu = ersetze(
    ersetze(
      ersetze(html, 'NAV', navigation(seite.aktiv, urlPfad(seite.datei)), seite.datei),
      'MOBIL',
      mobilMenue(seite.aktiv, urlPfad(seite.datei)),
      seite.datei
    ),
    'FOOTER',
    fusszeile(seite.aktiv, urlPfad(seite.datei)),
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
