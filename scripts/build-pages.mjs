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

const SEITEN = [
  { datei: 'index.html', aktiv: 'start' },
  { datei: 'about/index.html', aktiv: 'about' },
  { datei: 'for-you/index.html', aktiv: 'for-you' },
  { datei: 'results/index.html', aktiv: 'results' },
];

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
      ersetze(html, 'NAV', navigation(seite.aktiv), seite.datei),
      'MOBIL',
      mobilMenue(seite.aktiv),
      seite.datei
    ),
    'FOOTER',
    fusszeile(seite.aktiv),
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
console.log(`fertig — ${geaendert} Datei(en) geaendert.`);
