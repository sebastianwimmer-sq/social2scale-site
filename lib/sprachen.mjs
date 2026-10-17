/**
 * Einzige Quelle fuer die Zweisprachigkeit (DE/EN, 17.10.2026).
 *
 * Jede deutsche Besucherseite hat genau eine englische Schwester. Navigation,
 * Umschalter, hreflang, Sitemap und das Tor scripts/sprachen-check.mjs lesen
 * diese Liste — nie eine eigene.
 *
 * Warum echte Seiten statt Uebersetzung im Browser: KI-Crawler (ChatGPT,
 * Claude, Perplexity) und Suchmaschinen fuehren keine Klicks aus. Sie lesen
 * nur, was als HTML ausgeliefert wird. Design:
 * docs/superpowers/specs/2026-10-17-zweisprachig-design.md
 *
 * Nicht in der Liste (bleiben Deutsch): Impressum, Datenschutz (Rechtstexte,
 * genau einmal), danke/, onboarding/, links/, gratis/ (Funnel ist deutsch).
 * /anfrage/ ist nur eine Weiterleitung in den deutschen Funnel; /en/contact/
 * ist deshalb eine eigene englische Seite ohne Schwester.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

export const DOMAIN = 'https://social2scale.com';

// Pfade als URL (mit Schraegstrich am Ende); die Datei ist <pfad>index.html.
export const PAARE = [
  { de: '/', en: '/en/' },
  { de: '/preise/', en: '/en/pricing/' },
  { de: '/ablauf/', en: '/en/process/' },
  { de: '/for-you/', en: '/en/for-you/' },
  { de: '/results/', en: '/en/results/' },
  { de: '/about/', en: '/en/about/' },
  { de: '/wissen/', en: '/en/knowledge/' },
  { de: '/wissen/was-kostet-social-media-betreuung/', en: '/en/knowledge/social-media-management-cost/' },
  { de: '/wissen/wie-lange-bis-ergebnisse/', en: '/en/knowledge/how-long-until-results/' },
  { de: '/wissen/selbst-machen-oder-agentur/', en: '/en/knowledge/diy-or-agency/' },
  { de: '/wissen/social-media-agentur-auswaehlen/', en: '/en/knowledge/choosing-a-social-media-agency/' },
  { de: '/wissen/ablauf-zusammenarbeit/', en: '/en/knowledge/how-we-work-together/' },
];

export const datei = (pfad) => `${pfad.slice(1)}index.html`;

/** Sprache und Schwester eines Pfads, oder null, wenn er nicht zweisprachig ist. */
export function schwester(pfad) {
  for (const p of PAARE) {
    if (p.de === pfad) return { sprache: 'de', eigen: p.de, andere: p.en, paar: p };
    if (p.en === pfad) return { sprache: 'en', eigen: p.en, andere: p.de, paar: p };
  }
  return null;
}

/**
 * Sichtbarer Text einer Seite fuer den Aktualitaets-Stempel. Ausgenommen sind
 * Kopf, Skripte, Styles und die erzeugten Shell-/Sprach-Bloecke — die aendern
 * sich beim Bauen, nicht beim Schreiben.
 */
export function sichtbarerText(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<!-- (SHELL|SPRACHE):(\w+) -->[\s\S]*?<!-- \/\1:\2 -->/g, ' ')
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const textHash = (html) =>
  createHash('sha256').update(sichtbarerText(html)).digest('hex').slice(0, 16);

/** Meta-Zeile, die jede EN-Seite traegt: gegen welchen DE-Stand sie geschrieben ist. */
export const stempelZeile = (dePfad, deHtml) =>
  `<meta name="s2s-quelle" content="${dePfad}@${textHash(deHtml)}">`;

export const STEMPEL_MUSTER = /<meta name="s2s-quelle" content="([^"@]+)@([0-9a-f]{16})">/;

/** hreflang- und og:locale-Zeilen fuer den Kopf; leer, solange die Schwester fehlt. */
export function kopfZeilen(pfad, wurzel = '.') {
  const s = schwester(pfad);
  if (!s || !existsSync(`${wurzel}/${datei(s.andere)}`)) return '';
  const { de, en } = s.paar;
  return [
    `<link rel="alternate" hreflang="de" href="${DOMAIN}${de}">`,
    `<link rel="alternate" hreflang="en" href="${DOMAIN}${en}">`,
    `<link rel="alternate" hreflang="x-default" href="${DOMAIN}${de}">`,
    `<meta property="og:locale" content="${s.sprache === 'de' ? 'de_DE' : 'en_US'}">`,
    `<meta property="og:locale:alternate" content="${s.sprache === 'de' ? 'en_US' : 'de_DE'}">`,
  ].join('\n');
}

// Flaggen als Inline-SVG: Flaggen-Emojis zeigt Windows nicht an.
const FLAGGE = {
  de: '<svg class="sprache-flagge" viewBox="0 0 5 3" width="20" height="12" aria-hidden="true" focusable="false"><path fill="#000" d="M0 0h5v1H0z"/><path fill="#D00" d="M0 1h5v1H0z"/><path fill="#FFCE00" d="M0 2h5v1H0z"/></svg>',
  en: '<svg class="sprache-flagge" viewBox="0 0 60 30" width="20" height="12" aria-hidden="true" focusable="false"><path fill="#012169" d="M0 0v30h60V0z"/><path stroke="#fff" stroke-width="6" d="M0 0l60 30m0-30L0 30"/><path stroke="#C8102E" stroke-width="4" d="M0 0l60 30m0-30L0 30"/><path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#C8102E" stroke-width="6" d="M30 0v30M0 15h60"/></svg>',
};

/**
 * Der Umschalter: EIN Link zur Schwester, beschriftet in deren eigener
 * Sprache ("English" auf DE-Seiten, "Deutsch" auf EN-Seiten). Ein Link
 * statt Schieber: funktioniert ohne JS, Crawler folgen ihm, Tastatur geht.
 */
export function umschalter(pfad, klasse, wurzel = '.') {
  const s = schwester(pfad);
  if (!s || !existsSync(`${wurzel}/${datei(s.andere)}`)) return '';
  const ziel = s.sprache === 'de' ? 'en' : 'de';
  const name = ziel === 'en' ? 'English' : 'Deutsch';
  return `<a class="${klasse}" href="${s.andere}" hreflang="${ziel}" lang="${ziel}" data-sprache="${ziel}">${FLAGGE[ziel]}<span>${name}</span></a>`;
}
