#!/usr/bin/env node
/**
 * Holt die Google-Bewertungen des Unternehmensprofils und legt sie als
 * data/bewertungen.json ab. Gebaut wird daraus mit bewertungen-bauen.mjs.
 *
 * Aufruf:
 *   GOOGLE_PLACES_KEY=… GOOGLE_PLACE_ID=… node scripts/bewertungen-holen.mjs
 *
 * WARUM HOLEN UND NICHT EINBETTEN
 * ───────────────────────────────
 * Ein fertiges Fremd-Widget (Trustpilot, Trustindex, Elfsight) bringt immer
 * ein fremdes <script> mit. Die Seite hostet ihre Schriften aus DSGVO-Gruenden
 * selbst und gibt jedes Inline-Skript einzeln per sha256 frei — ein fremder
 * Host darin waere ein Bruch mit allem, was csp-haerten.mjs aufbaut.
 *
 * Deshalb: einmal beim Bauen holen, statisch rendern. Auf der ausgelieferten
 * Seite laeuft danach nichts Fremdes, die CSP bleibt unveraendert.
 *
 * WARUM NICHT TRUSTPILOT
 * ──────────────────────
 * Trustpilots kostenloser Tarif hat GENAU EIN Website-Widget: den Review
 * Collector, also einen "Bewerte uns"-Knopf. Kein Anzeige-Widget, keine
 * Sterne, keine Zitate (im eigenen Konto geprueft, 16.09.2026). Der API-Zugang
 * zum Selberholen ist ein Premium-Add-on. Google dagegen ist dauerhaft gratis,
 * ohne Bewertungslimit — Belege in ~/kit-build/bewertungen-evidenz.json.
 *
 * WAS HIER BEWUSST NICHT MITKOMMT
 * ───────────────────────────────
 * Die Profilbilder der Bewertenden liegen auf googleusercontent.com. Die CSP
 * erlaubt img-src nur 'self' und data: — ein solches Bild waere blockiert und
 * haette eine 0x0-Box hinterlassen, die kein Statuscode-Test bemerkt. Es wird
 * deshalb gar nicht erst uebernommen; die Darstellung nutzt Initialen.
 *
 * GOOGLES BEDINGUNGEN
 * ───────────────────
 * Zwischenspeichern ist auf 30 Tage begrenzt. Das Feld `geholt_am` haelt fest,
 * wann geholt wurde; bewertungen-bauen.mjs bricht ab, sobald das ueberschritten
 * ist. Ein veralteter Stand faellt damit auf, statt still live zu bleiben.
 * Attribution (Google-Nennung + Link aufs Profil) ist Pflicht und steckt
 * deshalb fest im Markup, nicht in einer Option.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = resolve(WURZEL, 'data/bewertungen.json');

/** Google liefert maximal fuenf Bewertungen je Ort — mehr geht nicht, auch nicht bezahlt. */
const MAX = 5;

/**
 * Felder, die wir anfordern. Bewusst knapp: je mehr Felder, desto teurer die
 * SKU-Einstufung. Bewertungstexte liegen ohnehin im hoechsten Feld dieser Liste.
 */
const FELDER = [
  'displayName',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'reviews',
].join(',');

function abbruch(text) {
  console.error(`\n  ✗ ${text}\n`);
  process.exit(1);
}

/** Leere Zeichenketten sind bei Env-Variablen der haeufigste stille Fehler. */
function pflichtEnv(name, hinweis) {
  const wert = (process.env[name] ?? '').trim();
  if (!wert) abbruch(`${name} fehlt oder ist leer.\n    ${hinweis}`);
  return wert;
}

/**
 * Baut aus einer Google-Rezension den schlanken Datensatz, den die Seite
 * braucht. Alles, was wir nicht rendern, bleibt draussen — es hat keinen
 * Zweck, fremde Nutzerdaten im Repo liegen zu haben.
 */
function uebernehmen(r) {
  const text = (r.originalText?.text ?? r.text?.text ?? '').trim();
  const name = (r.authorAttribution?.displayName ?? '').trim();
  return {
    id: r.name ?? '',
    autor: name,
    initialen: initialenAus(name),
    sterne: Number(r.rating) || 0,
    text,
    veroeffentlicht: r.publishTime ?? '',
    wann: r.relativePublishTimeDescription ?? '',
  };
}

/** "Sabine Rühl" → "SR", "Eva" → "E". Ersetzt das blockierte Profilbild. */
function initialenAus(name) {
  const teile = name.split(/\s+/).filter(Boolean);
  if (teile.length === 0) return '·';
  const ersteZwei = [teile[0], teile.at(-1)].slice(0, teile.length === 1 ? 1 : 2);
  return ersteZwei.map((t) => [...t][0].toUpperCase()).join('');
}

async function holen() {
  const schluessel = pflichtEnv(
    'GOOGLE_PLACES_KEY',
    'API-Schluessel aus der Google Cloud Console (Places API aktivieren). NICHT ins Repo.'
  );
  const ortId = pflichtEnv(
    'GOOGLE_PLACE_ID',
    'Place-ID des verifizierten Unternehmensprofils.'
  );

  const antwort = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(ortId)}`,
    { headers: { 'X-Goog-Api-Key': schluessel, 'X-Goog-FieldMask': FELDER } }
  );

  if (!antwort.ok) {
    const koerper = await antwort.text().catch(() => '');
    // Der Schluessel darf unter keinen Umstaenden in einer Fehlermeldung landen —
    // Logs wandern in Terminal-Historien und Tickets.
    abbruch(
      `Google antwortet ${antwort.status}.\n    ${koerper.slice(0, 400).replace(schluessel, '…')}`
    );
  }

  const daten = await antwort.json();
  const roh = Array.isArray(daten.reviews) ? daten.reviews : [];

  const bewertungen = roh
    .map(uebernehmen)
    .filter((b) => b.text && b.autor && b.sterne > 0)
    .slice(0, MAX);

  // Eine Antwort ohne Bewertungen ist KEIN Fehler — am Anfang ist das der
  // Normalfall. Der Bauschritt laesst den Abschnitt dann weg.
  if (roh.length > 0 && bewertungen.length === 0) {
    abbruch(
      `Google liefert ${roh.length} Rezensionen, aber keine mit Text, Namen UND Sternen.\n` +
      `    Das ist ungewoehnlich — bitte ansehen, bevor gebaut wird.`
    );
  }

  return {
    geholt_am: new Date().toISOString(),
    profil: daten.displayName?.text ?? '',
    profil_url: daten.googleMapsUri ?? '',
    schnitt: typeof daten.rating === 'number' ? daten.rating : null,
    anzahl_gesamt: Number(daten.userRatingCount) || 0,
    bewertungen,
  };
}

const ergebnis = await holen();
mkdirSync(dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, JSON.stringify(ergebnis, null, 2) + '\n');

console.log(
  `\n  ✓ ${ergebnis.bewertungen.length} Bewertung(en) geholt` +
  (ergebnis.anzahl_gesamt ? ` — Profil hat ${ergebnis.anzahl_gesamt} insgesamt` : '') +
  (ergebnis.schnitt ? `, Schnitt ${ergebnis.schnitt}` : '') +
  `\n    → data/bewertungen.json\n` +
  `\n  Naechster Schritt: node scripts/bewertungen-bauen.mjs\n`
);
