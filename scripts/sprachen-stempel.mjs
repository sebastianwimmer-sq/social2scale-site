#!/usr/bin/env node
/**
 * Setzt den Aktualitaets-Stempel einer englischen Seite neu: gegen welchen
 * Stand der deutschen Schwester sie geschrieben ist (lib/sprachen.mjs).
 *
 * Erst aufrufen, NACHDEM die EN-Seite an die geaenderte DE-Seite angepasst
 * wurde — der Stempel ist die Unterschrift „ist nachgezogen“, kein Pflaster,
 * um das Tor gruen zu machen.
 *
 * Aufruf: node scripts/sprachen-stempel.mjs <en-pfad>   (z. B. /en/pricing/)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { schwester, datei, stempelZeile, STEMPEL_MUSTER } from '../lib/sprachen.mjs';

const pfad = process.argv[2];
const s = pfad && schwester(pfad);
if (!s || s.sprache !== 'en') {
  console.error(`Kein englischer Pfad aus lib/sprachen.mjs: ${pfad ?? '(leer)'}`);
  process.exit(2);
}

const deHtml = readFileSync(datei(s.andere), 'utf8');
const enDatei = datei(pfad);
const enHtml = readFileSync(enDatei, 'utf8');
const zeile = stempelZeile(s.andere, deHtml);

let neu;
if (STEMPEL_MUSTER.test(enHtml)) {
  neu = enHtml.replace(STEMPEL_MUSTER, zeile);
} else {
  if (!enHtml.includes('<meta charset="UTF-8">')) {
    console.error(`<meta charset="UTF-8"> fehlt in ${enDatei}`);
    process.exit(1);
  }
  neu = enHtml.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n${zeile}`);
}
writeFileSync(enDatei, neu, 'utf8');
console.log(`Stempel ${enDatei}: ${zeile}`);
