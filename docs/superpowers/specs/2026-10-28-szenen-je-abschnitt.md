# Szenen je Abschnitt — jede Fläche ihr eigenes System (28.10.2026)

## Anlass
Sebi 28.10.2026 nach Stufe 2 des Lichtstudios: „im funnel nichts mit immersives gute entwickeltes design … wollte
auch nicht überall eig copy paste drinn haben sondern du solltest für alles jeweils ein entsprechendes system bauen“,
danach „nicht nur funnel alle seiten bzw. alle einzelnen abschnitte usw komplett kreativ ausgestaltet bitte bauen“.

Stufe 1/2 hatte einen Bausatz (Raum im Kopf, Seitenlicht darüber) auf alle Seiten kopiert. Jetzt bekommt jeder
Abschnitt ein eigenes Motiv aus der Welt „Fotostudio“, abgeleitet aus seiner Aufgabe.

## Grundlage
`~/kit-build/kunden-wirkung-evidenz.json` (Research 28.10.): Effekte gefallen, leisten aber nichts (→ jede Mechanik
nennt ihre Aufgabe); sichtbare echte Arbeit hebt den Wert (Labor Illusion); Mitbauen + geschenkter Fortschritt;
offene Preise und konkrete Belege; Ältere zögern bei versteckter Bedienung (→ nichts Inhaltliches hinter Interaktion);
35 % ab 40 mit Gleichgewichtsstörung (→ Bewegung klein, kein Scrolljacking); dunkle Schrift auf hellem Grund liest
sich in jedem Alter besser (→ lange Lesestrecken auf Papier).

## Motive

| Seite | Abschnitt | Motiv | Aufgabe |
|---|---|---|---|
| Start | Eines davon bist du | Leuchttisch | drei Abzüge, man sucht sich selbst |
| | Du hast es schon versucht | Probestreifen | drei Fehlbelichtungen, der letzte Streifen sitzt |
| | Vier Phasen (Handy) | Ringlicht | jede Phase schaltet ein Viertel ein |
| | Unser Feed | Leine | Abzüge an der Leine, schwingen beim Scrollen |
| | Dein Bereich | Kontrollmonitor | der Bereich als Monitor am Set |
| | Alles aus einer Hand | Dreipunktlicht | Setup = Führung, Betreuung = Aufhellung, Skalierung = Spitzlicht |
| | Gut zu wissen | Karteikasten | Fragen auf hellen Karteikarten |
| | Sebi & Phil | Gegenlicht | eine Röhre zwischen beiden |
| Ablauf | Vier Phasen | Dolly | Kamerawagen fährt die Schiene, Stationen leuchten |
| | Deine Zeit | Filmmeter | deine Zeit als langer Film, unsere als ein paar Bilder; Laborwecker |
| | Was wir brauchen | Requisiten | Schlüssel, Abzüge, Uhr mit Anhänger |
| Preise | Der Weg, den wir empfehlen | Podest | Empfehlung im Führungslicht, Auswege tiefer |
| | Was es kostet | Kassenbon | Rechnung kommt aus dem Drucker |
| | Warum nicht billiger | Maßband | alle Spannen auf einer Skala (aus dem Text gelesen) |
| | Alle sieben Pakete | Mappe | offen helle Blätter |
| Für wen | Drei Ausgangslagen | Silhouetten | wer dran ist, tritt ins Licht |
| | Leitsatz | Verfolger | Spot fährt über die Schrift |
| | Engpass → System | Lichtpult | Schalter legt um |
| | Fit-Check | Fettstift | eingekreist / Wellenlinie auf Papier |
| Über uns | Leitsatz | Projektor | Diaprojektor, Staub im Strahl |
| | Warum es uns gibt | Lichtplan | Grundriss des Studios zeichnet sich |
| | Phil & Sebi | Porträtsitzung | Softbox geht an, Bild wird hell |
| | Vier Prinzipien | Klappe | jede Szene wird angeschlagen |
| Prüf uns | Drei Zahlen | Farbfilter | Strahl durch drei Filter, Follower liegen daneben |
| | Sechs Monate | Entwicklung | derselbe Abzug Stufe für Stufe deutlicher |
| | Grundsatz | Prüfstempel | wird abgestempelt |
| | Sechs Fragen | Verhörlampe | Licht auf der Frage, die man liest |
| Wissen | Artikel | Lesetisch | Papier, Lampe liest mit |
| | Übersicht | Hängeregister | Mappen mit Reitern |
| | Frage am Ende | Notizkarte | dunkle Karte mit Büroklammer |
| Danke | Gruß | Briefkarte | Papier mit Marke |
| Danke Studio | Drei Schritte | Drehplan | Kreidehaken |
| alle | Abschluss | Bühnenmarke | Gaffa-Band, je Seite anders (T, Prellbock, Podestkante, X, zwei Plätze, Messkreuz) |
| Funnel | Check | Probeaufnahme | Traverse mit 9 Lampen, die erste brennt schon; Aufnahmezettel auf Klemmbrett; Blitz beim Ergebnis |
| | Warten auf den Feed | Dunkelkammer | Bernstein, bis der Feed fertig ist; dann Licht an |

Bewusst ohne Motiv: Kopf jeder Seite (trägt den Raum, raum-bauen.mjs), Pflichttexte, Rechtliches, Links, Onboarding, 404.

## Technik
- Quelle: `scripts/szenen-quelle.mjs` (Motive, Anker, Deko, Teile) → `scripts/szenen-bauen.mjs` (DE+EN, idempotent, `--pruefen`).
- Gestaltung: `szenen/basis.css` (Materialien, Bühnenmarke) + `szenen/<seite>.css`. Steuerung: `szenen/szenen.js`
  (`.sz-an`, `--sp`, `--sv`, `--sx/--sy`, `.sz-lit`; kein Endlos-Lauf).
- Funnel: `free-content/src/pages/probeaufnahme.js` (Probeaufnahme + Dunkelkammer), liest nur `data-schritt` bzw. `#reveal[hidden]`.
- Tor: `scripts/szenen-check.mjs` (+ `--selbsttest`), in `pruefen.sh`.

## Offen
- Ton als Ebene (geparkt). Onboarding-Formular und Rechtliches bewusst ruhig. Reveal-Seite des Funnels unverändert.
- Wirkung messen: Zählpfade `/vorschau/check/*` vor/nach 28.10. vergleichen (keine Studie für DACH-Coaches).
