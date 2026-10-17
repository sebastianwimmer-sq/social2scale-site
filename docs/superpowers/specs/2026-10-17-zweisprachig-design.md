# social2scale.com zweisprachig (DE/EN) — Design

Stand 17.10.2026. Danach folgt vegetarianhulk.de als eigenes Projekt nach demselben Muster.

## Absicht und Warum

Sebi will die Seite komplett auf Englisch, mit einem Umschalter (Flagge) oben, damit
englischsprachige Endkundinnen, Marken und KI-Suchen (ChatGPT, Claude, Perplexity …) social2scale
finden, verstehen und anfragen. Das soll ein **fester Haken für die Zukunft** sein: jede neue oder
geänderte deutsche Seite bekommt ihre englische Fassung mit, sonst wird nicht ausgeliefert.

Entscheidungen Sebi 17.10.:
- Englischsprachige Anfragen werden auf Englisch betreut (Phil führt das Gespräch auf Englisch).
- Die Leistung gibt es **komplett auf Englisch**: Beiträge, Profil, Branding entstehen für
  englischsprachige Kundinnen nativ auf Englisch. Die EN-Seiten beschreiben also dieselbe Leistung
  wie die DE-Seiten, ohne Einschränkung.
- Die Website-Texte werden **nativ** geschrieben (Transkreation: Ton, Redewendungen, Satzbau wie von
  einer englischsprachigen Agentur), nicht Wort für Wort übersetzt.
- Hauptknopf auf EN ist **„Book a free intro call“** statt „Gratis-Vorschau“; er führt auf ein
  kleines englisches Formular `/en/contact/`. Die Gratis-Vorschau gibt es auf Englisch vorerst nicht.

Blind Spot (Ticket an Sebi/Phil, nicht Teil dieses Projekts): die Produktion (Beitragsgenerator,
Reel-Werkstatt, Social Hub, Mails) ist heute deutsch. Das Versprechen „alles auf Englisch“ gilt
ab Livegang der EN-Seite; die erste englische Kundin braucht vorher eine englische Produktionsstrecke.

## Ziele

- Jede Besucherseite (siehe Umfang) existiert als echte, statische englische Seite unter `/en/…`.
- Umschalter DE | EN in Navigation und Mobil-Menü, führt auf **dieselbe** Seite in der anderen Sprache.
- KI- und Suchmaschinen lesen beide Sprachen: `hreflang` (de, en, x-default=de) auf beiden
  Schwestern, `<html lang="en">`, `og:locale` + `og:locale:alternate`, Sitemap mit beiden Sprachen
  inkl. `xhtml:link`, englische `llms.txt`-Fassung (`/en/llms.txt`, im DE-`llms.txt` verlinkt),
  strukturierte Daten (FAQPage auf Wissen-Seiten) auf Englisch und wortgleich zum sichtbaren Text.
- Anfragen aus der englischen Seite kommen im CRM mit erkennbarer Sprache an (`sprache: "en"`),
  damit Phil weiß, dass er auf Englisch antwortet.
- Tor `sprachen-check` in `scripts/pruefen.sh`: rot, wenn eine DE-Seite aus der Umfangsliste keine
  EN-Schwester hat, wenn die EN-Schwester gegen einen älteren DE-Stand übersetzt wurde, wenn
  `hreflang` fehlt/nicht wechselseitig ist oder wenn der Umschalter nicht auf die Schwester zeigt.

## Nicht-Ziele

- Keine Übersetzung im Browser (JS-Slider, Google-Translate-Widget). KI-Crawler führen keine
  Klicks aus; nur fertig ausgeliefertes HTML zählt.
- Keine automatische Weiterleitung nach Browsersprache (sperrt Crawler aus, nervt Menschen).
  Die gewählte Sprache wird per `localStorage` gemerkt, aber nur für den Umschalter-Zustand,
  nie für Weiterleitungen.
- Gratis-Vorschau-Funnel (`start.social2scale.com`, Worker `free-content`) wird in diesem Projekt
  NICHT übersetzt — er erzeugt deutsche Beiträge für deutschsprachige Profile.
- Impressum und Datenschutz werden nicht übersetzt (Rechtstexte, genau einmal vorhanden).
  Die EN-Fußzeile verlinkt die deutschen Fassungen mit Hinweis „(German)“.
- Danke-Seiten des Studios (`danke/studio/*`), `onboarding/`, `links/`, Mail-Vorlagen: bleiben Deutsch
  (Kundinnen-/Kaufstrecke, deutschsprachige Produkte).

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Englische Seite, die Knappheit, Zahlen oder Ergebnisse behauptet, die auf Deutsch belegt sind,
  aber in der Übersetzung verschoben werden (Preise in €, inkl. USt — unverändert übernehmen).
- Maschinenhaftes Englisch, das nicht nach Sebi klingt (Voice: `user_sebi_dna.md` Abschnitt 3 + 11).
- EN-Seite, die auf den deutschen Funnel schickt, ohne das zu sagen.
- Eine bestehende deutsche Seite ändert sich sichtbar (außer Umschalter, `hreflang`-Zeilen,
  `llms.txt`-Verweis). Vorher/nachher-Vergleich je DE-Seite belegt das.
- PEAKING oder vegetarianhulk.de taucht auf (Marken-Trennung).

## Umfang (Seitenliste, DE → EN)

