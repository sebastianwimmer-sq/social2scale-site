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
import { neuesteId } from './news.mjs';

// (1) neben „News“: steht bei jedem neuen Besuch, bis in diesem Besuch die News geoeffnet wurden (Sebi 19.11.;
// news-zaehler.js, sessionStorage). Ohne JavaScript bleibt er versteckt. Stil inline, weil nicht jede Seite seite.css laedt.
const ZAEHLER_TEXT = { de: 'neue Ausgabe', en: 'new issue' };
const zaehler = (p, sprache) => {
  const id = p.zaehler ? neuesteId() : '';
  if (!id) return '';
  return `<span class="nz" data-news="${id}" hidden style="color:var(--emerald-soft,#1FC998);font-weight:600;margin-left:4px">`
    + `<span aria-hidden="true">(1)</span><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">, ${ZAEHLER_TEXT[sprache]}</span></span>`;
};
const ZAEHLER_SKRIPT = '<script src="/news-zaehler.js" defer></script>';

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
  { schluessel: 'leistungen', text: 'Leistungen', href: '/leistungen/' },   // 16.11.2026: Leistung statt Preis (Sebi)
  { schluessel: 'ablauf', text: 'Ablauf', href: '/ablauf/' },
  { schluessel: 'for-you', text: 'Für wen', href: '/for-you/' },
  { schluessel: 'results', text: 'Prüf uns', href: '/results/' },
  { schluessel: 'news', text: 'News', href: '/news/', zaehler: true },   // 19.11.2026: Wochen-News mit (1), Sebi
  { schluessel: 'about', text: 'Über uns', href: '/about/' },
];

// Englische Schwestern (17.10.2026, lib/sprachen.mjs). Gleiche Schluessel,
// damit aria-current auf beiden Sprachen an derselben Stelle sitzt.
const PUNKTE_EN = [
  { schluessel: 'leistungen', text: 'Services', href: '/en/services/' },
  { schluessel: 'ablauf', text: 'Process', href: '/en/process/' },
  { schluessel: 'for-you', text: 'Who it’s for', href: '/en/for-you/' },
  { schluessel: 'results', text: 'Proof', href: '/en/results/' },
  { schluessel: 'news', text: 'News', href: '/en/news/', zaehler: true },
  { schluessel: 'about', text: 'About us', href: '/en/about/' },
];

// Keine Aktionen neben dem Menue mehr: seit #40 (16.10.2026, „ein Knopf, ein
// Funnel“) fuehrt nur noch der Haupt-Knopf in den Funnel. Die Seiten wurden
// damals von Hand bereinigt, die Quelle hier nicht — jeder Bau haette den
// Link „Gratis-Vorschau“ zurueckgebracht (gefunden 17.10.2026).

