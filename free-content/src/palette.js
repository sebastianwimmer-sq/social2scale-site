/**
 * Leitet die zwei Farbwelten aus ihren Formularangaben ab.
 * Rein: keine Bindings, kein I/O.
 *
 * WICHTIG (Spec §6, design/ENTSCHEIDUNG.md): Look B ist das TYPO-/LAYOUT-System,
 * NICHT die Farbe. Belegt in design/b-hell.png und b-salbei.png — dieselbe
 * B-Struktur traegt auch hell. Wer "ruhig/hell" angibt, bekommt B in Creme,
 * kein Anthrazit. Die zwei Farbwelten sind dieselbe Struktur in zwei Paletten,
 * nicht zwei Looks.
 */

import { ACCENT_MIN_CONTRAST } from './constants.js';

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Werte 1:1 aus den gerenderten Belegen in design/ — nicht neu erfunden.
 * Pruefbar: jeder Hex hier kommt in design/looks.html, ENTSCHEIDUNG.md,
 * README.md oder render.cjs vor. Der Test "nutzt ausschliesslich Farben aus
 * den gerenderten Design-Belegen" haelt das fest.
 *
 * Eine zweite dunkle Welt ("Tinte") stand mal hier, mit Werten, die in design/
 * NICHT vorkommen — sie waere ueber "dunkel"/"edel" an echte Besucherinnen
 * gegangen, ohne dass die Palette je jemand gesehen hat. Deshalb entfernt:
 * lieber eine dunkle Welt weniger als eine ungepruefte.
 */
const WELTEN = {
  creme:   { id: 'creme',   name: 'Creme',    paper: '#F4F0E9', ink: '#23201C', inkSoft: '#6B645A', accent: '#C2410C', rule: 'rgba(35,32,28,.14)' },
  salbei:  { id: 'salbei',  name: 'Salbei',   paper: '#EDF1EC', ink: '#1B241F', inkSoft: '#5F6B62', accent: '#2F6F5E', rule: 'rgba(27,36,31,.14)' },
  papier:  { id: 'papier',  name: 'Papier',   paper: '#FBFBFC', ink: '#14161A', inkSoft: '#767C86', accent: '#2F6F5E', rule: 'rgba(20,22,26,.10)' },
  nacht:   { id: 'nacht',   name: 'Nacht',    paper: '#0E1013', ink: '#F2F4F3', inkSoft: 'rgba(242,244,243,.62)', accent: '#D9FF3D', rule: 'rgba(242,244,243,.16)' },
};

/**
 * Welche zwei Welten zu welcher Stimmung. Immer ein Paar mit echtem Kontrast —
 * zwei fast gleiche Welten waeren kein Umschalter, sondern eine Attrappe.
 * Dunkle Stimmungen fuehren mit Nacht und bekommen eine helle Gegenwelt zum
 * Umschalten — dieselbe Form wie "kraftvoll".
 */
const NACH_STIMMUNG = {
  ruhig:      ['creme', 'salbei'],
  natuerlich: ['salbei', 'creme'],
  hell:       ['papier', 'creme'],
  freundlich: ['papier', 'salbei'],
  kraftvoll:  ['nacht', 'creme'],
  dunkel:     ['nacht', 'papier'],
  edel:       ['nacht', 'salbei'],
};

/** Standard, wenn die Stimmung nichts sagt, das wir kennen. */
const STANDARD = ['creme', 'nacht'];

function normStimmung(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/ü/g, 'ue').replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ß/g, 'ss');
}

/** Ihre Wunschfarbe zaehlt nur, wenn sie ein brauchbarer Hex ist. */
function accentOderNull(farbe) {
  const v = String(farbe ?? '').trim();
  return HEX.test(v) ? v.toLowerCase() : null;
}

/** Ein Kanal linearisiert, nach WCAG 2.x. */
function kanalLinear(wert8bit) {
  const s = wert8bit / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative Leuchtdichte eines #rrggbb, nach WCAG 2.x. */
function luminanz(hex) {
  const r = kanalLinear(parseInt(hex.slice(1, 3), 16));
  const g = kanalLinear(parseInt(hex.slice(3, 5), 16));
  const b = kanalLinear(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Kontrastverhaeltnis zweier #rrggbb nach WCAG 2.x — 1 (gleich) bis 21 (Schwarz/Weiss).
 * Symmetrisch: die Reihenfolge der Argumente ist egal.
 * @returns {number}
 */
export function contrastRatio(a, b) {
  const la = luminanz(a);
  const lb = luminanz(b);
  const hell = Math.max(la, lb);
  const dunkel = Math.min(la, lb);
  return (hell + 0.05) / (dunkel + 0.05);
}

/**
 * @returns {[object, object]} immer genau zwei Paletten
 */
export function derivePalettes(stimmung, farbe) {
  const s = normStimmung(stimmung);
  const paar = NACH_STIMMUNG[s] ?? STANDARD;
  const wunsch = accentOderNull(farbe);

  // Die Wunschfarbe faerbt NUR den Akzent, nie Grund oder Typo: sonst kippt der
  // Kontrast und ihr Content wird unlesbar. Sie waehlt eine Farbe, nicht ein Design.
  return paar.map((key) => {
    const welt = WELTEN[key];
    // Pro Welt entscheiden: derselbe Wunsch kann auf Nacht tragen und auf Creme
    // verschwinden — die beiden Welten haben verschiedene Gruende. Traegt er nicht,
    // behaelt die Welt ihren eigenen, gepruefen Akzent. Ein stiller Rueckfall auf
    // etwas Lesbares ist besser als eine Wahl zu ehren, die ihr Bild zerstoert:
    // sie meldet das nicht, sie kommt nur nicht wieder.
    const traegt = wunsch !== null && contrastRatio(wunsch, welt.paper) >= ACCENT_MIN_CONTRAST;
    return traegt ? { ...welt, accent: wunsch } : { ...welt };
  });
}
