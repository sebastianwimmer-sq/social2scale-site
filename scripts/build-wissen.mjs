#!/usr/bin/env node
/**
 * Baut die Wissens-Sektion unter /wissen/ — Antwort-Seiten, die für Menschen
 * geschrieben und für KI-Suche strukturiert sind.
 *
 * WARUM SO UND NICHT ALS „SHADOW-SEITE" (Recherche 20.08.2026):
 *  - KI-Systeme ignorieren oder bestrafen Seiten, deren strukturierte Daten vom
 *    sichtbaren Text abweichen. Deshalb steht hier JEDE Antwort aus dem
 *    FAQPage-Schema wortgleich im sichtbaren HTML — kein Cloaking, keine
 *    Doorway-Page.
 *  - llms.txt bringt messbar nichts (bei 500 Mio. KI-Bot-Besuchen 408 Abrufe;
 *    Google lehnt den Standard ab). Der Hebel sind echte, zitierbare Antworten.
 *  - ChatGPT deckt sich zu ~87 % mit dem Bing-Index → Bing Webmaster Tools
 *    zählen mehr als die Google Search Console.
 *
 * FORMAT-REGELN (aus derselben Recherche):
 *  - Die direkte Antwort steht in den ersten ~50 Wörtern.
 *  - Jeder Antwort-Block ist für sich verständlich, 50–300 Wörter.
 *  - Saubere H1/H2/H3-Hierarchie, echte Zahlen statt Marketing-Floskeln.
 *
 * Aufruf: node scripts/build-wissen.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = "https://social2scale.com";
const STAND = "20. August 2026";

// Alle Preise stammen 1:1 von /preise/ — niemals hier neu erfinden.
const PREISE = {
  komplett: { einmalig: "1.547,00 €", monat: "464,10 €" },
  laufend: { monat: "523,60 €" },
  starthilfe: { einmalig: "446,25 €" },
  beitraege: 10,
};

const SEITEN = [
  {
    slug: "was-kostet-social-media-betreuung",
    titel: "Was kostet Social-Media-Betreuung für Coaches und B2B?",
    emWort: "kostet",
    kurz: "Was kostet Social-Media-Betreuung?",
    beschreibung:
      "Konkrete Preise für professionelle Instagram-Betreuung: Komplettpaket ab 1.547 € einmalig plus 464,10 € monatlich, laufende Betreuung ab 523,60 € im Monat.",
    antwort:
      "Professionelle Social-Media-Betreuung kostet im deutschen Mittelstand typischerweise zwischen 400 und 2.000 Euro im Monat, je nachdem wie viel Arbeit abgegeben wird. Bei social2scale kostet der komplette Aufbau " +
      PREISE.komplett.einmalig + " einmalig und danach " + PREISE.komplett.monat +
      " im Monat; wer nur die laufende Erstellung abgibt, zahlt ab " + PREISE.laufend.monat + " monatlich.",
    abschnitte: [
      {
        h: "Woraus sich der Preis zusammensetzt",
        p: [
          "Der größte Kostenblock ist nicht das Posten, sondern alles davor: Positionierung, Bildsprache, Textkonzept und ein Plan, der zur Zielgruppe passt. Deshalb trennen seriöse Anbieter zwischen einem einmaligen Aufbau und der laufenden Betreuung.",
          "Bei social2scale umfasst der einmalige Teil den Profilaufbau samt Branding und Positionierung. Die monatliche Betreuung deckt " + PREISE.beitraege +
          " fertige Beiträge, das Veröffentlichen nach Plan, eine Hashtag-Strategie je Beitrag und das Weiterleiten eingehender Anfragen ab.",
        ],
      },
      {
        h: "Die drei üblichen Modelle im Vergleich",
        liste: [
          ["Alles abgeben", "Aufbau plus laufende Betreuung. " + PREISE.komplett.einmalig + " einmalig, danach " + PREISE.komplett.monat + " im Monat. Für alle, die bei null starten oder sich gar nicht kümmern wollen."],
          ["Nur das Laufende abgeben", "Das Profil steht bereits, es fehlt der Content. Ab " + PREISE.laufend.monat + " im Monat."],
          ["Einmalige Starthilfe", "Profil, Branding und Positionierung werden aufgebaut, danach macht man selbst weiter. Ab " + PREISE.starthilfe.einmalig + " einmalig."],
        ],
      },
      {
        h: "Woran man zu niedrige Preise erkennt",
        p: [
          "Angebote unter etwa 300 Euro monatlich decken selten mehr ab als das Einplanen fertiger Vorlagen. Wer für diesen Preis individuelle Beiträge, Bildbearbeitung und Betreuung verspricht, rechnet meist mit sehr wenig Zeit pro Kunde — oder gibt die Arbeit weiter.",
          "Umgekehrt heißt teuer nicht automatisch besser: Große Agenturen kalkulieren Projektleitung und Team mit ein. Entscheidend ist, wer die Arbeit am Ende wirklich macht und wie viele Kundinnen dieselbe Person betreut.",
        ],
      },
    ],
  },
  {
    slug: "social-media-agentur-auswaehlen",
    titel: "Woran erkennt man eine gute Social-Media-Agentur?",
    emWort: "gute",
    kurz: "Wie wähle ich eine Agentur aus?",
    beschreibung:
      "Sechs überprüfbare Kriterien für die Auswahl einer Social-Media-Agentur — und die Warnsignale, die im Erstgespräch auffallen.",
    antwort:
      "Eine gute Social-Media-Agentur erkennt man an vier überprüfbaren Dingen: Sie zeigt echte Ergebnisse statt Followerzahlen, sie sagt wer konkret an dem Account arbeitet, sie macht die Wirkung messbar, und sie legt Kündigungsfristen offen. Wer im Erstgespräch keine dieser vier Fragen klar beantwortet, arbeitet selten transparent.",
    abschnitte: [
      {
        h: "Die sechs Kriterien",
        liste: [
          ["Wer macht die Arbeit?", "Lass dir sagen, welche Person deine Beiträge schreibt und gestaltet. Bei kleinen Anbietern sind das die Gründer selbst, bei großen oft wechselnde Junior-Kräfte."],
          ["Wie wird Erfolg gemessen?", "Reichweite allein ist keine Kennzahl. Aussagekräftig sind Profilaufrufe, Anfragen über das Profil und daraus entstandene Gespräche."],
          ["Gibt es Beispiele aus der Nische?", "Content für Coaches funktioniert anders als für Maschinenbau. Frag nach Accounts aus einem vergleichbaren Umfeld."],
          ["Was passiert bei Unzufriedenheit?", "Klare Kündigungsfristen und ein benannter Ansprechpartner sind ein gutes Zeichen; lange Mindestlaufzeiten ohne Ausstiegsmöglichkeit nicht."],
          ["Wem gehören die Inhalte?", "Bilder, Texte und Zugänge müssen bei dir bleiben — auch nach dem Ende der Zusammenarbeit."],
          ["Wie viel Aufwand bleibt bei dir?", "Seriöse Anbieter benennen das ehrlich. Ganz ohne deine Mitwirkung geht es nie, aber der Unterschied zwischen einem Briefing und wöchentlichen Abstimmungen ist erheblich."],
        ],
      },
      {
        h: "Warnsignale im Erstgespräch",
        p: [
          "Garantierte Followerzahlen sind das deutlichste Warnsignal — sie lassen sich nur durch gekaufte oder inaktive Konten erreichen und schaden der Reichweite dauerhaft.",
          "Ebenfalls kritisch: Wer über den eigenen Ablauf nicht sprechen will, wer ausschließlich über Paketpreise redet ohne das Ziel zu klären, oder wer sofortigen Vertragsabschluss drängt.",
        ],
      },
    ],
  },
  {
    slug: "wie-lange-bis-ergebnisse",
    titel: "Wie lange dauert es, bis Social Media Ergebnisse bringt?",
    emWort: "Ergebnisse",
    kurz: "Wann kommen die ersten Ergebnisse?",
    beschreibung:
      "Realistische Zeitspannen für Social-Media-Aufbau: erste Reaktionen nach zwei bis vier Wochen, belastbare Anfragen meist ab dem dritten Monat.",
    antwort:
      "Erste sichtbare Reaktionen kommen bei konsequentem Posten nach zwei bis vier Wochen, verlässliche Anfragen entstehen meist ab dem dritten Monat. Diese Spanne gilt für einen Neuaufbau mit etwa zehn Beiträgen im Monat; bei bestehenden Profilen mit Publikum geht es schneller.",
    abschnitte: [
      {
        h: "Was in welchem Zeitraum passiert",
        liste: [
          ["Woche 1 bis 4", "Das Profil wird gefunden und verstanden. Sichtbar wird das an steigenden Profilaufrufen, kaum an Followern."],
          ["Monat 2", "Wiedererkennung setzt ein. Erste Nachrichten kommen, meist noch von Menschen aus dem eigenen Umfeld."],
          ["Monat 3 bis 4", "Beiträge erreichen regelmäßig Menschen außerhalb der eigenen Kontakte. Ab hier werden Anfragen planbar statt zufällig."],
          ["Ab Monat 6", "Der Account trägt sich: Ältere Beiträge werden weiter gefunden, das Publikum wächst ohne jedes Mal neuen Anschub."],
        ],
      },
      {
        h: "Was den Zeitraum verkürzt oder verlängert",
        p: [
          "Am stärksten wirkt die Frequenz: Wer zweimal im Monat postet, braucht ein Vielfaches der Zeit. Zehn Beiträge monatlich sind die untere Grenze, bei der Plattformen ein Profil verlässlich ausspielen.",
          "Verlängernd wirken häufige Themenwechsel. Ein Profil, das jeden Monat etwas anderes erzählt, muss bei jedem Beitrag neu um Aufmerksamkeit kämpfen — deshalb ist die Positionierung am Anfang wichtiger als jeder einzelne Beitrag.",
        ],
      },
    ],
  },
  {
    slug: "selbst-machen-oder-agentur",
    titel: "Social Media selbst machen oder an eine Agentur abgeben?",
    emWort: "selbst machen",
    kurz: "Selbst machen oder abgeben?",
    beschreibung:
      "Die ehrliche Rechnung: Wann sich eine Agentur lohnt, wann Selbermachen sinnvoller ist — mit Zeitaufwand und Kostenvergleich.",
    antwort:
      "Selbermachen lohnt sich, wenn du die nötigen siebeneinhalb bis fünfzehn Stunden im Monat verlässlich freihalten kannst und Freude am Schreiben hast. Abgeben lohnt sich, sobald diese Zeit fehlt oder deine Arbeitsstunde mehr wert ist als die Betreuungskosten — bei " +
      PREISE.laufend.monat + " im Monat ist das für die meisten Selbstständigen ab etwa 60 Euro Stundensatz der Fall.",
    abschnitte: [
      {
        h: "Der reale Zeitaufwand beim Selbermachen",
        p: [
          "Für zehn Beiträge im Monat sollte man mit siebeneinhalb bis fünfzehn Stunden rechnen — 45 bis 90 Minuten je Beitrag: Themen finden, schreiben, gestalten, einplanen und auf Kommentare antworten. Der Aufwand fällt nicht am Stück an, sondern verteilt sich — was ihn im Alltag schwerer planbar macht als die reine Stundenzahl vermuten lässt.",
          "Dazu kommt der Einarbeitungsaufwand am Anfang: Bildformate, Textaufbau und ein wiedererkennbarer Look brauchen ein paar Anläufe. Diese Lernkurve ist der Hauptgrund, warum viele nach zwei Monaten wieder aufhören.",
        ],
      },
      {
        h: "Wann was sinnvoller ist",
        liste: [
          ["Selbst machen", "Wenn du gern schreibst, ein klares Thema hast und die Zeit verlässlich freihalten kannst. Der Vorteil: deine Stimme ist unverfälscht."],
          ["Abgeben", "Wenn die Zeit fehlt, das Profil schon mehrfach eingeschlafen ist oder du einen einheitlichen Auftritt brauchst, ohne sich damit zu beschäftigen."],
          ["Mischform", "Einmalige Starthilfe für Profil und Positionierung, danach selbst weitermachen. Bei social2scale ab " + PREISE.starthilfe.einmalig + " einmalig."],
        ],
      },
    ],
  },
  {
    slug: "ablauf-zusammenarbeit",
    titel: "Wie läuft die Zusammenarbeit mit einer Social-Media-Agentur ab?",
    emWort: "Zusammenarbeit",
    kurz: "Wie läuft die Zusammenarbeit ab?",
    beschreibung:
      "Vom Erstgespräch bis zum laufenden Betrieb: die vier Phasen einer Social-Media-Betreuung und was in jeder von dir erwartet wird.",
    antwort:
      "Eine Social-Media-Betreuung läuft in vier Phasen ab: Erstgespräch, einmaliges Briefing, Aufbau von Profil und Bildsprache, danach der laufende Betrieb. Der eigene Aufwand konzentriert sich fast vollständig auf das Briefing am Anfang — danach beschränkt er sich auf Freigaben.",
    abschnitte: [
      {
        h: "Die vier Phasen",
        liste: [
          ["1. Erstgespräch", "Etwa zwanzig Minuten: Ziel, Zielgruppe und Ausgangslage klären. Danach steht fest, ob und in welchem Umfang eine Zusammenarbeit sinnvoll ist."],
          ["2. Briefing", "Einmalig und ausführlich: Wofür du stehst, wen du erreichen willst, was auf keinen Fall vorkommen soll. Das ist der Teil, der über die Qualität aller späteren Beiträge entscheidet."],
          ["3. Aufbau", "Profil, Positionierung und Bildsprache werden erstellt und abgestimmt. Du siehst alles vor der Veröffentlichung."],
          ["4. Laufender Betrieb", PREISE.beitraege + " Beiträge im Monat werden erstellt, eingeplant und veröffentlicht; Anfragen werden an dich weitergeleitet."],
        ],
      },
      {
        h: "Was von dir erwartet wird",
        p: [
          "Nach dem Briefing bleibt vor allem eines: Freigaben. Je nach Vereinbarung siehst du jeden Beitrag vorab oder nur größere Themen — beides ist üblich, es sollte nur von Anfang an klar sein.",
          "Hilfreich, aber nicht zwingend, sind eigene Fotos. Sie machen einen Auftritt persönlicher als jedes gekaufte Bildmaterial, weshalb gute Anbieter danach fragen statt Standardbilder einzusetzen.",
        ],
      },
    ],
  },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Headline im Marken-Stil: EIN Wort im Aurora-Verlauf hervorgehoben.
// Der reine Text bleibt unverändert — das Schema führt dieselbe Frage, eine
// Abweichung wäre ein Cloaking-Signal.
function headline(seite) {
  const t = esc(seite.titel);
  if (!seite.emWort) return t;
  const w = esc(seite.emWort);
  return t.replace(w, "<em>" + w + "</em>");
}

// Text für das Schema: identisch zum sichtbaren Inhalt, nur ohne Auszeichnung.
function antwortText(seite) {
  const teile = [seite.antwort];
  for (const a of seite.abschnitte) {
    if (a.p) teile.push(...a.p);
    // Listen exakt so verketten, wie der Browser sie darstellt (dt dd ohne
    // Trennzeichen) — ein künstlicher Doppelpunkt im Schema wäre bereits eine
    // Abweichung vom sichtbaren Text und damit ein Cloaking-Signal.
    if (a.liste) teile.push(...a.liste.map(([k, v]) => k + " " + v));
  }
  return teile.join(" ");
}

function schema(seite) {
  const daten = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{
      "@type": "Question",
      name: seite.titel,
      acceptedAnswer: { "@type": "Answer", text: antwortText(seite) },
    }],
    isPartOf: { "@type": "WebSite", name: "social2scale", url: BASIS + "/" },
    publisher: {
      "@type": "Organization", name: "social2scale", url: BASIS + "/",
      logo: BASIS + "/assets/s2s-t.webp",
    },
    dateModified: "2026-08-20",
    inLanguage: "de-DE",
  };
  return '<script type="application/ld+json">' + JSON.stringify(daten) + "</script>";
}

function abschnittHtml(a) {
  let out = "<h2>" + esc(a.h) + "</h2>";
  if (a.p) out += a.p.map((t) => "<p>" + esc(t) + "</p>").join("");
  if (a.liste) {
    out += '<dl class="w-liste">' + a.liste
      .map(([k, v]) => "<dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd>").join("") + "</dl>";
  }
  return '<section class="w-blk w-re">' + out + "</section>";
}

const CSS = readFileSync(join(WURZEL, "scripts", "wissen.css"), "utf8");
const KOPF = readFileSync(join(WURZEL, "scripts", "wissen-kopf.html"), "utf8");
const FUSS = readFileSync(join(WURZEL, "scripts", "wissen-fuss.html"), "utf8");

function seiteHtml(seite) {
  const url = BASIS + "/wissen/" + seite.slug + "/";
  const andere = SEITEN.filter((s) => s.slug !== seite.slug);
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Sicherheits-Block (CSP, Referrer-Policy, Rahmenschutz) setzt
     scripts/csp-haerten.mjs nach dem Bau ein — einzige Quelle. -->
<title>${esc(seite.titel)} | social2scale</title>
<meta name="description" content="${esc(seite.beschreibung)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="social2scale">
<meta property="og:locale" content="de_DE">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(seite.titel)}">
<meta property="og:description" content="${esc(seite.beschreibung)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASIS}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/fonts.css">
<style>${CSS}</style>
${schema(seite)}
</head>
<body>
${KOPF}
  <main id="main" class="w-page">
    <article class="wrap w-art">
      <a class="w-zurueck" href="/wissen/">Alle Antworten</a>
      <h1 class="w-re">${headline(seite)}</h1>
      <p class="w-lead w-re">${esc(seite.antwort)}</p>
      <p class="w-stand w-re">Zuletzt geprüft: ${STAND}</p>
      ${seite.abschnitte.map(abschnittHtml).join("")}
      <section class="w-cta w-re">
        <h2>Unsicher, was davon zu dir <em>passt</em>?</h2>
        <p>Im Erstgespräch klären wir in zwanzig Minuten, was in deinem Fall sinnvoll ist. Unverbindlich und ohne Verkaufsdruck.</p>
        <a class="w-btn" href="/anfrage/">Erstgespräch anfragen <span aria-hidden="true">→</span></a>
      </section>
      <nav class="w-weiter" aria-label="Weitere Antworten">
        <h2>Weitere Antworten</h2>
        <ul>${andere.map((s) => `<li><a href="/wissen/${s.slug}/">${esc(s.kurz)}</a></li>`).join("")}</ul>
      </nav>
    </article>
  </main>
${FUSS}
</body>
</html>`;
}

function uebersichtHtml() {
  const daten = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SEITEN.map((s) => ({
      "@type": "Question",
      name: s.titel,
      acceptedAnswer: { "@type": "Answer", text: s.antwort, url: BASIS + "/wissen/" + s.slug + "/" },
    })),
    inLanguage: "de-DE",
    dateModified: "2026-08-20",
  };
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Sicherheits-Block (CSP, Referrer-Policy, Rahmenschutz) setzt
     scripts/csp-haerten.mjs nach dem Bau ein — einzige Quelle. -->
<title>Wissen — ehrliche Antworten zu Social-Media-Betreuung | social2scale</title>
<meta name="description" content="Was kostet Social-Media-Betreuung, wie lange dauert der Aufbau, selbst machen oder abgeben? Konkrete Antworten mit echten Zahlen — ohne Verkaufsgerede.">
<link rel="canonical" href="${BASIS}/wissen/">
<meta property="og:site_name" content="social2scale">
<meta property="og:locale" content="de_DE">
<meta property="og:type" content="website">
<meta property="og:title" content="Wissen — ehrliche Antworten zu Social-Media-Betreuung">
<meta property="og:description" content="Preise, Zeiträume und Auswahlkriterien — konkret beantwortet, mit echten Zahlen.">
<meta property="og:url" content="${BASIS}/wissen/">
<meta property="og:image" content="${BASIS}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/fonts.css">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(daten)}</script>
</head>
<body>
${KOPF}
  <main id="main" class="w-page">
    <div class="wrap w-art">
      <a class="w-zurueck" href="/">Zur Startseite</a>
      <h1 class="w-re">Ehrliche Antworten statt <em>Verkaufsgerede</em>.</h1>
      <p class="w-lead w-re">Die Fragen, die uns im Erstgespräch am häufigsten gestellt werden, hier mit echten Zahlen beantwortet. Auch dann, wenn die Antwort lautet: Mach es selbst.</p>
      <p class="w-stand w-re">Zuletzt geprüft: ${STAND}</p>
      <ul class="w-index w-re">
        ${SEITEN.map((s, i) => `<li><a href="/wissen/${s.slug}/">
          <span class="nr">${String(i + 1).padStart(2, "0")}</span>
          <h2>${esc(s.titel)}</h2>
          <p>${esc(s.antwort.split(". ")[0])}.</p>
        </a></li>`).join("")}
      </ul>
      <section class="w-cta w-re">
        <h2>Deine Frage ist nicht <em>dabei</em>?</h2>
        <p>Schreib uns. Wir antworten persönlich, auch wenn daraus kein Auftrag wird.</p>
        <a class="w-btn" href="/anfrage/">Erstgespräch anfragen <span aria-hidden="true">→</span></a>
      </section>
    </div>
  </main>
${FUSS}
</body>
</html>`;
}

let n = 0;
for (const seite of SEITEN) {
  const ordner = join(WURZEL, "wissen", seite.slug);
  mkdirSync(ordner, { recursive: true });
  writeFileSync(join(ordner, "index.html"), seiteHtml(seite));
  console.log("  ✓ /wissen/" + seite.slug + "/");
  n++;
}
mkdirSync(join(WURZEL, "wissen"), { recursive: true });
writeFileSync(join(WURZEL, "wissen", "index.html"), uebersichtHtml());
console.log("  ✓ /wissen/ (Übersicht)");
console.log(`\n${n + 1} Seiten gebaut. Denk an: sitemap.xml ergänzen.`);
