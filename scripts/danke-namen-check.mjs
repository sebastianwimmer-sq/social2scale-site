#!/usr/bin/env node
/**
 * Der Name auf /danke/ kommt aus dem Link (Digistore reicht ihn durch). Dieses Tor liest die Funktion aus der
 * ausgelieferten Seite und rechnet sie gegen feste Fälle: was dort als Gruß steht, darf nie aus dem Bildschirm
 * laufen (16.11.2026: 35-Zeichen-Wort) und nie etwas anderes sein als ein Vorname.
 *   node scripts/danke-namen-check.mjs            prüft danke/index.html
 *   node scripts/danke-namen-check.mjs --selbsttest   kaputte Fassung muss rot werden
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAELLE = [
  ['', ''], ['   ', ''], ['Eva', 'Eva'], ['Peter Muster', 'Peter'], ['Zoë O\'Neil', 'Zoë'], ['Jean-Luc', 'Jean-Luc'],
  ['Maximiliane-Charlotte Friederike', 'Maximiliane'], ['Donaudampfschifffahrtsgesellschaft', ''],
  ['<img src=x onerror=alert(1)>', ''], ['Anna<b>', ''], ['12345', ''], ['x'.repeat(200), ''], ['D\'Arcy', 'D\'Arcy'], ['Çağla', 'Çağla'],
];

function funktion(html) {
  const m = html.match(/NAME:ANFANG[\s\S]*?\*\/([\s\S]*?)\/\* NAME:ENDE \*\//);
  if (!m) return null;
  return new Function(m[1] + '\nreturn vorname;')();
}
function pruefe(html) {
  const f = funktion(html);
  if (!f) return ['Funktion zwischen NAME:ANFANG und NAME:ENDE nicht gefunden (nicht gemessen ist nie grün)'];
  const rot = [];
  for (const [ein, soll] of FAELLE) {
    let ist; try { ist = f(ein); } catch (e) { ist = 'FEHLER ' + e.message; }
    if (ist !== soll) rot.push(`„${ein.slice(0, 40)}“ → „${ist}“ (soll „${soll}“)`);
    if (typeof ist === 'string' && (ist.length > 18 || /[<>&"\s]/.test(ist))) rot.push(`„${ein.slice(0, 40)}“ ergibt unzulässigen Gruß „${ist}“`);
  }
  return rot;
}

const html = readFileSync(join(WURZEL, 'danke/index.html'), 'utf8');
if (process.argv.includes('--selbsttest')) {
  const kaputt = html.replace(/\{0,17\}/, '{0,200}');   // Längengrenze entfernt
  const ohne = html.replace('NAME:ANFANG', 'NAME:WEG');
  const a = pruefe(kaputt), b = pruefe(ohne), c = pruefe(html);
  const ok = kaputt !== html && a.some((z) => z.includes('Donaudampf')) && b.length === 1 && c.length === 0;
  console.log(ok ? '🟢 Selbsttest Danke-Namen: zu langer Name wird rot, fehlende Funktion wird rot, echte Seite grün'
    : '🔴 Selbsttest Danke-Namen: ' + JSON.stringify({ kaputt: a.slice(0, 2), ohne: b, echt: c.slice(0, 2) }));
  process.exit(ok ? 0 : 1);
}
const rot = pruefe(html);
if (rot.length) { console.log('🔴 Danke-Namen:\n  ' + rot.join('\n  ')); process.exit(1); }
console.log(`🟢 Danke-Namen: ${FAELLE.length} Fälle, der Gruß ist immer ein Vorname bis 18 Zeichen oder leer`);
