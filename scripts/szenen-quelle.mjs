/**
 * Quelle der Motive je Abschnitt (28.10.2026). Gelesen von scripts/szenen-bauen.mjs und scripts/szenen-check.mjs.
 * Je Seite: Dateien (DE + EN teilen die Motive), Gestaltungsdatei szenen/<css>.css, Abschnitte in Reihenfolge.
 * Seit 16.11.2026 (Sebi: „wirkt halt viel lose“, dann „alles fest und mit System“) tragen nur noch zwei Abschnitte ein Motiv:
 * das Handy im Ring auf der Startseite und der Drehplan auf /danke/studio/. Alle anderen Seiten leben vom Verlauf (raum.css › Fluss).
 */
export const SEITEN = [
  {
    dateien: ['index.html', 'en/index.html'],
    css: 'start',
    abschnitte: [
      // Startseite bereinigt (Sebi 16.11.2026: „wirkt halt viel lose“): nur das Handy im Ring bleibt, es zeigt den Inhalt.
      // Vier Phasen am Handy = Ringlicht: jede Phase schaltet ein Viertel des Rings ein
      { sz: 'ringlicht', anker: /<section class="s2hero"[^>]*>/,
        innen: [['<div class="stage" aria-hidden="true">', '<div class="sz-deko rl" aria-hidden="true"><span class="rl-ring"></span><span class="rl-stativ"><i></i><i></i><i></i></span></div>']] },
    ],
  },
  {
    dateien: ['ablauf/index.html', 'en/process/index.html'],
    css: 'ablauf',
    abschnitte: [],
  },
  {
    dateien: ['preise/index.html', 'en/pricing/index.html'],
    css: 'preise',
    abschnitte: [],
  },
  {
    dateien: ['for-you/index.html', 'en/for-you/index.html'],
    css: 'fuer-wen',
    abschnitte: [],
  },
  {
    dateien: ['about/index.html', 'en/about/index.html'],
    css: 'ueber-uns',
    abschnitte: [],
  },
  {
    dateien: ['results/index.html', 'en/results/index.html'],
    css: 'pruef-uns',
    abschnitte: [],
  },
  {
    // Wissen-Artikel: Lesestrecke = heller Lesetisch unter einer Lampe, die mitliest (kunden-wirkung-evidenz › lesen-hell)
    dateien: ['wissen/ablauf-zusammenarbeit/index.html', 'wissen/selbst-machen-oder-agentur/index.html', 'wissen/social-media-agentur-auswaehlen/index.html',
      'wissen/was-kostet-social-media-betreuung/index.html', 'wissen/wie-lange-bis-ergebnisse/index.html',
      'en/knowledge/choosing-a-social-media-agency/index.html', 'en/knowledge/diy-or-agency/index.html', 'en/knowledge/how-long-until-results/index.html',
      'en/knowledge/how-we-work-together/index.html', 'en/knowledge/social-media-management-cost/index.html'],
    css: 'wissen', cssImKopf: true,
    abschnitte: [],
  },
  {
    // Wissen-Übersicht: Hängeregister — jede Antwort ist eine Mappe mit Reiter
    dateien: ['wissen/index.html', 'en/knowledge/index.html'],
    css: 'wissen', cssImKopf: true,
    abschnitte: [],
  },
  // /danke/ hat seit 15.11.2026 keine Szene mehr (Briefkarte entfernt; Sebi: high end clean).
  {
    dateien: ['danke/studio/index.html', 'danke/studio/abo/index.html', 'danke/studio/paket-100/index.html', 'danke/studio/paket-250/index.html', 'danke/studio/paket-500/index.html'],
    css: 'danke',
    abschnitte: [
      // Drei Schritte zum ersten Beitrag = Drehplan an der Wand, abgehakt mit Kreide
      { sz: 'drehplan', anker: /<section class="blk steps-blk"[^>]*>/, teile: [/<li>/g] },
    ],
  },
];
