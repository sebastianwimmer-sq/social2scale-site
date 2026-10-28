/**
 * Quelle der Motive je Abschnitt (28.10.2026). Gelesen von scripts/szenen-bauen.mjs und scripts/szenen-check.mjs.
 * Je Seite: Dateien (DE + EN teilen die Motive), Gestaltungsdatei szenen/<css>.css, Abschnitte in Reihenfolge.
 * Jedes Motiv kommt auf der ganzen Website genau einmal vor (Tor), außer dem Abschluss: eine Bühnenmarke,
 * die auf jeder Seite anders aussieht (Klasse mk-<seite>).
 */
const marke = (seite) =>
  `<span class="sz-deko mk-spot" aria-hidden="true"></span><span class="sz-deko mk-band mk-${seite}" aria-hidden="true"><i></i><i></i></span>`;
const abschluss = (seite, reihe = '<div class="cta-row">') => ({
  sz: 'markierung', anker: /<section class="blk abschluss">|<section class="[a-z-]+ abschluss"[^>]*>/,
  innen: [[reihe, marke(seite)]],
});

export const SEITEN = [
  {
    dateien: ['index.html', 'en/index.html'],
    css: 'start',
    abschnitte: [
      // A/B/C als drei Abzüge auf dem Leuchttisch: man sucht sich selbst darunter
      { sz: 'leuchttisch', anker: /<section class="kap" id="stand"[^>]*>/, deko: '<div class="sz-deko lt-schein" aria-hidden="true"></div>' },
      // Was du schon versucht hast = Probestreifen in der Entwicklerschale; nur der letzte Streifen sitzt
      { sz: 'probestreifen', anker: /<section class="kap" id="warum"[^>]*>/, teile: [/<li class="wa-row[^"]*">/g],
        deko: '<div class="sz-deko ps-lampe" aria-hidden="true"><span></span></div>' },
      // Vier Phasen am Handy = Ringlicht: jede Phase schaltet ein Viertel des Rings ein
      { sz: 'ringlicht', anker: /<section class="s2hero"[^>]*>/,
        innen: [['<div class="stage" aria-hidden="true">', '<div class="sz-deko rl" aria-hidden="true"><span class="rl-ring"></span><span class="rl-stativ"><i></i><i></i><i></i></span></div>']] },
      // Unser Feed = Abzüge an der Leine, schwingen beim Scrollen
      { sz: 'leine', schwung: true, anker: /<section class="feed-band"[^>]*>/ },
      // Dein Bereich = Kontrollmonitor am Set
      { sz: 'monitor', zeiger: true, anker: /<section class="proof photo-sec"[^>]*>/,
        innen: [['<div class="proof-visual">', '<div class="sz-deko km-stativ" aria-hidden="true"><span class="km-arm"></span><span class="km-gelenk"></span><span class="km-fuss"></span></div>']] },
      // Setup, Betreuung, Skalierung = Dreipunktlicht: Führungs-, Aufhell-, Spitzlicht
      { sz: 'dreipunkt', anker: /<section class="blk photo-sec" id="leistungen"[^>]*>/, teile: [/<div class="cell[^"]*">/g],
        innen: [['<div class="bento">', `<div class="sz-deko dp-plan" aria-hidden="true"><svg viewBox="0 0 240 200"><defs><radialGradient id="dpStrahl"><stop offset="0" stop-color="#EAFFF6" stop-opacity=".9"/><stop offset="1" stop-color="#EAFFF6" stop-opacity="0"/></radialGradient></defs>
<g class="dp-l dp-l1"><path class="dp-kegel" d="M44 160 L112 92 L132 112 Z"/><rect class="dp-kopf" x="28" y="150" width="30" height="20" rx="4" transform="rotate(-45 43 160)"/></g>
<g class="dp-l dp-l2"><path class="dp-kegel" d="M196 160 L128 92 L108 112 Z"/><rect class="dp-kopf" x="182" y="150" width="30" height="20" rx="4" transform="rotate(45 197 160)"/></g>
<g class="dp-l dp-l3"><path class="dp-kegel" d="M120 26 L104 96 L136 96 Z"/><rect class="dp-kopf" x="105" y="14" width="30" height="18" rx="4"/></g>
<circle class="dp-motiv" cx="120" cy="102" r="15"/><path class="dp-kamera" d="M108 186h24v-12l-6-5h-12l-6 5z"/></svg></div>`]] },
      // Fragen = Karteikasten: helle Karten, lesbar wie Papier
      { sz: 'kartei', anker: /<section class="blk" id="faq"[^>]*>/ },
      // Sebi & Phil = ein Licht zwischen beiden, das beide Gesichter von innen zeichnet
      { sz: 'gegenlicht', anker: /<section class="gruender"[^>]*>/,
        innen: [['<div class="gr-reihe">', '<div class="sz-deko gl-roehre" aria-hidden="true"><span></span></div>']] },
      abschluss('start'),
    ],
  },
  {
    dateien: ['ablauf/index.html', 'en/process/index.html'],
    css: 'ablauf',
    abschnitte: [
      // Vier Phasen = Kamerafahrt: ein Dolly fährt die Schiene entlang, jede Station leuchtet auf, wenn er da ist
      { sz: 'dolly', anker: /<section class="fl-phasen"[^>]*>/, teile: [/<article class="fl-phase[^"]*">/g],
        deko: '<div class="sz-deko dl-schiene" aria-hidden="true"><span class="dl-wagen"><svg viewBox="0 0 60 52"><rect x="14" y="4" width="30" height="18" rx="3" class="dl-kamera"/><rect x="44" y="9" width="10" height="8" rx="1.5" class="dl-kamera"/><path d="M29 22v12" class="dl-saeule"/><rect x="6" y="34" width="46" height="8" rx="2" class="dl-platte"/><circle cx="14" cy="46" r="5" class="dl-rad"/><circle cx="44" cy="46" r="5" class="dl-rad"/></svg></span></div>' },
      // Deine Zeit = Filmmeter: was du selbst machst, ist ein langer belichteter Streifen; mit uns ein paar Bilder
      { sz: 'filmmeter', anker: /<section class="fl-aufwand"[^>]*>/,
        deko: '<div class="sz-deko fm-uhr" aria-hidden="true"><span class="fm-zeiger"></span></div>' },
      // Was wir brauchen = drei Requisiten mit Anhänger: Schlüssel, Abzüge, Uhr
      { sz: 'requisiten', anker: /<section class="fl-brauchen"[^>]*>/,
        innen: [
          ['<div class="fl-b-item">', '<svg class="sz-deko rq-ding" aria-hidden="true" viewBox="0 0 140 80"><circle cx="34" cy="40" r="20" class="rq-metall"/><circle cx="34" cy="40" r="9" class="rq-loch"/><path d="M52 36h70v9h-8v10h-8v-10h-8v8h-8v-8H52z" class="rq-metall"/></svg>', 0],
          ['<div class="fl-b-item">', '<svg class="sz-deko rq-ding" aria-hidden="true" viewBox="0 0 140 80"><g transform="rotate(-12 50 50)"><rect x="22" y="14" width="46" height="56" rx="2" class="rq-abzug"/><rect x="27" y="19" width="36" height="38" class="rq-bild1"/></g><g transform="rotate(6 80 44)"><rect x="54" y="10" width="46" height="56" rx="2" class="rq-abzug"/><rect x="59" y="15" width="36" height="38" class="rq-bild2"/></g></svg>', 1],
          ['<div class="fl-b-item">', '<svg class="sz-deko rq-ding" aria-hidden="true" viewBox="0 0 140 80"><rect x="64" y="2" width="12" height="8" rx="2" class="rq-metall"/><circle cx="70" cy="44" r="31" class="rq-metall"/><circle cx="70" cy="44" r="25" class="rq-blatt"/><path d="M70 44V24" class="rq-zeiger"/><path d="M70 44V22A22 22 0 0 1 70 66Z" class="rq-halb"/></svg>', 2],
        ] },
      abschluss('ablauf', '<div class="fl-cta-row">'),
    ],
  },
  {
    dateien: ['preise/index.html', 'en/pricing/index.html'],
    css: 'preise',
    abschnitte: [
      // Der empfohlene Weg steht auf dem hohen Podest im Führungslicht, die zwei Auswege daneben tiefer
      { sz: 'podest', zeiger: true, anker: /<section class="pr-blk pr-ueb-sec"[^>]*>/,
        innen: [['<div class="pr-emp" data-licht>', '<span class="sz-deko pd-kegel" aria-hidden="true"></span><span class="sz-deko pd-sockel" aria-hidden="true"></span>']] },
      // Was es kostet = Kassenbon: die Rechnung kommt aus dem Drucker, unsere Zeile ist die Summe
      { sz: 'kassenbon', anker: /<section class="pr-blk" aria-labelledby="pr-rechnung"[^>]*>/,
        innen: [['<div class="pr-calc">', '<span class="sz-deko kb-schlitz" aria-hidden="true"></span>']] },
      // Warum nicht billiger = Maßband: jede Spanne liegt als Strecke auf derselben Skala
      { sz: 'massband', anker: /<section class="pr-blk pr-why"[^>]*>/,
        innen: [['<div class="pr-why-scale stagger">', '<span class="sz-deko mb-band" aria-hidden="true"></span>']] },
      // Alle sieben Pakete = Mappe: zu ist sie ein Deckel, offen liegen die Blätter hell und lesbar
      { sz: 'mappe', anker: /<section class="pr-blk" aria-labelledby="pr-detail"[^>]*>/ },
      abschluss('preise'),
    ],
  },
  {
    dateien: ['for-you/index.html', 'en/for-you/index.html'],
    css: 'fuer-wen',
    abschnitte: [
      // Drei Ausgangslagen = drei Menschen im Dunkeln; wer an der Reihe ist, tritt ins Licht
      { sz: 'silhouetten', anker: /<section class="fw-blk" id="fuer-wen"[^>]*>/, teile: [/<article class="fw-pcard[^"]*">/g],
        innen: [
          ['<article class="fw-pcard">', '<svg class="sz-deko sl-figur" aria-hidden="true" viewBox="0 0 120 120"><circle cx="60" cy="40" r="20" class="sl-koerper"/><path d="M22 118c2-30 18-46 38-46s36 16 38 46z" class="sl-koerper"/><path d="M92 30h20v14h-12l-6 5v-5h-2z" class="sl-ding"/></svg>', 0],
          ['<article class="fw-pcard">', '<svg class="sz-deko sl-figur" aria-hidden="true" viewBox="0 0 120 120"><circle cx="60" cy="40" r="20" class="sl-koerper"/><path d="M22 118c2-30 18-46 38-46s36 16 38 46z" class="sl-koerper"/><path d="M86 84l22-6v24l-22 6z" class="sl-ding"/></svg>', 1],
          ['<article class="fw-pcard">', '<svg class="sz-deko sl-figur" aria-hidden="true" viewBox="0 0 120 120"><circle cx="60" cy="40" r="20" class="sl-koerper"/><path d="M22 118c2-30 18-46 38-46s36 16 38 46z" class="sl-koerper"/><rect x="84" y="88" width="26" height="20" rx="3" class="sl-ding"/><path d="M92 88v-4h10v4" class="sl-ding-linie"/></svg>', 2],
        ] },
      // Leitsatz = ein Verfolger-Spot fährt beim Scrollen über die Schrift
      { sz: 'verfolger', anker: /<section class="fw-quote"[^>]*>/, deko: '<div class="sz-deko vf-spot" aria-hidden="true"></div>' },
      // Engpass → System = Lichtpult: jeder Engpass ist ein Kanal, der Schalter legt um, das System geht an
      { sz: 'lichtpult', anker: /<section class="fw-blk" id="engpass-system"[^>]*>/, teile: [/<div class="fw-mrow">/g] },
      // Fit-Check = Kontaktbogen mit Fettstift: Passt wird eingekreist, Passt-nicht bekommt eine Klammer
      { sz: 'fettstift', anker: /<section class="fw-blk" id="fuer-wen-qual"[^>]*>/ },
      abschluss('fuer-wen'),
    ],
  },
  {
    dateien: ['about/index.html', 'en/about/index.html'],
    css: 'ueber-uns',
    abschnitte: [
      // Leitsatz = vom Diaprojektor an die Wand geworfen, Staub im Strahl
      { sz: 'projektor', anker: /<section class="ab-quote"[^>]*>/,
        deko: '<div class="sz-deko pj-strahl" aria-hidden="true"></div><div class="sz-deko pj-geraet" aria-hidden="true"><i></i></div>' },
      // Warum es uns gibt = Lichtplan: der Grundriss des Studios, jedes Versprechen hat seinen Platz darauf
      { sz: 'lichtplan', anker: /<section class="ab-mission"[^>]*>/,
        deko: '<svg class="sz-deko lp-plan" aria-hidden="true" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice"><path class="lp-wand" d="M60 60H1140V540H60Z"/><path class="lp-wand" d="M60 360H340V540"/><path class="lp-linie" d="M700 300m-120 0a120 120 0 1 0 240 0a120 120 0 1 0-240 0"/><path class="lp-linie" d="M700 300L520 140M700 300L880 140M700 300V500"/><rect class="lp-lampe" x="500" y="120" width="40" height="26" rx="4" transform="rotate(-40 520 133)"/><rect class="lp-lampe" x="860" y="120" width="40" height="26" rx="4" transform="rotate(40 880 133)"/><rect class="lp-lampe" x="680" y="488" width="40" height="26" rx="4"/><circle class="lp-motiv" cx="700" cy="300" r="16"/></svg>' },
      // Phil & Sebi = Porträtsitzung: je eine Softbox, die aufleuchtet, wenn die Karte an der Reihe ist
      { sz: 'portraitsitzung', anker: /<section class="ab-blk" aria-labelledby="ab-founders-h"[^>]*>/, teile: [/<article class="ab-fcard"[^>]*>/g],
        innen: [['<article class="ab-fcard" data-licht>', '<span class="sz-deko sb-box" aria-hidden="true"><i></i></span>', 0], ['<article class="ab-fcard" data-licht>', '<span class="sz-deko sb-box" aria-hidden="true"><i></i></span>', 1]] },
      // Vier Prinzipien = vier Klappen: jede Szene wird angeschlagen, wenn sie dran ist
      { sz: 'klappe', anker: /<section class="ab-blk" id="wie-wir-arbeiten"[^>]*>/, teile: [/<div class="ab-row">/g] },
      abschluss('ueber-uns'),
    ],
  },
  {
    dateien: ['results/index.html', 'en/results/index.html'],
    css: 'pruef-uns',
    abschnitte: [
      // Die drei Zahlen = Farbfilter im Strahl: was durch alle drei kommt, ist ein Gespräch; Follower liegen daneben
      { sz: 'gelfilter', anker: /<section class="rs-blk" aria-labelledby="rs-kpi-h"[^>]*>/, teile: [/<li>/g],
        innen: [['</b></p>', '<div class="sz-deko gf-bank" aria-hidden="true"><i class="gf-strahl"></i><span class="gf-gel"></span><span class="gf-gel"></span><span class="gf-gel"></span><span class="gf-ablage"></span></div>']] },
      // Sechs Monate = Entwicklung: derselbe Abzug, Stufe für Stufe deutlicher
      { sz: 'entwicklung', anker: /<section class="rs-blk" id="verlauf"[^>]*>/, teile: [/<li>/g] },
      // Grundsatz = Prüfstempel
      { sz: 'stempel', anker: /<section class="rs-quote"[^>]*>/,
        innen: [['<figure>', '<span class="sz-deko st-stempel" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="st-ring"/><circle cx="60" cy="60" r="44" class="st-ring st-ring2"/><rect x="38" y="64" width="10" height="18" rx="2" class="st-balken"/><rect x="55" y="50" width="10" height="32" rx="2" class="st-balken"/><rect x="72" y="36" width="10" height="46" rx="2" class="st-balken"/></svg></span>']] },
      // Sechs Fragen = Verhörlampe: das Licht fällt auf die Frage, die du gerade liest
      { sz: 'verhoer', anker: /<section class="rs-blk" aria-labelledby="rs-fragen-h"[^>]*>/, teile: [/<li>/g],
        innen: [['<div class="rs-mcol">', '<span class="sz-deko vh-lampe" aria-hidden="true"><i></i></span>', 1]] },
      abschluss('pruef-uns'),
    ],
  },
  {
    // Wissen-Artikel: Lesestrecke = heller Lesetisch unter einer Lampe, die mitliest (kunden-wirkung-evidenz › lesen-hell)
    dateien: ['wissen/ablauf-zusammenarbeit/index.html', 'wissen/selbst-machen-oder-agentur/index.html', 'wissen/social-media-agentur-auswaehlen/index.html',
      'wissen/was-kostet-social-media-betreuung/index.html', 'wissen/wie-lange-bis-ergebnisse/index.html',
      'en/knowledge/choosing-a-social-media-agency/index.html', 'en/knowledge/diy-or-agency/index.html', 'en/knowledge/how-long-until-results/index.html',
      'en/knowledge/how-we-work-together/index.html', 'en/knowledge/social-media-management-cost/index.html'],
    css: 'wissen', cssImKopf: true,
    abschnitte: [
      { sz: 'lesetisch', anker: /<article class="wrap w-art"[^>]*>/, deko: '<div class="sz-deko lt-lampe" aria-hidden="true"><i class="lt-arm"></i><i class="lt-kopf"></i></div><div class="sz-deko lt-pool" aria-hidden="true"></div>' },
      // Am Ende des Artikels: eine dunkle Notizkarte mit Büroklammer
      { sz: 'notizkarte', anker: /<section class="w-cta w-re"[^>]*>/, deko: '<span class="sz-deko nk-klammer" aria-hidden="true"></span>' },
    ],
  },
  {
    // Wissen-Übersicht: Hängeregister — jede Antwort ist eine Mappe mit Reiter
    dateien: ['wissen/index.html', 'en/knowledge/index.html'],
    css: 'wissen', cssImKopf: true,
    abschnitte: [
      { sz: 'haengeregister', anker: /<div class="wrap w-art"[^>]*>/ },
      { sz: 'notizkarte', anker: /<section class="w-cta w-re"[^>]*>/, deko: '<span class="sz-deko nk-klammer" aria-hidden="true"></span>' },
    ],
  },
  {
    dateien: ['danke/index.html'],
    css: 'danke',
    abschnitte: [
      // Der Gruß der Gründer = eine handgeschriebene Briefkarte
      { sz: 'briefkarte', anker: /<section class="dk-wir"[^>]*>/ },
    ],
  },
  {
    dateien: ['danke/studio/index.html', 'danke/studio/abo/index.html', 'danke/studio/paket-100/index.html', 'danke/studio/paket-250/index.html', 'danke/studio/paket-500/index.html'],
    css: 'danke',
    abschnitte: [
      // Drei Schritte zum ersten Beitrag = Drehplan an der Wand, abgehakt mit Kreide
      { sz: 'drehplan', anker: /<section class="blk steps-blk"[^>]*>/, teile: [/<li>/g] },
    ],
  },
];
