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
import { schwester, umschalter } from './sprachen.mjs';

// Menuepunkte in Anzeigereihenfolge, Stand der Startseite.
// `href` ist absolut, damit dieselbe Zeichenkette auf allen Seiten funktioniert;
// auf der Startseite werden Anker per `pfad()` wieder relativ gemacht.
const PUNKTE_DE = [
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

// Englische Schwestern (17.10.2026, lib/sprachen.mjs). Gleiche Schluessel,
// damit aria-current auf beiden Sprachen an derselben Stelle sitzt.
const PUNKTE_EN = [
  { schluessel: 'preise', text: 'Pricing', href: '/en/pricing/' },
  { schluessel: 'ablauf', text: 'Process', href: '/en/process/' },
  { schluessel: 'for-you', text: 'Who it’s for', href: '/en/for-you/' },
  { schluessel: 'results', text: 'Proof', href: '/en/results/' },
  { schluessel: 'about', text: 'About us', href: '/en/about/' },
];

// Keine Aktionen neben dem Menue mehr: seit #40 (16.10.2026, „ein Knopf, ein
// Funnel“) fuehrt nur noch der Haupt-Knopf in den Funnel. Die Seiten wurden
// damals von Hand bereinigt, die Quelle hier nicht — jeder Bau haette den
// Link „Gratis-Vorschau“ zurueckgebracht (gefunden 17.10.2026).

// Im Footer darf es ausfuehrlicher sein — dort ist Platz und niemand scannt.
// "Leistungen" und "FAQ" bleiben Anker: dafuer gibt es keine eigenen Seiten.
// "Gratis-Vorschau" zeigte hier bis zum 04.08.2026 noch auf /#gratis, obwohl
// die Aktion oben schon auf /gratis/ umgestellt war — derselbe Menuepunkt
// fuehrte je nach Stelle woandershin, auf allen sechs Seiten.
const FOOTER_EXTRA_DE = [
  { text: 'Leistungen', href: '/#leistungen' },
  { text: 'FAQ', href: '/#faq' },
  { text: 'Gratis-Vorschau', href: '/gratis/' },
];
// Englisch 1:1 wie Deutsch (Sebi 23.10.2026): /en/free/ fuehrt in den englischen Funnel.
const FOOTER_EXTRA_EN = [
  { text: 'Services', href: '/en/#leistungen' },
  { text: 'FAQ', href: '/en/#faq' },
  { text: 'Free preview', href: '/en/free/' },
];

const TEXTE = {
  de: { punkte: PUNKTE_DE, footer: FOOTER_EXTRA_DE, start: '/' },
  en: { punkte: PUNKTE_EN, footer: FOOTER_EXTRA_EN, start: '/en/' },
};

// Kein Login-Eintrag (27.09.2026): Kundinnen kommen ausschliesslich ueber ihren
// persoenlichen Link in ihren Bereich. Ein Login-Knopf fuehrte zu einem Tor,
// dessen Passwort sie nicht kennen, und stoerte oben das Bild der Seite.

// Auf der Startseite bleiben Anker relativ (#faq), sonst absolut (/#faq).
// Beides landet am selben Ziel, aber die absolute Form loest auf der
// Startseite einen unnoetigen Seitenwechsel aus.
const pfad = (href, aktiv, sprache = 'de') => {
  const start = TEXTE[sprache].start;
  return aktiv === 'start' && href.startsWith(`${start}#`) ? href.slice(start.length) : href;
};

const aktuell = (schluessel, aktiv) =>
  schluessel === aktiv ? ' aria-current="page"' : '';

// `seite` ist der URL-Pfad der Seite (z. B. '/preise/'); daraus kommen
// Sprache und Umschalter-Ziel (lib/sprachen.mjs).
const spracheVon = (seite) => schwester(seite)?.sprache ?? (seite.startsWith('/en/') ? 'en' : 'de');

export function navigation(aktiv, seite = '/') {
  const sprache = spracheVon(seite);
  const eintraege = TEXTE[sprache].punkte.map(
    (p) =>
      `        <li><a href="${pfad(p.href, aktiv, sprache)}"${aktuell(p.schluessel, aktiv)}>${p.text}</a></li>`
  ).join('\n');
  const wechsel = umschalter(seite, 'sprache');
  return `      <ul class="nav-links">\n${eintraege}\n      </ul>${wechsel ? `\n      ${wechsel}` : ''}`;
}

export function mobilMenue(aktiv, seite = '/') {
  const sprache = spracheVon(seite);
  const eintraege = TEXTE[sprache].punkte.map(
    (p) =>
      `    <a class="m-link" href="${pfad(p.href, aktiv, sprache)}"${aktuell(p.schluessel, aktiv)}>${p.text}</a>`
  ).join('\n');
  // Kein Umschalter hier: er steht auch auf dem Handy sichtbar in der Leiste.
  return eintraege;
}

export function fusszeile(aktiv, seite = '/') {
  const sprache = spracheVon(seite);
  const { punkte, footer } = TEXTE[sprache];
  return [...punkte, ...footer].map(
    (p) => `          <li><a href="${pfad(p.href, aktiv, sprache)}">${p.text}</a></li>`
  ).join('\n');
}
