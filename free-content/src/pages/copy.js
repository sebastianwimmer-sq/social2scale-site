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

/**
 * Minimaler, handlungsorientierter Fehlertext (Platzhalter fuer diesen Task —
 * Plan 3 Task 5 baut die volle, grundabhaengige Kopie aus).
 *
 * WICHTIG fuer Task 5: buildStatus() (generate.js) liefert AKTUELL nur
 * state:'failed' fuer JEDEN Fehlerfall. Moderationsablehnungen und technisches
 * Scheitern landen beide ueber markiereFehler() auf demselben DB-Status
 * 'failed' — es gibt keinen eigenen state:'moderation', der Grund ('moderation'
 * vs. 'render' vs. 'db') existiert nur im Rueckgabewert von generateFor(),
 * nicht im gepollten Status. Eine Unterscheidung im Build-Screen braucht
 * entweder ein zusaetzliches DB-Feld oder bleibt bei einer einzigen,
 * grundneutralen Fehlermeldung.
 */
export const ERROR_COPY = {
  default: {
    title: 'Puh, da ist etwas schiefgelaufen.',
    body: 'Meld dich kurz bei uns — wir kümmern uns sofort persönlich darum.',
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
