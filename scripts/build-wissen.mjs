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
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEITEN_EN } from "./wissen-en.mjs";
import { umschalter, STEMPEL_MUSTER } from "../lib/sprachen.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = "https://social2scale.com";
const STAND = "20. August 2026";

// Alle Preise stammen 1:1 von /preise/ — niemals hier neu erfinden.
const PREISE = {
  komplett: { einmalig: "1.547,00 €", monat: "464,10 €" },
  laufend: { monat: "523,60 €" },
  starthilfe: { einmalig: "446,25 €" },
  // Profil + Branding ist Paket 02, nicht die Starthilfe fuer 446,25 € (= nur
  // neun Beitraege). Stand bis 02.10.2026 falsch auf /wissen/ und /preise/.
  profil: { einmalig: "1.297,10 €" },
  // Laufende Pakete kosten zusaetzlich eine Monatsrate zum Start (/preise/).
  start: "zzgl. 523,60 € einmalig zum Start",
  beitraege: 10,
};

// Abschluss jeder Wissensseite: die Gratis-Vorschau ist der Hauptweg (Website-Ziel = Freebie,
// Sebi 01.10.2026), das Erstgespräch der leisere zweite. Bis 10.10.2026 bot keine der sechs
// Seiten die Vorschau an — wer über Google kam, sah nur „Erstgespräch" (besucher-sim.mjs).
function abschluss(h2, p, L) {
  return `<section class="w-cta w-re">
        <h2>${h2}</h2>
        <p>${p}</p>
        <div class="w-cta-row">
          <a class="w-btn" href="${L.ctaHref}">${L.cta} <span aria-hidden="true">→</span></a>
        </div>
      </section>`;
}

