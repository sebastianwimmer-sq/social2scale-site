/**
 * Einzige Quelle fuer Navigation, Mobil-Menue und Footer-Spalte "Agentur".
 *
 * Geaendert wird HIER — nie in den einzelnen HTML-Dateien. Danach
 * `node scripts/build-pages.mjs` laufen lassen, sonst passiert nichts.
 *
 * Hintergrund: vor der Zusammenfuehrung am 29.07.2026 war das Menue in vier
 * Dateien kopiert und auseinandergelaufen — about/ und for-you/ hatten
 * ueberhaupt keinen Punkt "Ergebnisse", nur die Startseite hatte den
 * Login-Eintrag in Mobil-Menue und Footer (den gibt es seit 27.09.2026 nicht mehr).
 */

// Menuepunkte in Anzeigereihenfolge, Stand der Startseite.
// `href` ist absolut, damit dieselbe Zeichenkette auf allen Seiten funktioniert;
// auf der Startseite werden Anker per `pfad()` wieder relativ gemacht.
const PUNKTE = [
  // Fuenf statt acht. Untersuchungen zur Menuefuehrung nennen fuenf bis sieben
  // Punkte als Obergrenze; darueber steigt die Absprungrate. Vorher standen
  // hier acht, und drei davon ("Leistungen", "Preise", "Ablauf") beantworteten
  // fuer die Besucherin dieselbe Frage.
  // Jeder Punkt zeigt auf eine echte Seite. Bis zum 03.08.2026 war "Ablauf" ein
  // Anker auf die Startseite (/#ablauf) — der Menuepunkt versprach eine Seite
  // und lieferte einen Sprung. Seitdem gibt es /ablauf/ als Tiefe zu Kapitel 03.
  { schluessel: 'preise', text: 'Preise', href: '/preise/' },
  { schluessel: 'ablauf', text: 'Ablauf', href: '/ablauf/' },
  { schluessel: 'for-you', text: 'Für wen', href: '/for-you/' },
  { schluessel: 'results', text: 'Prüf uns', href: '/results/' },
  { schluessel: 'about', text: 'Über uns', href: '/about/' },
];

// Keine Rubriken, sondern Handlungen — stehen deshalb NEBEN dem Menue, nicht
// darin. "Gratis" war vorher ein Menuepunkt und damit gleich laut wie "Über uns".
//
// Zeigte bis zum 03.08.2026 auf /#gratis — den Anker auf der Startseite, der
// nur einen Knopf zur eigentlichen Seite enthaelt. /gratis/ existierte die
// ganze Zeit, war aus dem Menue aber nicht erreichbar: der Funnel-Einstieg
// kostete einen Umweg ueber die Startseite.
const AKTIONEN = [
  { schluessel: 'gratis', text: 'Gratis-Vorschau', href: '/gratis/' },
];

// Im Footer darf es ausfuehrlicher sein — dort ist Platz und niemand scannt.
// "Leistungen" und "FAQ" bleiben Anker: dafuer gibt es keine eigenen Seiten.
// "Gratis-Vorschau" zeigte hier bis zum 04.08.2026 noch auf /#gratis, obwohl
// die Aktion oben schon auf /gratis/ umgestellt war — derselbe Menuepunkt
// fuehrte je nach Stelle woandershin, auf allen sechs Seiten.
const FOOTER_EXTRA = [
  { text: 'Leistungen', href: '/#leistungen' },
  { text: 'FAQ', href: '/#faq' },
  { text: 'Gratis-Vorschau', href: '/gratis/' },
];

// Kein Login-Eintrag (27.09.2026): Kundinnen kommen ausschliesslich ueber ihren
// persoenlichen Link in ihren Bereich. Ein Login-Knopf fuehrte zu einem Tor,
// dessen Passwort sie nicht kennen, und stoerte oben das Bild der Seite.

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
  const aktionen = AKTIONEN.map(
    (a) => `      <a class="nav-soft" href="${pfad(a.href, aktiv)}">${a.text}</a>`
  ).join('\n');
  return `      <ul class="nav-links">\n${eintraege}\n      </ul>\n${aktionen}`;
}

export function mobilMenue(aktiv) {
  const eintraege = PUNKTE.map(
    (p) =>
      `    <a class="m-link" href="${pfad(p.href, aktiv)}"${aktuell(p.schluessel, aktiv)}>${p.text}</a>`
  ).join('\n');
  const aktionen = AKTIONEN.map(
    (a) => `    <a class="m-link" href="${pfad(a.href, aktiv)}">${a.text}</a>`
  ).join('\n');
  return `${eintraege}\n${aktionen}`;
}

export function fusszeile(aktiv) {
  const eintraege = [...PUNKTE, ...FOOTER_EXTRA].map(
    (p) => `          <li><a href="${pfad(p.href, aktiv)}">${p.text}</a></li>`
  ).join('\n');
  return eintraege;
}
