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

const HEX = /^#[0-9a-f]{6}$/i;

/** Werte 1:1 aus den gerenderten Belegen in design/ — nicht neu erfunden. */
const WELTEN = {
  creme:   { id: 'creme',   name: 'Creme',    paper: '#F4F0E9', ink: '#23201C', inkSoft: '#6B645A', accent: '#C2410C', rule: 'rgba(35,32,28,.14)' },
  salbei:  { id: 'salbei',  name: 'Salbei',   paper: '#EDF1EC', ink: '#1B241F', inkSoft: '#5F6B62', accent: '#2F6F5E', rule: 'rgba(27,36,31,.14)' },
  papier:  { id: 'papier',  name: 'Papier',   paper: '#FBFBFC', ink: '#14161A', inkSoft: '#767C86', accent: '#2F6F5E', rule: 'rgba(20,22,26,.10)' },
  nacht:   { id: 'nacht',   name: 'Nacht',    paper: '#0E1013', ink: '#F2F4F3', inkSoft: 'rgba(242,244,243,.62)', accent: '#D9FF3D', rule: 'rgba(242,244,243,.16)' },
  tinte:   { id: 'tinte',   name: 'Tinte',    paper: '#14171C', ink: '#EFF2F4', inkSoft: 'rgba(239,242,244,.60)', accent: '#7DD3A0', rule: 'rgba(239,242,244,.16)' },
};

/**
 * Welche zwei Welten zu welcher Stimmung. Immer ein Paar mit echtem Kontrast —
 * zwei fast gleiche Welten waeren kein Umschalter, sondern eine Attrappe.
 */
const NACH_STIMMUNG = {
  ruhig:      ['creme', 'salbei'],
  natuerlich: ['salbei', 'creme'],
  hell:       ['papier', 'creme'],
  freundlich: ['papier', 'salbei'],
  kraftvoll:  ['nacht', 'creme'],
  dunkel:     ['nacht', 'tinte'],
  edel:       ['tinte', 'papier'],
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
    return wunsch ? { ...welt, accent: wunsch } : { ...welt };
  });
}
