# Inhaltsstrang für Google + gemeinsame Shell

**Datum:** 28.07.2026 · **Bereich:** externe Fläche (`~/s2s-extern`, Branch `feat/website-extern`)

---

## 🛑 Korrektur vom 29.07.2026 — Teil 1 dieses Specs ist überholt

**Der Inhaltsstrang (Abschnitt 1) wird vorerst NICHT gebaut.** Die Begründung
darin beruhte auf einer Annahme, die der Prüfung nicht standhält.

Ich hatte behauptet, es gebe eine Lücke — bei den Compliance-Themen sei „die
Schnittmenge unbesetzt, nicht das Thema". **Das ist falsch.** Eine Prüfung aller
vier Richtungen am 29.07. ergab: jede ist besetzt, und zwar von Gegnern, gegen
die eine neue Domain nicht gewinnt.

| Richtung | Wer die Ergebnisse hält |
|---|---|
| Preise | agenturfinder · unaice · welikesocialmedia · nexaviral · social-media-agentur.net |
| HWG für Coaches | StaySana · onwalt · aktivKANZLEI · impulse.de — **Kanzleien** |
| Impressumspflicht Instagram | e-recht24 · easyRechtssicher · zerodox · juris.media — **Kanzleien** |
| Feed-Vorschau-Tool | GridPeek · Publer · CarouselMaker · aicarousels · App-Store-Apps |
| Social-Media-KPIs | omt.de · agorapulse · Lazi Akademie · reelzz |

**Die Unterscheidung, auf die es ankommt:** starke Konkurrenz spricht *für*
Nachfrage, nicht dagegen. Das Hindernis ist die **Rankingfähigkeit**.
`social2scale.com` ist wenige Monate alt, hat kaum Verlinkungen und keine
thematische Autorität. Bei Rechtsthemen gewichtet Google Expertise zusätzlich
streng — dort gegen Anwaltskanzleien anzutreten ist aussichtslos.

Realistisch bringen sechs Artikel in diesem Umfeld frühestens in 6–12 Monaten
messbaren Traffic. Das spricht nicht gegen Inhalte, aber es widerlegt die
Kernaussage dieses Specs: **Content ist derzeit nicht der schnellste Hebel für
Leads.** Schneller wirken der Instagram-Bio-Link (selbst gesteuerter Traffic),
die Preistransparenz (Conversion statt Traffic) und der Funnel mit seiner
teilbaren Share-Karte.

**Was gültig bleibt:** Abschnitt 2 und 3 — die gemeinsame Shell. Sie ist am
29.07. gebaut, geprüft und live (Phase 1+2, Commits bis `cbe8a50`). Jeder
künftige Inhalt profitiert davon, unabhängig davon, wann er kommt.

🔑 **Learning:** Die Nachfrage- und Wettbewerbsprüfung gehört **vor** den Spec,
nicht danach. Ich habe hier eine Strategie begründet und erst anschließend
geprüft, ob ihre Prämisse stimmt.

---

## Ausgangslage

Das SEO-Audit vom 28.07. ergab 72/100. Die Technik ist besser als bei den meisten
Agenturseiten — was fehlt, ist etwas, wofür man ranken kann: **vier indexierbare
Seiten, alle rein verkäuferisch, null informationaler Inhalt.** Wer „social2scale"
nicht kennt, hat keinen Suchbegriff, über den er die Firma findet. Das ist der Grund,
warum über Google keine Leads kommen — kein technischer Fehler.

Zweite Ausgangslage: es gibt **keinerlei Infrastruktur für Inhalte.** Jede Seite ist
eine handgebaute HTML-Datei mit vollständig eingebettetem CSS (`index.html` 103 KB,
Unterseiten 70–85 KB), jede mit eigener Kopie von Design-Tokens, Navigation und
Footer. Bei drei Artikeln geht das. Bei zwanzig ist die Navigation zwanzigfach
dupliziert. Daran sterben Content-Stränge — nicht am Schreiben, am Nachziehen.

## Ziel

