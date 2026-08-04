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
  { schluessel: 'results', text: 'Ergebnisse', href: '/results/' },
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
  const aktionen = AKTIONEN.map(
    (a) => `      <a class="nav-soft" href="${pfad(a.href, aktiv)}">${a.text}</a>`
  ).join('\n');
  // Login gehoert in die Shell, nicht in einzelne Dateien: bis zum 29.07. hatte
  // ihn NUR die Startseite in der Desktop-Leiste.
  const login = `      <a class="nav-login" href="${LOGIN}" aria-label="Login zum Kundenbereich"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Login</a>`;
  return `      <ul class="nav-links">\n${eintraege}\n      </ul>\n${aktionen}\n${login}`;
}

export function mobilMenue(aktiv) {
  const eintraege = PUNKTE.map(
    (p) =>
      `    <a class="m-link" href="${pfad(p.href, aktiv)}"${aktuell(p.schluessel, aktiv)}>${p.text}</a>`
  ).join('\n');
  const aktionen = AKTIONEN.map(
    (a) => `    <a class="m-link" href="${pfad(a.href, aktiv)}">${a.text}</a>`
  ).join('\n');
  return `${eintraege}\n${aktionen}\n    <a class="m-link" href="${LOGIN}" style="color:var(--emerald,#00B888);font-weight:600">Login · Mein Bereich</a>`;
}

export function fusszeile(aktiv) {
  const eintraege = [...PUNKTE, ...FOOTER_EXTRA].map(
    (p) => `          <li><a href="${pfad(p.href, aktiv)}">${p.text}</a></li>`
  ).join('\n');
  return `          <li><a href="${LOGIN}">Login · Mein Bereich</a></li>\n${eintraege}`;
}
