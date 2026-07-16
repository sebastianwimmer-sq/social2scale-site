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

const MUSTER = [
  // Heilversprechen (HWG). Wortgrenzen sind Pflicht: "Heilpraktikerin" ist ein
  // Beruf, kein Versprechen — wer den ablehnt, wirft eine echte Kundin raus.
  { grund: 'heilversprechen', re: /\b(heilt|heilen|geheilt|heilung)\b|\blindert\b|\bschmerzfrei\b|\bkrebs\b|\bdiagnose\b|\btherapiert\b/i },
  { grund: 'hass',     re: /\b(hasse|hass auf)\b.{0,20}\b(auslaender|ausländer|juden|muslime|schwule|frauen|maenner|männer)\b|\bvolksverhetz/i },
  { grund: 'sexuell',  re: /\b(escort|erotik|porno|sexcam|onlyfans|prostitu)/i },
  { grund: 'politik',  re: /\b(afd|npd|reichsbuerger|reichsbürger|querdenk)/i },
  { grund: 'illegal',  re: /\b(drogen|kokain|waffen|betrug|geldwaesche|geldwäsche|schwarzarbeit)\b/i },
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
