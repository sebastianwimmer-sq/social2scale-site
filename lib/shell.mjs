/**
 * Einzige Quelle fuer Navigation, Mobil-Menue und Footer-Spalte "Agentur".
 *
 * Geaendert wird HIER — nie in den einzelnen HTML-Dateien. Danach
 * `node scripts/build-pages.mjs` laufen lassen, sonst passiert nichts.
 *
 * Hintergrund: vor der Zusammenfuehrung am 29.07.2026 war das Menue in vier
 * Dateien kopiert und auseinandergelaufen — about/ und for-you/ hatten
 * ueberhaupt keinen Punkt "Ergebnisse", nur die Startseite hatte den
 * Login-Eintrag in Mobil-Menue und Footer.
 */

// Menuepunkte in Anzeigereihenfolge, Stand der Startseite.
// `href` ist absolut, damit dieselbe Zeichenkette auf allen Seiten funktioniert;
// auf der Startseite werden Anker per `pfad()` wieder relativ gemacht.
const PUNKTE = [
  { schluessel: 'leistungen', text: 'Leistungen', href: '/#leistungen' },
  { schluessel: 'ablauf', text: 'Ablauf', href: '/#ablauf' },
  { schluessel: 'for-you', text: 'Für wen', href: '/for-you/' },
  { schluessel: 'results', text: 'Ergebnisse', href: '/results/' },
  { schluessel: 'about', text: 'Über uns', href: '/about/' },
  { schluessel: 'faq', text: 'FAQ', href: '/#faq' },
  // Kurzes Label mit Absicht: "Gratis-Vorschau" liess die Menueleiste bei
  // 1024px auf zwei Zeilen umbrechen. Im Mobil-Menue und im Footer ist Platz
  // fuer die lange Form.
  { schluessel: 'gratis', text: 'Gratis', href: '/#gratis' },
];

const LANG = { gratis: 'Gratis-Vorschau' };
const LOGIN = 'https://mein.social2scale.com';

// Auf der Startseite bleiben Anker relativ (#faq), sonst absolut (/#faq).
// Beides landet am selben Ziel, aber die absolute Form loest auf der
// Startseite einen unnoetigen Seitenwechsel aus.
const pfad = (href, aktiv) =>
  aktiv === 'start' && href.startsWith('/#') ? href.slice(1) : href;

const aktuell = (schluessel, aktiv) =>
  schluessel === aktiv ? ' aria-current="page"' : '';

export function navigation(aktiv) {
  const eintraege = PUNKTE.map(
    (p) =>
      `        <li><a href="${pfad(p.href, aktiv)}"${aktuell(p.schluessel, aktiv)}>${p.text}</a></li>`
  ).join('\n');
  return `      <ul class="nav-links">\n${eintraege}\n      </ul>`;
}

export function mobilMenue(aktiv) {
  const eintraege = PUNKTE.map(
    (p) =>
      `    <a class="m-link" href="${pfad(p.href, aktiv)}"${aktuell(p.schluessel, aktiv)}>${LANG[p.schluessel] || p.text}</a>`
  ).join('\n');
  return `${eintraege}\n    <a class="m-link" href="${LOGIN}" style="color:var(--emerald,#00B888);font-weight:600">Login · Mein Bereich</a>`;
}

export function fusszeile(aktiv) {
  const eintraege = PUNKTE.map(
    (p) => `          <li><a href="${pfad(p.href, aktiv)}">${LANG[p.schluessel] || p.text}</a></li>`
  ).join('\n');
  return `          <li><a href="${LOGIN}">Login · Mein Bereich</a></li>\n${eintraege}`;
}
