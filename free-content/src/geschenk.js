/**
 * Geschenk zum Reel-Check (Sebi 24.11.2026): EINEN Baustein aus dem Profil-Setup wählen, Phil bringt ihn fertig ins Gespräch mit.
 * Die Wahl ist nur ein Kalenderlink mit Text in Phils Vorbereitungsfeld (a1): kein Skript, keine Datenbank, keine Daten in der Adresse.
 * Wert = Anteil nach Aufwand am Profil-Setup (1.297,10 €), einzeln nicht kaufbar, deshalb nie ein Streichpreis.
 * Wird beim Ausliefern eingesetzt, steht nie im abgelegten Befund und nie im PDF.
 */
import { ERSTGESPRAECH_URL } from './constants.js';

// Erst auf true, wenn Phil weiß, was die Notiz im Kalender bedeutet: der Befund sagt sonst etwas zu, das niemand einlöst.
export const GESCHENK_LIVE = false;

const T = {
  de: {
    titel: 'Such dir ein Geschenk aus', unter: 'Phil bringt es fertig zu eurem Gespräch mit. Tipp an, was du haben möchtest, und wähl deinen Termin.', wert: 'Wert', frei: 'für dich 0 €',
    fuss: 'Der Wert ist unser Anteil nach Aufwand am Profil-Setup (1.297,10 €). Einzeln gibt es die Bausteine nicht zu kaufen.',
    notiz: (x) => `Ich habe meinen Reel-Befund. Mein Geschenk: ${x}. Mein Profil: @`,
    teile: [['Neue Bio und Namensfeld', '129 €'], ['Hashtags in drei Stufen', '89 €'], ['Farben und Ton', '69 €']],
  },
  en: {
    titel: 'Pick a gift', unter: 'Phil brings it along to your call, ready to use. Tap the one you want and choose a time.', wert: 'Worth', frei: '€0 for you',
    fuss: 'The value is our share, by effort, of the profile setup (€1,297.10). The parts are not sold separately.',
    notiz: (x) => `I have my reel report. My gift: ${x}. My profile: @`,
    teile: [['New bio and name field', '€129'], ['Hashtags in three tiers', '€89'], ['Colours and tone', '€69']],
  },
};

export function geschenkLink(sprache, name) {
  const notiz = T[sprache === 'en' ? 'en' : 'de'].notiz(name);
  return `${ERSTGESPRAECH_URL}?utm_source=reel-check&amp;utm_medium=geschenk&amp;a1=${encodeURIComponent(notiz)}`;
}

export function geschenk(sprache) {
  const t = T[sprache === 'en' ? 'en' : 'de'];
  const zeilen = t.teile.map(([name, wert]) => `<a href='${geschenkLink(sprache, name)}' style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 16px;min-height:48px;align-items:center;padding:10px 0;border-top:1px solid rgba(242,243,241,.16);color:#F2F3F1;text-decoration:none">`
    + `<span style="font-weight:600;text-decoration:underline;text-decoration-color:rgba(31,201,152,.8);text-underline-offset:4px">${name}</span><span style="color:#A4A6A1">${t.wert} ${wert}, <b style="color:#1FC998;font-weight:600">${t.frei}</b></span></a>`).join('');
  return `<div data-geschenk style="margin:2px 0 4px;padding-top:14px;border-top:1px solid rgba(242,243,241,.16)"><p style="margin:0 0 6px;color:#F2F3F1;font-weight:600">${t.titel}</p>`
    + `<p style="margin:0 0 12px">${t.unter}</p>${zeilen}<p style="margin:10px 0 0;font-size:.86em">${t.fuss}</p></div>`;
}

/** Im Weg „Sprich mit Phil“, vor Scale Week oder Terminknopf. Fehlt die Stelle, bleibt der Befund unverändert. */
export function geschenkEinsetzen(html, sprache, live = GESCHENK_LIVE) {
  if (!live) return html;
  const weg = html.indexOf("<div class='weg'>");
  if (weg < 0) return html;
  const stellen = [html.indexOf('<div data-scale-week', weg), html.indexOf("<a class='knopf'", weg)].filter((x) => x >= 0);
  const i = stellen.length ? Math.min(...stellen) : -1;
  return i < 0 ? html : html.slice(0, i) + geschenk(sprache) + html.slice(i);
}
