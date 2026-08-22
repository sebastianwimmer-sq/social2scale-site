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
 *
 * IM ZWEIFEL STRENG — und warum das die guenstigere Seite ist:
 *
 * Bindestrich-Komposita werden abgelehnt ('Anti-Drogen-Aufklaerung',
 * 'Drogen-Praevention'). Absicht: eine Wortliste kann 'Drogen-Praevention'
 * nicht von 'Drogen-Verkauf' trennen — beides ist "Drogen-" + Substantiv.
 * Dasselbe bei 'Krebs-Beratungsstelle' vs. 'Krebs-Heilung'. Es gibt keine
 * Regex, die beide Seiten richtig macht.
 *
 * Die Ablehnung loest einen Founder-Alarm aus (Spec §5a), ein Mensch schaut
 * drauf und meldet sich bei einer zu Unrecht Abgelehnten. Ein durchgerutschter
 * HWG-Verstoss mit unserem Logo loest gar nichts aus. Deshalb streng: ein
 * Fehlalarm kostet eine E-Mail von einem Menschen, ein Durchrutscher kostet
 * unseren Namen unter dem Rechtsproblem einer Fremden.
 *
 * Eine frueher hier eingebaute Bindestrich-Ausnahme machte den Bindestrich zur
 * Umgehung: 'Schmerzfrei-Programm garantiert' lief damit durch — deutsche
 * Coach-Standardsprache. Nicht wieder einbauen. Eine Ausnahmeliste fuer
 * Negations-Praefixe ('Anti-', 'Kein-') waere dieselbe unmoegliche Trennung
 * in neuem Kostuem.
 */

/**
 * Wortgrenzen fuer deutsche Freitexte. Wie \b — mit EINER Korrektur:
 * \w ist ASCII, damit zaehlt jeder Umlaut als Grenze. '\bkrebs\b' trifft
 * deshalb in 'Krebsaerzte' (eine Onkologie-Praxis!), waehrend
 * 'Krebsberatungsstelle' korrekt durchlaeuft. Umlaute und ss gehoeren also in
 * die Grenz-Klasse — das ist reine Fehlalarm-Vermeidung ohne Kehrseite.
 *
 * Der Bindestrich gehoert NICHT hinein: er ist und bleibt eine Grenze,
 * sonst ist jeder Trigger + '-' frei. Siehe Entscheidung oben.
 */
const UMLAUT = 'äöüÄÖÜß';
const VOR = `(?<![\\w${UMLAUT}])`;
const NACH = `(?![\\w${UMLAUT}])`;

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
  // 'hass[\s-]+auf': der Bindestrich ist hier Teil der Schreibweise, nicht der
  // Grenze — 'Hass-auf Frauen' ist dieselbe Aussage wie 'Hass auf Frauen'.
  { grund: 'hass', re: new RegExp(
      `${VOR}(?:hasse|hass[\\s-]+auf)${NACH}.{0,20}${VOR}(?:auslaender|ausländer|juden|muslime|schwule|frauen|maenner|männer)${NACH}`
      + `|${VOR}volksverhetz`, 'i',
  ) },
  { grund: 'sexuell',  re: stamm('escort|erotik|porno|sexcam|onlyfans|prostitu') },
  // 'Anti-AfD-Kampagne' wird abgelehnt: der Bindestrich ist eine Wortgrenze,
  // also greift der Stamm auch im Kompositum. Beabsichtigt — politischer
  // Content bleibt draussen, in welche Richtung er auch zeigt.
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
