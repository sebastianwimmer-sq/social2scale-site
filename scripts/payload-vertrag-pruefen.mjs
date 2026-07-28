#!/usr/bin/env node
/**
 * Prueft den Payload-Vertrag zwischen Formular und Backend.
 *
 * Warum es das gibt: `form.js` (externe Session) baut das Objekt,
 * `validate.js` und `leads.js` (interne Session) lesen es. Wird ein Feld
 * umbenannt, bricht nichts sichtbar — es kommt einfach leer an. Genau die
 * Sorte Fehler, die still bleibt. Dieses Skript macht die Absprache zu
 * einer Pruefung.
 *
 * Aufruf:
 *   node scripts/payload-vertrag-pruefen.mjs
 *
 * Exit 0 = Vertrag haelt · Exit 1 = ein Feld fehlt irgendwo.
 *
 * Solange `free-content/` noch auf dem Branch feat/free-content-funnel liegt
 * und nicht auf main, liest das Skript die Dateien per `git show` von dort.
 * Nach dem Merge findet es sie direkt im Arbeitsverzeichnis — beide Wege sind
 * eingebaut, es muss nichts angepasst werden.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const FALLBACK_BRANCH = 'feat/free-content-funnel';

/** Felder, die das Formular senden MUSS. */
const PFLICHT_IM_FORMULAR = [
  'name', 'email', 'handle', 'branche', 'ziel', 'stimmung',
  'stand', 'consent', 'testimonialConsent', 'turnstile', 'source',
];

/** Felder, die das Backend lesen muss, damit der Lead vollstaendig ankommt. */
const PFLICHT_IM_BACKEND = {
  'src/validate.js': ['branche', 'ziel', 'stand', 'testimonialConsent'],
  'src/leads.js': ['branche', 'ziel', 'stand', 'testimonialConsent'],
};

function lies(pfad) {
  const imBaum = `free-content/${pfad}`;
  if (existsSync(imBaum)) return { text: readFileSync(imBaum, 'utf8'), quelle: 'Arbeitsverzeichnis' };
  try {
    const text = execFileSync('git', ['show', `${FALLBACK_BRANCH}:free-content/${pfad}`], { encoding: 'utf8' });
    return { text, quelle: `Branch ${FALLBACK_BRANCH}` };
  } catch {
    return null;
  }
}

/** Zieht die Schluessel aus dem `const payload={...}`-Block. */
function payloadSchluessel(quelltext) {
  const start = quelltext.indexOf('const payload={');
  if (start === -1) return null;

  // Klammern zaehlen, damit verschachtelte Ausdruecke nicht zu frueh abschneiden.
  let tiefe = 0;
  let ende = -1;
  for (let i = quelltext.indexOf('{', start); i < quelltext.length; i++) {
    if (quelltext[i] === '{') tiefe++;
    else if (quelltext[i] === '}') {
      tiefe--;
      if (tiefe === 0) { ende = i; break; }
    }
  }
  if (ende === -1) return null;

  const block = quelltext.slice(start, ende);
  // Nur Schluessel auf oberster Ebene: Zeilenanfang, dann name:
  return [...block.matchAll(/^\s{0,6}([a-zA-Z][a-zA-Z0-9_]*)\s*:/gm)].map((m) => m[1]);
}

let fehler = 0;
const melde = (ok, text) => { console.log(`${ok ? '✅' : '🔴'} ${text}`); if (!ok) fehler++; };

// --- Formularseite ---
const formular = lies('src/pages/form.js');
if (!formular) {
  console.log('🔴 form.js nicht gefunden — weder im Arbeitsverzeichnis noch im Branch.');
  process.exit(1);
}
console.log(`form.js gelesen aus: ${formular.quelle}\n`);

const gesendet = payloadSchluessel(formular.text);
if (!gesendet) {
  console.log('🔴 Der payload-Block in form.js liess sich nicht lesen — Aufbau geaendert?');
  process.exit(1);
}

for (const feld of PFLICHT_IM_FORMULAR) {
  melde(gesendet.includes(feld), `form.js sendet "${feld}"`);
}

const unbekannt = gesendet.filter((f) => !PFLICHT_IM_FORMULAR.includes(f) && !['farbe', 'elapsed'].includes(f));
if (unbekannt.length) {
  console.log(`\n💡 Neue Felder im Payload, die der Vertrag noch nicht kennt: ${unbekannt.join(', ')}`);
  console.log('   Mit der anderen Session abstimmen und in docs/WER-MACHT-WAS.md eintragen.');
}

// --- Backendseite ---
console.log('');
for (const [datei, felder] of Object.entries(PFLICHT_IM_BACKEND)) {
  const inhalt = lies(datei);
  if (!inhalt) { melde(false, `${datei} nicht gefunden`); continue; }
  for (const feld of felder) {
    melde(new RegExp(`\\b${feld}\\b`).test(inhalt.text), `${datei} liest "${feld}"`);
  }
}

console.log('');
if (fehler) {
  console.log(`🔴 Payload-Vertrag verletzt: ${fehler} Prüfung(en) fehlgeschlagen.`);
  console.log('   Ein fehlendes Feld bricht nichts sichtbar — es kommt leer an.');
  console.log('   Siehe docs/WER-MACHT-WAS.md, Abschnitt "Payload-Vertrag".');
  process.exit(1);
}
console.log('✅ Payload-Vertrag haelt — Formular und Backend sprechen dieselben Feldnamen.');
