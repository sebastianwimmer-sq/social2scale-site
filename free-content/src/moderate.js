/**
 * Vorpruefung der Freitextfelder. Rein: keine Bindings, kein I/O.
 *
 * WARUM (Spec §5a): Jedes generierte Bild traegt UNSER Logo und ist damit eine
 * oeffentliche Aussage von social2scale. Wer hier "heilt in 4 Wochen" eintippt,
 * macht sein Rechtsproblem zu unserem.
 *
 * Das ist Schicht EINS. Schicht zwei ist der Compliance-Prompt in copy.js.
 * Eine Modell-Weigerung allein ist keine Absicherung — Modelle sind ueberredbar.
 *
 * Bewusst eine Wortliste statt KI: ein Moderations-Call waere eine weitere
 * Fehlerquelle im teuersten Pfad, und die Trefferliste hier ist ehrlich grob.
 * Sie faengt das Offensichtliche; den Rest faengt der Prompt.
 */

/**
 * Wortgrenzen fuer deutsche Freitexte. NICHT \b verwenden:
 *
 * 1. \b sieht '-' als Grenze. '\bdrogen\b' trifft damit mitten in
 *    'Anti-Drogen-Aufklaerung' — und wirft die Praeventions-Aufklaererin raus,
 *    weil sie benennt, WOGEGEN sie arbeitet. Der Bindestrich kehrt die
 *    Bedeutung um, genau deshalb darf er keine Grenze sein.
 * 2. \w ist ASCII. '\bkrebs\b' trifft deshalb auch in 'Krebsaerzte' (das 'ä'
 *    zaehlt als Grenze), waehrend 'Krebsberatungsstelle' korrekt durchlaeuft.
 *
 * Beide Faelle sind die Fehlalarm-Richtung: eine echte Kundin fliegt raus und
 * sagt uns nie, warum sie weg ist.
 */
const UMLAUT = 'äöüÄÖÜß';
const VOR = `(?<![\\w${UMLAUT}-])`;
const NACH = `(?![\\w${UMLAUT}-])`;

/** Ganzes Wort: vorne UND hinten begrenzt. */
const wort = (alternativen) => new RegExp(`${VOR}(?:${alternativen})${NACH}`, 'i');

/** Wortstamm: nur vorne begrenzt — 'querdenk' soll 'Querdenker' fangen. */
const stamm = (alternativen) => new RegExp(`${VOR}(?:${alternativen})`, 'i');

const MUSTER = [
  // Heilversprechen (HWG). Konjugationen gehoeren dazu: "ich heile deine
  // Schmerzen" ist der Normalfall einer HWG-widrigen Aussage, keine Umgehung.
  // KEIN 'heiler' — "Geistiger Heiler" ist eine echte Nische und ein
  // Substantiv, kein Versprechen. Ebenso muessen 'Heilpraktikerin',
  // 'Heilerziehungspfleger' und 'Heilfasten' durchlaufen.
  { grund: 'heilversprechen', re: wort(
      'heil(?:e|st|t|en|te|ten|ung)|geheilt'
      + '|linder(?:e|st|t|n|ung)'
      + '|schmerzfrei(?:e|es|er|en|em)?'
      + '|krebs|diagnose|therapier(?:e|st|t|en)',
  ) },
  { grund: 'hass', re: new RegExp(
      `${VOR}(?:hasse|hass auf)${NACH}.{0,20}${VOR}(?:auslaender|ausländer|juden|muslime|schwule|frauen|maenner|männer)${NACH}`
      + `|${VOR}volksverhetz`, 'i',
  ) },
  { grund: 'sexuell',  re: stamm('escort|erotik|porno|sexcam|onlyfans|prostitu') },
  // Bewusst OHNE Bindestrich-Ausnahme: 'Anti-AfD-Kampagne' ist politischer
  // Content und bleibt draussen — anders als bei 'illegal' kehrt der
  // Bindestrich die Kategorie hier nicht um.
  { grund: 'politik',  re: stamm('afd|npd|reichsbuerger|reichsbürger|querdenk') },
  { grund: 'illegal',  re: wort('drogen|kokain|waffen|betrug|geldwaesche|geldwäsche|schwarzarbeit') },
];

/**
 * @returns {{ok: true} | {ok: false, grund: string}}
 */
export function checkInput(clean) {
  const text = [clean?.branche, clean?.ziel].filter(Boolean).join(' \n ');
  if (!text.trim()) return { ok: true };

  for (const { grund, re } of MUSTER) {
    if (re.test(text)) return { ok: false, grund };
  }
  return { ok: true };
}
