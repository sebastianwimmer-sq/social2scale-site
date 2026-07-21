/**
 * Gemeinsame Text-/Struktur-Konstanten fuer die Build- und Reveal-Seiten
 * (`/r/:token`). Rein: keine Bindings, kein I/O — nur Konstanten, damit
 * result.js (und die Reveal-/Fehler-Arbeit in Plan 3 Task 4/5) denselben
 * Text nicht zweimal pflegen.
 */

import { FRAME_IDS } from '../templates/frames.js';

/** Reihenfolge = Render-Reihenfolge in render.js. Re-Export statt Kopie (DRY). */
export { FRAME_IDS };

/**
 * Fortschritts-Text, wie ihn der Build-Prototyp zeigt (design/prototypes/build.html).
 * Der ECHTE Fortschrittstext kommt zur Laufzeit aus buildStatus().step
 * (server-seitig gesetzt, siehe generate.js SCHRITTE) — STEPS liefert hier nur
 * die Anfangs-Kopie, bevor die erste Antwort von /api/status da ist.
 */
export const STEPS = [
  { at: 0, text: 'Wir lesen deine Marke …' },
  { at: 1, text: 'Deine Texte entstehen …' },
  { at: 3, text: 'Deine Farbwelten entstehen …' },
  { at: 5, text: 'Wir setzen deinen Feed …' },
  { at: 8, text: 'Fertig — scroll dich rein.' },
];

/**
 * 9 Kacheln fuer das 3x3-IG-Raster (Look des Prototyps). Nur die ersten drei
 * (Index 0-2) bekommen ein echtes Bild (f-0-s1..s3) — die restlichen 6 sind
 * reine Deko-Kacheln, sonst wuerde die Seite ein volles Raster vortaeuschen,
 * das wir gar nicht rendern. Sie bleiben deshalb dauerhaft dekorativ
 * (ehrlicher als eine falsche "fertig"-Kachel, vgl. generate.js: "ein
 * geschaetzter Balken ist ein gelogener Balken").
 */
export const TILE_LABELS = [
  'Dein Thema', 'Warum jetzt?', '3 Schritte',
  'Zitat', 'Vorher / Nachher', 'Deine Frage?',
  'Einblick', 'Über dich', 'Nächster Schritt',
];

/** Ziel des Erstgespraechs bei einer Moderationsablehnung — dieselbe Adresse wie
 *  in reveal.js/index.js (ANFRAGE_URL), hier nicht importiert, um copy.js frei
 *  von Modulabhaengigkeiten zu halten (reiner Text-/Struktur-Baustein). */
const ANFRAGE_URL = 'https://social2scale.com/anfrage/';

/**
 * Handlungsorientierte Fehlerkopie (Spec §9: die Handlung benennen, nicht die
 * Ursache) — ein Eintrag pro `reason` aus `nextAction()` (result.js).
 *
 * `buildStatus()` (generate.js) liefert state:'failed' fuer JEDEN Fehlerfall,
 * unterscheidet aber ueber `grund`/fail_reason (migrate-v14.sql) Moderation von
 * Render-Fehlern. Der Unterschied ist NICHT kosmetisch: eine Ablehnung ist eine
 * Entscheidung ueber das THEMA — "nochmal versuchen" wuerde dasselbe Thema
 * wieder einreichen und denselben Reject bekommen, also eine Schleife statt
 * eines Auswegs. Ein Render-Fehler ist transient — Retry ist hier die richtige
 * Handlung, aber NICHT durch Neuladen von /c/<token> (der Token kann bereits
 * verbraucht sein), sondern ueber einen frischen Eintritt am Formular.
 */
export const ERROR_COPY = {
  moderation: {
    title: 'Lass uns kurz persönlich sprechen.',
    body: 'Dieses Thema können wir leider nicht automatisch aufbauen — lass uns kurz persönlich sprechen.',
    ctaHref: ANFRAGE_URL,
    ctaLabel: 'Kurz sprechen',
  },
  render: {
    title: 'Nicht deine Schuld.',
    body: "Da ist beim Bauen etwas schiefgelaufen — nicht deine Schuld. Probier's gleich nochmal.",
    ctaHref: '/',
    ctaLabel: 'Nochmal eintragen',
  },
  not_found: {
    title: 'Diesen Link kennen wir nicht.',
    body: 'Trag dich einfach nochmal ein — dauert nur eine Minute.',
    ctaHref: '/',
    ctaLabel: 'Zum Formular',
  },
  timeout: {
    title: 'Das dauert länger als sonst.',
    body: 'Wir schicken dir das Ergebnis per Mail, sobald es fertig ist.',
    ctaHref: '',
    ctaLabel: '',
  },
};

/**
 * Reveal-Copy (Plan 3 Task 4) — ergebnis-/loesungsorientiert aufgebaut:
 * Ergebnis rahmen (head/headAccent: "Das ist dein Feed") -> das echte Problem
 * benennen (offerSub: monatlich konsistent posten schafft kaum jemand allein)
 * -> das Paket als Loesung -> CTA. Basis: design/prototypes/reveal.html,
 * offerHead/offerSub neu formuliert (Prototyp hatte dort nur den frueheren
 * "Feed freischalten"-Digistore-Aufhaenger, den es in Plan 3 noch nicht gibt).
 */
export const REVEAL = {
  eyebrow: 'social2scale · dein Ergebnis',
  head: 'Fertig. Das ist',
  headAccent: 'dein Feed.',
  sub: 'Zwei Farbwelten, fertig zum Posten. Wähl deine — und sieh, wie sie wirkt.',
  offerHead: 'Und in vier Wochen wieder?',
  offerSub:
    'Diese Vorschau zeigt, was für deine Marke möglich ist — aber monatlich konsistent posten ' +
    'schafft kaum jemand allein. Dein Paket übernimmt genau das: beide Farbwelten, alle Vorlagen ' +
    'und Texte, jeden Monat neu, ohne Wasserzeichen.',
  ctaPrimary: 'Erstgespräch buchen',
  ctaSecondary: 'Vorschau speichern',
  wmNote: 'Deine Gratis-Vorschau trägt ein dezentes s2s-Wasserzeichen. Kein Kauf nötig, um sie zu behalten.',
};