const SEITEN = [
  {
    slug: "was-kostet-social-media-betreuung",
    titel: "Was kostet Social-Media-Betreuung für Coaches und B2B?",
    emWort: "kostet",
    kurz: "Was kostet Social-Media-Betreuung?",
    beschreibung:
      "Konkrete Preise für professionelle Instagram-Betreuung: Komplettpaket ab 1.547 € einmalig plus 464,10 € monatlich, laufende Betreuung ab 523,60 € im Monat zzgl. 523,60 € einmalig zum Start.",
    antwort:
      "Professionelle Social-Media-Betreuung kostet im deutschen Mittelstand typischerweise zwischen 400 und 2.000 Euro im Monat, je nachdem wie viel Arbeit abgegeben wird. Bei social2scale kostet der komplette Aufbau " +
      PREISE.komplett.einmalig + " einmalig und danach " + PREISE.komplett.monat +
      " im Monat; wer nur die laufende Erstellung abgibt, zahlt ab " + PREISE.laufend.monat + " monatlich (" + PREISE.start + ").",
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
          ["Nur das Laufende abgeben", "Das Profil steht bereits, es fehlt der Content. Ab " + PREISE.laufend.monat + " im Monat, " + PREISE.start + "."],
          ["Einmalige Starthilfe", "Neun gestaltete Beiträge samt Captions, danach postet man selbst. Ab " + PREISE.starthilfe.einmalig + " einmalig; mit Profil, Bio und Branding " + PREISE.profil.einmalig + "."],
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
          "Am stärksten wirkt die Frequenz: Wer zweimal im Monat postet, braucht ein Vielfaches der Zeit. Zehn Beiträge im Monat sind bei uns die Untergrenze: Darunter gibt es zu wenig Beiträge, um zu sehen, was bei deinen Leuten ankommt.",
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
      PREISE.laufend.monat + " im Monat (" + PREISE.start + ") ist das für die meisten Selbstständigen ab etwa 60 Euro Stundensatz der Fall.",
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
          ["Mischform", "Einmal aufbauen lassen, danach selbst weitermachen. Bei social2scale Profil und Branding für " + PREISE.profil.einmalig + ", nur die Beiträge ab " + PREISE.starthilfe.einmalig + " einmalig."],
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
          ["1. Erstgespräch", "Etwa 45 Minuten: Ziel, Zielgruppe und Ausgangslage klären. Danach steht fest, ob und in welchem Umfang eine Zusammenarbeit sinnvoll ist."],
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
  {
    slug: "ki-fuer-social-media-nutzen",
    geprueft: "2026-11-09",
    stand: "Zuletzt geprüft: 9. November 2026",
    titel: "Wie nutze ich KI sinnvoll für Social Media?",
    emWort: "KI",
    kurz: "KI sinnvoll nutzen",
    beschreibung:
      "Wofür KI bei Social Media wirklich hilft, wo sie schadet und wie du anfängst: Ideen, Entwürfe, Untertitel und Auswertung, ohne dass alles gleich klingt.",
    antwort:
      "KI hilft bei Social Media dort am meisten, wo sich Arbeit wiederholt: Ideen sammeln, erste Entwürfe schreiben, Texte umformen, Videos untertiteln. Was sie nicht ersetzt, sind deine Erfahrung, deine Haltung und dein Urteil, was zu dir passt. Die beste Arbeitsteilung: Die KI liefert den Entwurf, du gibst ihm deine Stimme.",
    abschnitte: [
      {
        h: "Wofür KI heute gut taugt",
        liste: [
          ["Ideen", "Sammle die Fragen, die dir Kundinnen und Kunden stellen, und lass dir daraus Themen vorschlagen. Die besten Beiträge beantworten eine echte Frage."],
          ["Erste Entwürfe", "Caption, Gliederung für ein Karussell, drei Varianten für den ersten Satz. Du wählst aus und schreibst um, statt vor einem leeren Feld zu sitzen."],
          ["Umformen", "Aus einem Text ein Reel-Skript machen, aus einem Reel eine Story, aus einem Beitrag einen Newsletter. Ein Gedanke, mehrere Formate."],
          ["Video", "Untertitel automatisch erstellen und Schnittvorschläge bekommen. Das spart beim Video die meiste Zeit."],
          ["Auswerten", "Kommentare und Nachrichten zusammenfassen lassen: Welche Fragen kommen immer wieder? Daraus entstehen die nächsten Themen."],
        ],
      },
      {
        h: "Wo KI dir schadet",
        p: [
          "Ohne Vorgaben schreibt KI Texte, die nach allen anderen klingen. Wer so postet, wird austauschbar, und genau das Gegenteil willst du mit einem eigenen Auftritt erreichen.",
          "KI erfindet manchmal Fakten, Zahlen und Quellen. Alles, was nach einer Tatsache klingt, prüfst du selbst, bevor es online geht. Bei Gesundheit, Recht und Geld gilt das doppelt: Versprechen, die du nicht halten darfst, bleiben deine Verantwortung, egal wer den Text geschrieben hat.",
          "Bei Bildern gilt: Erfundene Menschen und Orte wirken schnell unecht. Eigene Fotos von dir und deiner Arbeit bauen mehr Vertrauen auf als jedes generierte Bild.",
        ],
      },
      {
        h: "So fängst du an",
        liste: [
          ["1. Kontext geben", "Schreib der KI, wer du bist, für wen du arbeitest und wie du sprichst. Füge zwei, drei eigene Texte als Beispiel an."],
          ["2. Varianten verlangen", "Lass dir nicht den fertigen Beitrag geben, sondern drei Ansätze. Du entscheidest, welcher zu dir passt."],
          ["3. Laut lesen", "Lies den Entwurf laut. Alles, was du so nie sagen würdest, fliegt raus oder wird in deinen Worten neu geschrieben."],
        ],
      },
      {
        h: "Wie wir das bei social2scale machen",
        p: [
          "Wir nutzen eigene Werkzeuge mit KI für die Fleißarbeit, etwa für Entwürfe, Untertitel und Schnitt. Jeder Beitrag geht aber über einen Menschen und stützt sich nur auf Aussagen, die du selbst bestätigt hast. So bleibt dein Auftritt deiner, auch wenn die KI mitarbeitet.",
        ],
      },
    ],
  },
  {
    slug: "was-posten-damit-kunden-kommen",
    geprueft: "2026-11-09",
    stand: "Zuletzt geprüft: 9. November 2026",
    titel: "Was und wann soll ich posten, damit Kunden kommen?",
    emWort: "posten",
    kurz: "Was und wann posten?",
    beschreibung:
      "Welche Beiträge aus Followern Anfragen machen, wie du den richtigen Zeitpunkt in deiner eigenen Statistik findest und wie ein Beitrag zur Anfrage führt, ohne aufdringlich zu sein.",
    antwort:
      "Poste, was die Fragen deiner Wunschkundschaft beantwortet und zeigt, wie du arbeitest. Regelmäßigkeit bringt mehr als der perfekte Zeitpunkt, und wann deine Follower online sind, zeigt dir deine eigene Instagram-Statistik. Damit aus einem Beitrag eine Anfrage wird, braucht er am Ende einen klaren, einfachen nächsten Schritt.",
    abschnitte: [
      {
        h: "Drei Sorten Beiträge, die zusammen verkaufen",
        liste: [
          ["Wissen", "Du beantwortest eine Frage, die deine Kundschaft wirklich hat. Das zeigt, dass du dich auskennst, und wird gespeichert und geteilt."],
          ["Einblick", "Wie du arbeitest, wer du bist, was dich antreibt. Menschen kaufen bei Menschen, denen sie vertrauen."],
          ["Angebot", "Was genau du anbietest, für wen und wie man startet. Ohne diese Beiträge weiß niemand, dass man bei dir kaufen kann."],
        ],
      },
      {
        h: "Wann du postest",
        p: [
          "Eine Uhrzeit, die für alle gilt, gibt es nicht. Mit einem professionellen Konto zeigt dir Instagram unter Statistiken, zu welchen Tagen und Stunden deine Follower am aktivsten sind. Dort fängst du an und schaust nach ein paar Wochen, welche Beiträge besser liefen.",
          "Wichtiger als die Uhrzeit ist der Rhythmus: lieber zwei, drei Beiträge pro Woche, die du durchhältst, als eine Woche täglich und dann einen Monat nichts. In unserer Betreuung sind es zehn Beiträge im Monat.",
        ],
      },
      {
        h: "Vom Beitrag zur Anfrage",
        p: [
          "Jeder Beitrag braucht ein Ende, das zum Thema passt: eine Frage an die Lesenden, ein Hinweis zum Speichern oder eine Einladung, dir zu schreiben. Je kleiner der Schritt, desto eher wird er gemacht. Eine Direktnachricht mit einem Stichwort ist für viele leichter als ein Formular.",
          "Aufdringlich wird es erst, wenn jeder Beitrag verkaufen will. Wer vorher geholfen hat, darf auch sagen, was er anbietet.",
        ],
      },
    ],
  },
  {
    slug: "reichweite-und-community-aufbauen",
    geprueft: "2026-11-09",
    stand: "Zuletzt geprüft: 9. November 2026",
    titel: "Wie baue ich auf Social Media Reichweite und eine echte Community auf?",
    emWort: "Community",
    kurz: "Reichweite und Community",
    beschreibung:
      "Woher Reichweite kommt, warum Antworten wichtiger sind als Follower-Zahlen und weshalb gekaufte Follower mehr schaden als nutzen.",
    antwort:
      "Reichweite entsteht durch Beiträge, die gespeichert, geteilt und zu Ende geschaut werden. Eine Community entsteht dadurch, dass du antwortest, nachfragst und Gespräche führst. Beides braucht ein klares Thema: Wer weiß, wofür du stehst, kommt wieder und bringt andere mit.",
    abschnitte: [
      {
        h: "Woher Reichweite kommt",
        liste: [
          ["Reels", "Sie werden auch Menschen gezeigt, die dir noch nicht folgen. Der erste Satz entscheidet, ob jemand dranbleibt."],
          ["Karussells", "Gut zum Speichern, weil sie etwas erklären, das man später noch einmal braucht."],
          ["Ein klares Thema", "Wer jeden Monat etwas anderes erzählt, muss bei jedem Beitrag neu um Aufmerksamkeit kämpfen. Ein Thema, das man mit dir verbindet, trägt jeden Beitrag."],
        ],
      },
      {
        h: "Wie aus Followern eine Community wird",
        p: [
          "Antworte auf Kommentare und Nachrichten, und stell Fragen, auf die man gern antwortet. In Storys helfen Umfragen und Fragesticker, weil sie mit einem Tipp beantwortet sind.",
          "Eine Community ist kein Publikum, sondern ein Gespräch. Wer merkt, dass seine Frage zu einem Beitrag geworden ist, bleibt und erzählt es weiter.",
        ],
      },
      {
        h: "Echte Follower statt großer Zahlen",
        p: [
          "Gekaufte Follower sehen deine Beiträge nicht, reagieren nicht und kaufen nicht. Instagram untersagt in seinen Nutzungsbedingungen unechte Interaktionen. Und je mehr Follower nie reagieren, desto schwächer wirken deine Beiträge.",
          "Tausend Menschen, die sich für dein Thema interessieren, sind mehr wert als zehntausend, die zufällig da sind.",
        ],
      },
    ],
  },
];

// Zweisprachig (17.10.2026, lib/sprachen.mjs): dieselben Bausteine je Sprache,
// 1:1 auch hinter dem Knopf (Sebi 23.10.2026): /en/free/ fuehrt in den englischen Funnel.
const SPRACHEN = {
  de: {
    lang: "de", locale: "de_DE", inLanguage: "de-DE", pfad: "/wissen/", start: "/", seiten: SEITEN,
    stand: "Zuletzt geprüft: " + STAND,
    zurueck: "Alle Antworten", zurStart: "Zur Startseite",
    cta: "Kostenlos starten", ctaHref: "/gratis/",
    abschlussH2: "Wie sähe das bei <em>dir</em> aus?",
    abschlussP: "Erst schauen wir kurz, ob wir zusammenpassen. Dann Vorschau oder Gespräch.",
    weiter: "Weitere Antworten",
    ueTitel: "Wissen — ehrliche Antworten zu Social-Media-Betreuung | social2scale",
    ueBeschr: "Was kostet Social-Media-Betreuung, wie lange dauert der Aufbau, selbst machen oder abgeben? Konkrete Antworten mit echten Zahlen — ohne Verkaufsgerede.",
    ueOgTitel: "Wissen — ehrliche Antworten zu Social-Media-Betreuung",
    ueOgBeschr: "Preise, Zeiträume und Auswahlkriterien — konkret beantwortet, mit echten Zahlen.",
    ueH1: "Ehrliche Antworten statt <em>Verkaufsgerede</em>.",
    ueLead: "Die Fragen, die uns im Erstgespräch am häufigsten gestellt werden, hier mit echten Zahlen beantwortet. Auch dann, wenn die Antwort lautet: Mach es selbst.",
    ueAbschlussH2: "Deine Frage ist nicht <em>dabei</em>?",
    ueAbschlussP: "Sieh dir an, wie dein Auftritt aussehen könnte: in 60 Sekunden, kostenlos. Oder schreib uns, wir antworten persönlich.",
  },
  en: {
    lang: "en", locale: "en_US", inLanguage: "en-US", pfad: "/en/knowledge/", start: "/en/", seiten: SEITEN_EN,
    stand: "Last reviewed: August 20, 2026",
    zurueck: "All answers", zurStart: "Back to the homepage",
    cta: "Get started free", ctaHref: "/en/free/",
    abschlussH2: "What would this look like for <em>you</em>?",
    abschlussP: "First we take a quick look at whether we’re a good fit. Then a preview or a call.",
    weiter: "More answers",
    ueTitel: "Knowledge — honest answers about social media management | social2scale",
    ueBeschr: "How much does social media management cost, how long does it take to build, do it yourself or hand it off? Concrete answers with real numbers — no sales talk.",
    ueOgTitel: "Knowledge — honest answers about social media management",
    ueOgBeschr: "Prices, timeframes and selection criteria — answered concretely, with real numbers.",
    ueH1: "Honest answers instead of <em>sales talk</em>.",
    ueLead: "The questions we get asked most on intro calls, answered here with real numbers. Even when the answer is: do it yourself.",
    ueAbschlussH2: "Your question isn’t <em>here</em>?",
    ueAbschlussP: "See what your presence could look like: in 60 seconds, free. Or write to us, we answer personally.",
  },
};

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

function schema(seite, L) {
  const daten = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{
      "@type": "Question",
      name: seite.titel,
      acceptedAnswer: { "@type": "Answer", text: antwortText(seite) },
    }],
    isPartOf: { "@type": "WebSite", "@id": BASIS + "/#website", name: "social2scale", url: BASIS + "/" },
    publisher: {
      "@type": "Organization", "@id": BASIS + "/#org", name: "social2scale", url: BASIS + "/",
      logo: BASIS + "/assets/avatar-s2s.png",
    },
    dateModified: seite.geprueft || "2026-08-20",
    inLanguage: L.inLanguage,
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
const FUSS_ROH = readFileSync(join(WURZEL, "scripts", "wissen-fuss.html"), "utf8");

// Kopf mit Sprach-Umschalter (leer, solange die Schwester fehlt).
function kopf(pfad) {
  const marke = 'alt="social2scale">';
  if (!KOPF.includes(marke)) throw new Error("wissen-kopf.html: Logo-Marke fehlt");
  const wechsel = umschalter(pfad, "sprache", WURZEL);
  return wechsel ? KOPF.replace(marke, marke + "\n      " + wechsel) : KOPF;
}

// Fusszeile je Sprache. Die Rechts-Links waren relativ (../impressum/) und
// fuehrten von /wissen/<artikel>/ auf /wissen/impressum/ — eine Seite, die es
// nicht gibt (gefunden 17.10.2026). Jetzt feste Pfade.
const FUSS_EN = [
  ['aria-label="social2scale — zur Startseite"', 'aria-label="social2scale — to the homepage"'],
  ['href="/" aria-label="social2scale — to the homepage"', 'href="/en/" aria-label="social2scale — to the homepage"'],
  ["Premium Social-Growth für Coaches &amp; Experten.", "Done-for-you social media growth for coaches &amp; experts."],
  ['aria-label="Rechtliche Seiten"', 'aria-label="Legal pages"'],
  ['<a href="/impressum/">Impressum</a>', '<a href="/impressum/" hreflang="de">Legal notice (German)</a>'],
  ['<a href="/datenschutz/">Datenschutz</a>', '<a href="/en/privacy/">Privacy policy</a>'],
];
function fuss(L) {
  let f = FUSS_ROH.replace('href="../impressum/"', 'href="/impressum/"').replace('href="../datenschutz/"', 'href="/datenschutz/"');
  if (L.lang === "en") {
    for (const [alt, neu] of FUSS_EN) {
      if (!f.includes(alt)) throw new Error("wissen-fuss.html: " + alt + " fehlt");
      f = f.replace(alt, neu);
    }
  }
  return f;
}

function seiteHtml(seite, L) {
  const pfad = L.pfad + seite.slug + "/";
  const url = BASIS + pfad;
  const andere = L.seiten.filter((s) => s.slug !== seite.slug);
  return `<!DOCTYPE html>
<html lang="${L.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Sicherheits-Block (CSP, Referrer-Policy, Rahmenschutz) setzt
     scripts/csp-haerten.mjs nach dem Bau ein — einzige Quelle. -->
<title>${esc(seite.titel)} | social2scale</title>
<meta name="description" content="${esc(seite.beschreibung)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="social2scale">
<meta property="og:locale" content="${L.locale}">
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
<link rel="stylesheet" href="/abschluss.css">
<link rel="stylesheet" href="/bedienung.css">
<style>${CSS}</style>
${schema(seite, L)}
</head>
<body>
${kopf(pfad)}
  <main id="main" class="w-page">
    <article class="wrap w-art">
      <a class="w-zurueck" href="${L.pfad}">${L.zurueck}</a>
      <h1 class="w-re">${headline(seite)}</h1>
      <p class="w-lead w-re">${esc(seite.antwort)}</p>
      <p class="w-stand w-re">${seite.stand || L.stand}</p>
      ${seite.abschnitte.map(abschnittHtml).join("")}
      ${abschluss(L.abschlussH2, L.abschlussP, L)}
      <nav class="w-weiter" aria-label="${L.weiter}">
        <h2>${L.weiter}</h2>
        <ul>${andere.map((s) => `<li><a href="${L.pfad}${s.slug}/">${esc(s.kurz)}</a></li>`).join("")}</ul>
      </nav>
    </article>
  </main>
${fuss(L)}
</body>
</html>`;
}

function uebersichtHtml(L) {
  const daten = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: L.seiten.map((s) => ({
      "@type": "Question",
      name: s.titel,
      acceptedAnswer: { "@type": "Answer", text: s.antwort, url: BASIS + L.pfad + s.slug + "/" },
    })),
    inLanguage: L.inLanguage,
    dateModified: "2026-08-20",
  };
  return `<!DOCTYPE html>
<html lang="${L.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Sicherheits-Block (CSP, Referrer-Policy, Rahmenschutz) setzt
     scripts/csp-haerten.mjs nach dem Bau ein — einzige Quelle. -->
<title>${L.ueTitel}</title>
<meta name="description" content="${L.ueBeschr}">
<link rel="canonical" href="${BASIS}${L.pfad}">
<meta property="og:site_name" content="social2scale">
<meta property="og:locale" content="${L.locale}">
<meta property="og:type" content="website">
<meta property="og:title" content="${L.ueOgTitel}">
<meta property="og:description" content="${L.ueOgBeschr}">
<meta property="og:url" content="${BASIS}${L.pfad}">
<meta property="og:image" content="${BASIS}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/abschluss.css">
<link rel="stylesheet" href="/bedienung.css">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(daten)}</script>
</head>
<body>
${kopf(L.pfad)}
  <main id="main" class="w-page">
    <div class="wrap w-art">
      <a class="w-zurueck" href="${L.start}">${L.zurStart}</a>
      <h1 class="w-re">${L.ueH1}</h1>
      <p class="w-lead w-re">${L.ueLead}</p>
      <p class="w-stand w-re">${L.stand}</p>
      <ul class="w-index w-re">
        ${L.seiten.map((s, i) => `<li><a href="${L.pfad}${s.slug}/">
          <span class="nr">${String(i + 1).padStart(2, "0")}</span>
          <h2>${esc(s.titel)}</h2>
          <p>${esc(s.antwort.split(". ")[0])}.</p>
        </a></li>`).join("")}
      </ul>
      ${abschluss(L.ueAbschlussH2, L.ueAbschlussP, L)}
    </div>
  </main>
${fuss(L)}
</body>
</html>`;
}