1. Ein laufender Inhaltsstrang, für den die Seite bei Google gefunden werden kann.
2. Eine Bauweise, in der ein weiterer Artikel billig ist statt teuer.
3. Kein Bruch an den vier Bestandsseiten, die das Geschäft tragen.

## Nicht-Ziele

- **Kein CMS, kein Framework.** GitHub Pages liefert statische Dateien aus; ein
  Node-Skript ohne Abhängigkeiten reicht und passt zum Bestand (`scripts/` existiert).
- **Keine Inhalte, die Sebis oder Phils Stimme brauchen.** Sebi hat entschieden,
  vorerst ohne eigene Zuarbeit zu starten (siehe „Bekannte Einschränkung").
- **Keine Umgestaltung.** Der Port ändert die Bauweise, nicht das Aussehen. Jede
  optische Abweichung ist ein Fehler, kein Feature.

---

## 1 · Inhaltlicher Zuschnitt

Zwei Stränge, ausgewählt nach einem harten Kriterium: **Recherche allein muss
hochwertigen Text ergeben.** Fakten, Marktdaten und Gesetze sind belastbar
recherchierbar — Meinungen und Erfahrungen nicht. Genau dort entsteht KI-Slop.

### Strang A — Entscheidungs-Inhalte

Zweck ist **Conversion, nicht Ranking**. Recherche am 28.07. zeigte: „Was kostet
Social Media Betreuung" ist hart umkämpft (Agenturfinder, unaice, welikesocialmedia,
nexaviral, social-media-agentur.net). Als neue Domain ohne Autorität rankt s2s dort
so bald nicht. Der Wert liegt darin, dass **jeder Besucher diese Frage im Kopf hat**
— und dass die Seite die bisher komplett fehlende Preistransparenz löst
(laut Recherche der Frust Nr. 1 bei 69 % der B2B-Käufer).

| Slug | Seite | Kern |
|---|---|---|
| `was-kostet-social-media-betreuung` | Was kostet Social-Media-Betreuung wirklich? | Echte Marktspannen: Freelancer 400–900 €, Schnitt 800–2.500 €, KMU-Full-Service 1.800–4.000 €, Stundensätze 60–180 €. Dazu die eigene Einordnung. |
| `agentur-freelancer-oder-selbst` | Agentur, Freelancer oder selbst machen? | Ehrliche Rechnung inklusive Eigenzeit. Wer selbst machen sollte, erfährt es. |
| `serioese-social-media-agentur-erkennen` | Woran erkennst du eine seriöse Agentur? | Kriterienkatalog. Verweist auf `/results/` — saubere Kennzahlen-Definitionen als Prüfstein. |

### Strang C — Compliance für Coaches

Das Unterscheidungsmerkmal. Recherche zeigte: das Thema HWG ist gut abgedeckt
(Händlerbund, Kanzleien, BVMed, Johner-Institut) — aber **ausschließlich für
Arzneimittel, Medizinprodukte und Apotheken.** Niemand schreibt für „du bist
Yoga-Coach, postest über Rückenschmerzen und weißt nicht, was du sagen darfst".
**Die Lücke ist die Schnittmenge, nicht das Thema.**

| Slug | Seite | Kern |
|---|---|---|
| `instagram-fuer-coaches-hwg-uwg` | Instagram für Coaches: HWG und UWG in der Praxis | Recht erklärt für Leute, die posten — nicht für Apotheken. |
| `heilversprechen-instagram-abmahnung` | Welche Sätze abmahnfähig sind | Konkrete Formulierungen, jeweils mit erlaubter Alternative. |
| `impressumspflicht-instagram` | Impressumspflicht auf Instagram (§ 5 DDG) | Kleine Frage, große Angst, klar beantwortbar. |

s2s hat zu beiden Themen echte Berührung aus der Arbeit mit Nicole (HWG) und
Sabine (UWG). Das ist Rückversicherung gegen sachliche Fehler, keine Quelle für
Behauptungen.

### Bewusst zurückgestellt

