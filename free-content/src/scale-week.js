/**
 * Scale Week im Befund des Reel-Checks. Wird beim Ausliefern eingesetzt und steht nie im abgelegten Befund
 * und nie im PDF: nach Fristende ist der Absatz von selbst weg. In die Mails kommt er bewusst nicht —
 * der Haken deckt den Befund, keine Werbung (§ 7 UWG).
 * Frist, Preis und Bedingungen wortgleich zu social2scale.com/scale-week/ (dort scale-week.js: START/ENDE).
 */
export const START = Date.parse('2026-11-22T00:00:00+01:00');
export const ENDE = Date.parse('2026-12-01T00:00:00+01:00');

export const istAktiv = (jetzt = Date.now()) => jetzt >= START && jetzt < ENDE;

const T = {
  de: {
    titel: 'Scale Week, bis 30. November',
    text: 'Buch dein Gespräch bis Montag, 30.\u00a0November, 23:59\u00a0Uhr. Startest du danach mit der Betreuung WACHSTUM, bauen wir dein Profil ohne Aufpreis auf. Das ist sonst ein eigenes Paket für 1.297,10\u00a0€. Mit BASIS bekommst du 300\u00a0Token dazu.',
    link: 'Alle Bedingungen', url: 'https://social2scale.com/scale-week/',
  },
  en: {
    titel: 'Scale Week, until 30 November',
    text: 'Book your call by Monday, 30\u00a0November, 11:59 pm (German time). Start with GROWTH afterwards and we build your profile at no extra cost. Otherwise that is its own package at €1,297.10. With BASIS you get 300\u00a0tokens on top.',
    link: 'All conditions', url: 'https://social2scale.com/en/scale-week/',
  },
};

export function absatz(sprache) {
  const t = T[sprache === 'en' ? 'en' : 'de'];
  return `<div data-scale-week style="margin:2px 0 4px;padding-top:14px;border-top:1px solid rgba(242,243,241,.16)">`
    + `<p style="margin:0 0 6px;color:#F2F3F1;font-weight:600">${t.titel}</p>`
    + `<p style="margin:0">${t.text} <a href="${t.url}" style="color:#F2F3F1;text-underline-offset:3px">${t.link}</a></p></div>`;
}

/** Vor den ersten Terminknopf im Weg „Sprich mit Phil“. Fehlt die Stelle, bleibt der Befund unverändert. */
export function einsetzen(html, sprache, jetzt = Date.now()) {
  if (!istAktiv(jetzt)) return html;
  const weg = html.indexOf("<div class='weg'>");
  const knopf = weg < 0 ? -1 : html.indexOf("<a class='knopf'", weg);
  return knopf < 0 ? html : html.slice(0, knopf) + absatz(sprache) + html.slice(knopf);
}