const TEXTE = {
  de: { punkte: PUNKTE_DE, start: '/' },
  en: { punkte: PUNKTE_EN, start: '/en/' },
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

// `seite` ist der URL-Pfad der Seite (z. B. '/leistungen/'); daraus kommen
// Sprache und Umschalter-Ziel (lib/sprachen.mjs).
const spracheVon = (seite) => schwester(seite)?.sprache ?? (seite.startsWith('/en/') ? 'en' : 'de');

export function navigation(aktiv, seite = '/') {
  const sprache = spracheVon(seite);
  const eintraege = TEXTE[sprache].punkte.map(
    (p) =>
      `        <li><a href="${pfad(p.href, aktiv, sprache)}"${aktuell(p.schluessel, aktiv)}>${p.text}${zaehler(p, sprache)}</a></li>`
  ).join('\n');
  const wechsel = umschalter(seite, 'sprache');
  return `      <ul class="nav-links">\n${eintraege}\n      </ul>${wechsel ? `\n      ${wechsel}` : ''}\n      ${ZAEHLER_SKRIPT}`;
}

export function mobilMenue(aktiv, seite = '/') {
  const sprache = spracheVon(seite);
  const eintraege = TEXTE[sprache].punkte.map(
    (p) =>
      `    <a class="m-link" href="${pfad(p.href, aktiv, sprache)}"${aktuell(p.schluessel, aktiv)}>${p.text}${zaehler(p, sprache)}</a>`
  ).join('\n');
  // Kein Umschalter hier: er steht auch auf dem Handy sichtbar in der Leiste.
  return eintraege;
}

// ── Footer (19.11.2026, Sebi: „footer komplett ohne ki slop … aufs aktuelle website level“, Richtung B + C) ──
// Der ganze Footer kommt von hier, auf jede Seite mit Footer (build-pages.mjs, Marker SHELL:FUSS). Links: die letzte
// Frage mit zwei Wegen, rechts eure Karte; darunter drei Spalten, ganz unten Logo, © und Rechtliches.
// Icons sind eigene Zeichnungen (fuss.css): ein Strich, Verlauf der Marke, die drei Balken aus dem Logo.
const FUSS = {
  de: {
    frage: 'Noch eine Frage? <em>Frag uns direkt.</em>', satz: 'Sebi und Phil antworten selbst, ohne Team dazwischen.',
    wege: [
      { href: '/gratis/', b: 'Kostenlos starten', s: 'Vorschau oder Erstgespräch mit Phil', ic: 'tag' },   // ein Knopf, ein Funnel (#40)
      { href: '/news/', b: 'News der Woche', s: 'jeden Mittwoch neu', ic: 'news', zaehler: true },
    ],
    karte: 'Social-Media-Betreuung, persönlich', kopie: 'E-Mail-Adresse kopieren', kopiert: 'E-Mail-Adresse kopiert',
    ig: 'social2scale auf Instagram', neu: 'neue Ausgabe',
    spalten: [
      ['Was wir machen', [['Leistungen', '/leistungen/', 'leistungen'], ['Ablauf', '/ablauf/', 'ablauf'], ['Für wen', '/for-you/', 'for-you']]],
      ['Wer wir sind', [['Über uns', '/about/', 'about'], ['Prüf uns', '/results/', 'results'], ['News', '/news/', 'news']]],
      ['Selbst ausprobieren', [['Gratis-Vorschau', '/gratis/'], ['Wissen', '/wissen/', 'wissen'], ['Fragen und Antworten', '/#faq']]],
    ],
    recht: [['Impressum', '/impressum/'], ['Datenschutz', '/datenschutz/']], rechtLabel: 'Rechtliches', seitenLabel: 'Seiten',
  },
  en: {
    frage: 'Any other questions? <em>Ask us directly.</em>', satz: 'Sebi and Phil answer themselves, with no team in between.',
    wege: [
      { href: '/en/free/', b: 'Get started free', s: 'Preview or intro call with Phil', ic: 'tag' },
      { href: '/en/news/', b: 'News of the week', s: 'new every Wednesday', ic: 'news', zaehler: true },
    ],
    karte: 'Social media management, in person', kopie: 'Copy email address', kopiert: 'Email address copied',
    ig: 'social2scale on Instagram', neu: 'new issue',
    spalten: [
      ['What we do', [['Services', '/en/services/', 'leistungen'], ['Process', '/en/process/', 'ablauf'], ['Who it’s for', '/en/for-you/', 'for-you']]],
      ['Who we are', [['About us', '/en/about/', 'about'], ['Proof', '/en/results/', 'results'], ['News', '/en/news/', 'news']]],
      ['Try it yourself', [['Free preview', '/en/free/'], ['Knowledge', '/en/knowledge/', 'wissen'], ['Questions and answers', '/en/#faq']]],
    ],
    recht: [['Impressum', '/impressum/'], ['Privacy', '/en/privacy/']], rechtLabel: 'Legal', seitenLabel: 'Pages',
  },
};

const ICONS = {
  mail: '<path d="M14 5.5H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V12"/><path d="M3.6 7.4l6.9 5.3a2.4 2.4 0 0 0 3 0l2.2-1.7"/><g class="pf"><path d="M17 3h4v4"/><path d="M21 3l-4.6 4.6"/></g>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12.5" r="4"/><path class="bar" d="M15.4 7.6v-.4"/><path class="bar" d="M16.9 7.6v-1.2"/><path class="bar" d="M18.4 7.6v-2"/>',
  tag: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path class="bar" d="M8 18v-2"/><path class="bar" d="M12 18v-3.5"/><path class="bar" d="M16 18v-5"/>',
  news: '<path d="M5 4h11a3 3 0 0 1 3 3v10a3 3 0 0 0 3 3H8a3 3 0 0 1-3-3z"/><path d="M19 9h2v8"/><path class="bar" d="M9 15v-1"/><path class="bar" d="M12 15v-2.5"/><path class="bar" d="M15 15v-4"/>',
};
const ic = (name) => `<svg class="s2f-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

/** Ganzer Footer einer Seite. `seite` ist der URL-Pfad, `aktiv` der Menue-Schluessel (aria-current). */
export function fuss(aktiv, seite = '/') {
  const sprache = seite.startsWith('/en/') ? 'en' : 'de';
  const L = FUSS[sprache];
  const id = neuesteId();
  const nz = (z) => (z && id ? `<span class="nz" data-news="${id}" hidden> (1)<span class="s2f-sr">, ${L.neu}</span></span>` : '');
  const ziel = (href) => pfad(href, aktiv, sprache);
  const wege = L.wege.map((w) => `<li><a class="s2f-weg" href="${ziel(w.href)}">${ic(w.ic)}<span><b>${w.b}${nz(w.zaehler)}</b><small>${w.s}</small></span></a></li>`).join('');
  const spalten = L.spalten.map(([titel, links]) => `<div><h2>${titel}</h2><ul>${links.map(([text, href, schl]) =>
    `<li><a href="${ziel(href)}"${schl && schl === aktiv ? ' aria-current="page"' : ''}>${text}</a></li>`).join('')}</ul></div>`).join('');
  const recht = L.recht.map(([text, href]) => `<a href="${href}">${text}</a>`).join('');
  return `<footer class="site-footer s2f"><svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><linearGradient id="s2f-flow" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1FC998"/><stop offset="1" stop-color="#46BEEA"/></linearGradient></svg>
  <div class="s2f-wrap">
    <div class="s2f-oben">
      <div>
        <p class="s2f-frage">${L.frage}</p>
        <p class="s2f-satz">${L.satz}</p>
        <ul class="s2f-wege">${wege}</ul>
      </div>
      <div class="s2f-schale"><div class="s2f-karte"><span class="s2f-glanz" aria-hidden="true"></span>
        <div class="s2f-kk"><img src="/assets/s2s-t.webp" alt="social2scale" width="52" height="26" loading="lazy" decoding="async"><span class="s2f-duo"><picture><source type="image/webp" srcset="/assets/founder-sebastian-avatar-192.webp"><img src="/assets/founder-sebastian-avatar-192.jpg" alt="Sebi" width="44" height="44" loading="lazy" decoding="async"></picture><picture><source type="image/webp" srcset="/assets/founder-philipp-avatar-192.webp"><img src="/assets/founder-philipp-avatar-192.jpg" alt="Phil" width="44" height="44" loading="lazy" decoding="async"></picture></span></div>
        <p class="s2f-name">Sebi &amp; Phil<small>${L.karte}</small></p>
        <div class="s2f-kf"><span class="s2f-mail"><a href="mailto:info@social2scale.com">${ic('mail')}info@social2scale.com</a><button class="s2f-kopie" type="button" hidden data-mail="info@social2scale.com" data-ok="${L.kopiert}" aria-label="${L.kopie}"><svg class="s2f-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g class="blatt"><rect x="8" y="8" width="12" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-7A2.5 2.5 0 0 0 4 5.5v9A2.5 2.5 0 0 0 6.5 17H8"/></g><path class="haken" d="M5 12.5l4.5 4.5L19 7.5"/></svg></button></span><a href="https://instagram.com/social2scale" target="_blank" rel="noopener" aria-label="${L.ig}">${ic('ig')}@social2scale</a><span class="s2f-sr" role="status" aria-live="polite"></span></div>
      </div></div>
    </div>
    <nav class="s2f-mitte" aria-label="${L.seitenLabel}">${spalten}</nav>
    <div class="s2f-unten"><div class="s2f-l"><img src="/assets/s2s-t.webp" alt="" width="44" height="22" loading="lazy" decoding="async"><span>© <span id="yr">2026</span> social2scale</span></div><nav aria-label="${L.rechtLabel}">${recht}</nav></div>
  </div>
  <link rel="stylesheet" href="/fuss.css"><script src="/fuss.js" defer></script>${id ? '<script src="/news-zaehler.js" defer></script>' : ''}
</footer>`;
}