| DE | EN |
|---|---|
| `/` | `/en/` |
| `/preise/` | `/en/pricing/` |
| `/ablauf/` | `/en/process/` |
| `/for-you/` | `/en/for-you/` |
| `/results/` | `/en/results/` |
| `/about/` | `/en/about/` |
| `/anfrage/` | `/en/contact/` |
| `/wissen/` + 5 Artikel | `/en/knowledge/` + 5 Artikel (englische Slugs) |
| `/404.html` | eine zweisprachige 404 (Pages kennt nur eine) |

Die Zuordnung steht als **eine Quelle** in `lib/sprachen.mjs` (Paarliste). Navigation, Umschalter,
`hreflang`, Sitemap und Tor lesen alle daraus.

## Wie (entschieden)

- **Statische Dateien**, keine neue Build-Abhängigkeit. Die Seiten sind handgepflegtes HTML; die
  EN-Seiten werden einmal aus der DE-Seite übersetzt und als eigene Dateien eingecheckt.
- **Shell zweisprachig:** `lib/shell.mjs` bekommt Texte je Sprache; `build-pages.mjs` setzt Nav,
  Mobil-Menü, Footer und Umschalter in DE- und EN-Seiten ein (EN-Seiten in `SEITEN` aufnehmen).
- **Wissen:** `build-wissen.mjs` erzeugt EN aus einer englischen Quelle neben der deutschen.
- **Umschalter:** zwei echte Links (`<a hreflang="de" lang="de">DE</a>` / `EN`) mit kleiner Flagge
  als SVG (selbst gehostet, nicht als Emoji — Windows zeigt keine Flaggen-Emojis), aktiver Zustand
  sichtbar, Trefferfläche ≥ 44 px, Tastatur, beide Themes. Funktioniert ohne JS.
- **Formular:** `/anfrage/` ist heute kein Formular, sondern leitet auf `start.social2scale.com/?weg=b`
  (Worker `free-content`, schreibt Weg B selbst ins CRM). `/en/contact/` ist ein eigenes kleines
  englisches Formular (Name, E-Mail, Instagram-Handle, Nachricht, Einwilligung nie vorbefüllt), das
  **denselben CRM-Weg wie Weg B** nutzt, additiv um `sprache: "en"` erweitert; Danke-Zustand
  auf Englisch erst nach Server-OK; Honeypot markiert statt verwirft. Formular gilt erst als geprüft,
  wenn es einmal echt abgeschickt wurde (Prüfkonto, danach im CRM archivieren).
- **Navigation EN:** `AKTIONEN` in `lib/shell.mjs` je Sprache; EN zeigt „Book a free intro call“ →
  `/en/contact/`. Die DE-Navigation bleibt byte-gleich.
- **Wahrheit auf EN:** `aussagen-check.py` kennt nur deutsche Wortstämme. Das Register s2s bekommt
  englische Muster für dieselben Verbote (additiv, gegen die echte EN-Datei gegengeprüft); übersetzte
  Kundenstimmen aus `data/bewertungen.json` tragen „translated from German“. Zusätzlich nimmt Sebi
  alle EN-Seiten vor dem Merge an einer anklickbaren Vorschau ab.
- **Sprachvariante:** amerikanisches Englisch (größte Reichweite in KI-Antworten), Preise bleiben
  in € inkl. USt mit deutschem Rechnungshinweis.
- **Aktualitäts-Stempel:** jede EN-Datei trägt
  `<meta name="s2s-quelle" content="<DE-Pfad>@<sha256 des sichtbaren DE-Texts>">`. Das Tor rechnet
  den Hash der aktuellen DE-Seite (mit derselben Funktion, die den Stempel schreibt) und meldet rot,
  wenn er abweicht. Hilfsskript `scripts/sprachen-stempel.mjs <de-pfad>` setzt den Stempel nach
  einer Übersetzung neu.
- **CSP:** EN-Seiten laufen durch `csp-haerten.mjs` wie die DE-Seiten.
- **Übersetzen** macht Claude in der Session (keine bezahlte API). Preise, Zahlen und Eigennamen
  werden übernommen, nicht umgerechnet. Zitate von Kundinnen werden übersetzt und als Übersetzung
  gekennzeichnet („translated from German“).
- **Tor-Fixtures:** `sprachen-check --selbsttest` mit kaputt (fehlende Schwester, veralteter Stempel,
  einseitiges hreflang) = rot und sauber = grün; läuft als Selbsttest vor den Browser-Toren.
- **Prüfkette:** `pruefen.sh` komplett grün, Besucher-Simulation und Bedienung auch gegen `/en/`,
  Geräte 320/768/1024/1440, iPhone SE/15 Pro in WebKit, beide Themes.
- **Auslieferung:** eigener Worktree, PR gegen `main`, nach Merge `live-gleich.py` gegen live
  (Inhalt, nicht Statuscode), dann Bing Webmaster Tools / Search Console: Sitemap neu einreichen.
- **Fester Haken für die Zukunft:** Tor in `pruefen.sh` (blockt), dazu eine Zeile in
  `docs/SEITEN-BAUEN.md` und in `kern.md` („Neue/geänderte DE-Seite → EN-Schwester im selben Zug“).

## Dem Bauenden überlassen

- Genaue englische Formulierungen (in Sebis Ton) und englische Slugs der Wissen-Artikel.
- Aufbau von `lib/sprachen.mjs` und wie die Textbausteine der Shell je Sprache abgelegt werden.
- Wie die zweisprachige 404 aussieht.
- Reihenfolge der Seiten beim Übersetzen (Startseite zuerst empfohlen, damit der Umschalter früh
  sichtbar wird).