Strang B (Problem-Inhalte wie „Content-Ideen für Coaches"): hohes Suchvolumen,
aber ohne eigene Substanz automatisch generisch. Kommt, wenn Zuarbeit fließt.

---

## 2 · Architektur

Übernommen aus dem VH-v3-Port (`learning_v3_site_port_patterns`), dort bewährt.

```
s2s.css                     ← Tokens + Shell: Navigation, Footer, Buttons, Reveals
lib/shell.mjs               ← Kopf, Navigation, Footer als EINE Quelle
content/<slug>.md           ← Text + Kopfdaten je Artikel
scripts/build-content.mjs   ← erzeugt ratgeber/<slug>/index.html + Übersicht
```

**Regel:** geteiltes CSS in `s2s.css`, **seiten-eigenes CSS bleibt inline** in der
jeweiligen Datei, mit eindeutigem Präfix und `<body class="…-page">`.

Der Grund ist Betrieb, nicht Ästhetik: zwei Seiten kollidieren nie über eine
gemeinsame Datei. Zwei Sessions können parallel je eine Seite bauen. Nach der
Kollision vom 28.07. ist das kein theoretischer Vorteil.

**Was der Bauschritt automatisch mitmacht**, weil es sonst vergessen wird:

| | |
|---|---|
| Übersichtsseite `/ratgeber/` | aus den vorhandenen Dateien erzeugt, nicht gepflegt |
| `sitemap.xml` | neue Artikel tragen sich ein; `lastmod` weiter aus Git (`scripts/sitemap-lastmod.sh`) |
| `Article`-Schema | pro Seite, plus `FAQPage` wo Fragen vorkommen |
| Interne Verlinkung | jeder Artikel → passende Leistungsseite + `/gratis/` |
| Navigation und Footer | an **einer** Stelle statt in jeder Datei |

---

## 3 · Migration in drei Phasen

> **Zum Umfang:** Das sind genau genommen zwei Vorhaben — der Port der
> Bestandsseiten (Phase 1+2) und der Inhaltsstrang (Phase 3). Sie stehen in
> einem Spec, weil das eine ohne das andere keinen Sinn ergibt: Artikel ohne
> Shell duplizieren die Navigation weiter, Shell ohne Artikel bringt nichts.
> **Umgesetzt werden sie getrennt** — Phase 1+2 bekommen einen eigenen
> Umsetzungsplan, Phase 3 einen zweiten, erst wenn der erste durch ist.

Phase 1 und 2 fassen die vier Seiten an, die das Geschäft tragen. Ein Fehler dort
ist teurer als ein fehlender Artikel. Deshalb nach jedem Schritt ein **gemessenes**
Tor, kein „sieht gut aus".

### Phase 1 — CSS extrahieren

Gemeinsame Regeln aus den vier Bestandsseiten nach `s2s.css` ziehen, seiten-eigene
Regeln inline lassen.

**Tor:** Screenshot-Vergleich vorher/nachher, je Seite, bei 390 · 768 · 1024 · 1440,
jeweils volle Seitenhöhe. **Schwelle: 0,1 % abweichende Pixel** — das deckt
Schrift-Rasterung ab und schlägt bei jeder echten Layout-Verschiebung an.
Darüber: Rückbau, kein Weiterbauen.

### Phase 2 — Shell und Bauschritt

`lib/shell.mjs` als einzige Quelle für Kopf, Navigation und Footer. Seiten
**einzeln** portiert, nicht im Block.

**Tor je Seite:** Screenshot-Vergleich · Umbruchprüfung der Menüleiste
(`offsetTop`-Zählung, nicht `scrollWidth`) · Chromium **und** WebKit · keine neuen
Konsolenfehler · Struktur-Daten unverändert.

### Phase 3 — Inhaltsstrang

`content/`, `/ratgeber/`, die sechs Artikel aus Abschnitt 1.

**Tor:** volle QA-Kette plus Prüfung, dass jeder Artikel eine eigene, nicht
generische `description` und genau ein `h1` hat.

---

## 4 · QA-Regeln

Aus den Fehlern dieser Session abgeleitet — jede Regel hat einen konkreten Anlass.

| Regel | Anlass |
|---|---|
| **Umbruch messen, nicht Überlauf.** Verschiedene `offsetTop` der Menüpunkte zählen. | Die erste Nav-Messung meldete grün über `scrollWidth`, während die Leiste bei 1024 px zweizeilig umbrach. |
| **WebKit in jede Runde.** Nicht nur Chromium. | Die gesamte visuelle Prüfung dieser Session lief auf Chromium und war blind für die CSP-Falle. |
| **Kein `upgrade-insecure-requests`** in der CSP-Meta. | Bricht auf localhost in Safari alle Assets. Am 28.07. entfernt (`a366449`). |
| **Vor dem Fix prüfen, ob man den Fehler selbst verursacht hat** (`git stash`). | Von drei Menü-Umbrüchen kamen zwei von der eigenen Änderung, einer war Altbestand. |
| **Elemente gegen die Container-Innenkante messen**, nicht nur die Seite. | „Reichweite" lief aus der Kachel, ohne Seitenüberlauf zu erzeugen. |

---

## 5 · Anti-Slop-Regeln

Verbindlich, aus `learning_v3_site_port_patterns` und `learning_anti_ki_slop_websites_2026`.

- **Keine Deko-Emoji.** Stattdessen Fineline-SVG, Geister-Nummern oder gefärbte
  Punkt-Marker. Nur semantische Zeichen bleiben (✓/✗).
- **Preise als editoriale Tarif-Liste**, nicht als SaaS-Pricing-Cards. Betrifft
  direkt `was-kostet-social-media-betreuung`.
- **Bestandstexte wörtlich übernehmen.** Der Port ändert die Bauweise, nicht die Worte.
- **Kein Satz, der mit „aus unserer Erfahrung" beginnt**, solange keine Erfahrung
  dahintersteht. Zahlen und Rechtsstand immer mit Quelle.

---

## 6 · Bekannte Einschränkung

Sebi hat entschieden, **ohne eigene Zuarbeit zu starten** — die Inhalte entstehen
zunächst aus Recherche und werden später angereichert. Der Einwand wurde benannt:
recherchebasierter Text ist bei Meinungsthemen automatisch generisch.

**Der Zuschnitt ist die Antwort darauf**: Strang A und C bestehen aus Marktdaten und
Rechtslage — beides überprüfbar. Zusätzlich bekommt jeder Artikel eine markierte,
zunächst leere Stelle für „aus der Praxis", die im Plan als offener Punkt geführt
wird, damit sie nicht vergessen wird.

## 7 · Offene Punkte

1. ~~**Nachweis der Suchnachfrage.**~~ Am 29.07. geprüft — siehe Korrektur ganz
   oben. Ergebnis: alle geprüften Richtungen sind besetzt, Phase 3 ist geparkt.
   Wieder aufnehmen lohnt erst mit echten Volumendaten (Search Console, Ahrefs,
   Sistrix) statt mit Websuche als Ersatz.
2. **Preisangaben brauchen Sebis und Phils Freigabe.** Ohne Entscheidung, was
   gezeigt wird (Ab-Preise, Spannen oder Rahmen), bleibt die Preisseite unvollständig.
3. **Rechtstexte fachlich prüfen lassen.** Strang C berührt HWG und UWG. Inhalte
   müssen als Orientierung gekennzeichnet sein, nicht als Rechtsberatung.

## 8 · Fertig ist es, wenn

- [ ] `s2s.css` existiert, die vier Bestandsseiten nutzen sie, Screenshots unverändert
- [ ] Navigation und Footer stehen an einer Stelle
- [ ] `/ratgeber/` existiert und wird erzeugt, nicht gepflegt
- [ ] Sechs Artikel live, je mit eigener `description`, `Article`-Schema, internen Links
- [ ] `sitemap.xml` enthält sie automatisch
- [ ] Chromium und WebKit sauber, kein Umbruch, keine neuen Konsolenfehler
- [ ] Jeder Artikel hat die markierte Stelle für spätere Praxis-Substanz