// EN zuerst: der Umschalter einer Seite erscheint nur, wenn ihre Schwester
// schon auf der Platte liegt.
// Der Aktualitaets-Stempel einer EN-Seite bleibt beim Neubau erhalten — neu
// gesetzt wird er nur mit scripts/sprachen-stempel.mjs, wenn der englische
// Text wirklich nachgezogen ist.
function schreibe(datei, html, L) {
  let aus = html;
  if (L.lang === "en" && existsSync(datei)) {
    const alt = readFileSync(datei, "utf8").match(STEMPEL_MUSTER);
    if (alt) aus = aus.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + alt[0]);
  }
  writeFileSync(datei, aus);
}

let n = 0;
for (const L of [SPRACHEN.en, SPRACHEN.de]) {
  if (L.lang === "en" && SEITEN_EN.length !== SEITEN.length) {
    throw new Error(`wissen-en.mjs hat ${SEITEN_EN.length} Seiten, build-wissen.mjs ${SEITEN.length}`);
  }
  for (const seite of L.seiten) {
    const ordner = join(WURZEL, L.pfad.slice(1), seite.slug);
    mkdirSync(ordner, { recursive: true });
    schreibe(join(ordner, "index.html"), seiteHtml(seite, L), L);
    console.log("  ✓ " + L.pfad + seite.slug + "/");
    n++;
  }
  mkdirSync(join(WURZEL, L.pfad.slice(1)), { recursive: true });
  schreibe(join(WURZEL, L.pfad.slice(1), "index.html"), uebersichtHtml(L), L);
  console.log("  ✓ " + L.pfad + " (Übersicht)");
  n++;
}
console.log(`\n${n} Seiten gebaut. Danach: node scripts/build-pages.mjs (hreflang) und csp-haerten.mjs.`);
// Lichtstudio (27.10.2026): die frisch erzeugten Seiten bekommen ihren Raum aus der einen Quelle zurück
import("node:child_process").then(({ execFileSync }) => { execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "raum-bauen.mjs")], { stdio: "inherit" }); execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "szenen-bauen.mjs")], { stdio: "inherit" }); });
