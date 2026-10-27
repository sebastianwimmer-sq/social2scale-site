# Immersiv-Loop social2scale.com: Plan (27.10.2026)

Sebi 27.10.: „komplette premium website und auch unterpages … auf stand 2026 ende
oktober … alles was geht und für uns passt … maximal level“. Danach dieselbe Runde für
vegetarianhulk.de.

Evidenz: `~/kit-build/web-immersiv-evidenz.json` (neu) + `web-tiefe-evidenz.json` (16.10.).
Regeln: `~/.claude/regeln/web.md` › „Tiefe und Immersion“, Motion-Loop `marken/s2s.json`.

## 1. Ziel und Warum

Jede Seite wird ein **Ort** statt einer Fläche: eigene Szene aus der Welt von s2s
(Licht, Material, Ebenen), die auf den Besucher antwortet. Wechsel zwischen Seiten laufen
als Kamerafahrt statt als harter Schnitt. Zweck: Der erste Eindruck (50 ms) trägt
Glaubwürdigkeit für eine Agentur, die ohne Hype-Zahlen auftritt. Jede Seite führt
weiterhin zur Gratis-Vorschau.

**Erfolg:** Sebi sagt „high end“ ohne Erklärtext. Alle Tore sind grün, und LCP und
Anfragen werden nicht schlechter. Die EN-Seiten sind 1:1 gleich.

**Anti-Ziele** (also ein Fehlschlag, auch wenn es technisch läuft):
- Slop: Punkte, Bubbles, Orbs, Deko-Striche, HUD ohne Aussage, „alles blendet ein“
- Effekt statt Inhalt: nichts Bedienbares bewegt sich, der Text liegt nie in einer bewegten Ebene
- langsamer: LCP bleibt Text oder Standbild, die Szene lädt danach
- Gradient-Flow oder Verlaufswort abgeschwächt
- am iPhone SE nicht mehr bedienbar, die erste Handlung liegt unter dem Falz

## 2. Ist-Stand (gemessen 27.10., live)

| Befund | Folge |
|---|---|
| Alle Unterseiten haben dieselbe Kopf-Bauart (Dunst + H1 + schräge Beitragskarte) | eigener Ort je Seite |
| Nur die Startseite antwortet (Canvas, Maus) | Antwort-Ebene für alle Seiten |
| `@property` 0× genutzt | Licht über registrierte Variablen |
| Scroll-Ruckeln CPU×4: Start 1,9 %, Rest 0 % (Grenze 5 %) | genug Reserve |
| Kein Seitenwechsel-Übergang auf /gratis/ (Weiterleitung zum Funnel), /anfrage/, /links/ | Brücke gestalten |
| /wissen/ flachster Kopf, andere Wortmarke | Generator `build-wissen.mjs` |
| `.bar` (klebend) mit `backdrop-filter: blur(16px)` | Regelverstoß, ersetzen |
| Schwarze Zone im Ganzseiten-Bild = Scroll-Strecke der Handy-Szene | kein Fehler, Raum dort füllen |

## 3. Blind Spots

1. **Generatoren statt HTML:** /wissen/ (`build-wissen.mjs`, `wissen-kopf.html`), /danke/studio/
   (`build-danke-studio.mjs`), EN-Wissen (`wissen-en.mjs`). Hand-Änderungen am HTML
   überschreibt der nächste Bau.
2. **/anfrage/ lädt `seite.css` nicht**, /danke/ und /onboarding/ hängen bewusst nicht an der
   geteilten Shell. Diese Seiten bekommen ihre Ebene einzeln.
3. **Funnel = andere Domain** (start.social2scale.com, `free-content/`). Ein View-Transition
   über Origins gibt es nicht, deshalb Brücke: Ausgang gestaltet, Funnel-Eingang nimmt das Bild auf.
   Der Funnel ist eigener Worker, wird im Plan als Phase 6 geführt.
4. **CSP:** Inline-Skripte nur mit Hash (`csp-haerten.mjs`). Neue Logik deshalb als eigene
   Dateien; Ton braucht `media-src 'self'`, WebGPU braucht nichts Zusätzliches.
5. **Motion-Loop-Tor** (`mess.mjs s2s`) blockt Endloses ohne Freigabe in
   `marken/s2s.json › endlos_erlaubt`, Vokabular dort erweitern (mit Sebis Wahl begründet).
   `~/kit-build` ist 9 Commits hinter origin und hat fremde dirty Dateien → Änderung im
   eigenen Worktree von kit-build.
6. **EN 1:1:** jede Änderung auch unter `/en/` (`sprachen-check.mjs` in `pruefen.sh`).
7. **Visueller Vergleich** (`playwright test`, 64 Basisbilder) wird absichtlich rot.
   Basisbilder erst nach Sebis Abnahme neu ziehen.
8. **Rechte:** Bilder nur eigenes Material (Feed, Gründerfotos) oder selbst gebaut; Videos
   über Higgsfield (Credits, Lizenz in `kreativ-werkzeuge-evidenz.json`); Ton nur selbst
   erzeugt oder aus `quellen-evidenz.json` mit gelesener Lizenz. Ton standardmäßig aus.
9. **Datenschutz:** Kein neuer Fremddienst; alles selbst gehostet. Neigen-Sensor wird nur
   nach Tippen gefragt (iOS) und nicht gespeichert, also kein Eintrag nötig. Das prüft `rechts-loop.mjs`.
10. **Kopien des Seiten-CSS:** `site-css-holen.mjs` kopiert das Stylesheet in andere Flächen
    (Studio, Funnel). Nach dem Umbau Liste der Kopien prüfen und nennen.
11. **Hosting:** Website liegt auf GitHub Pages (Merge auf main = live), nicht Cloudflare.
    Regel sagt Cloudflare. Nicht Teil dieses Loops → geparkt, eigenes Ticket.
12. **Zielgruppe 45+, Coaches/B2B:** Prototypizität schlägt Experiment (Tuch 2012). Kein
    Scrolljacking, nativer Scroll bleibt, Bewegungsamplitude klein.
13. **Druck/PDF** und reduced-motion: Endzustände im Druck-CSS, Standbild ohne Versatz.
14. **Andere Sessions:** `~/social2scale-site` (39 hinter, fremde Datei), `~/s2s-film`,
    `~/s2s-motion`. Ich arbeite nur in `~/s2s-immersiv`.

## 4. Ablauf (Phasen)

**Phase 1: Zielbild (jetzt).** 3–4 Designrichtungen als anklickbares Artifact, jede mit
echter Tiefe und Bewegung am Seitenkopf + einer Unterseite. **Sebi wählt.** Ohne Wahl wird
nichts gebaut.

**Phase 2: Tore zuerst.** `scripts/immersiv-check.mjs` mit Selbsttest (flache Fixture rot,
tiefe grün; Gegenbeweis per Kopie mit einer getauschten Zeile), danach in `pruefen.sh`:
- Antwort: eine Szenen-Ebene verschiebt sich bei Maus (≥ 4 px) und beim Scrollen
- Ruhig: `reduce` → keine Verschiebung, Standbild, kein Endloses
- Halte-Knopf, wenn etwas endlos läuft; `still` pausiert CSS und Leinwand
- Ruckeln beim Scrollen: CPU×4, 14-px-Schritte, Anteil > 50 ms unter 5 %
- LCP-Element ist Text oder Standbild, nie Canvas/Video; JS gzip Landing < 150 kB
- Kein `backdrop-filter` auf klebenden Elementen
- Eigener Ort: Kopf je Seite unterscheidet sich (Pixelvergleich der Kopfbilder untereinander)
- Seitenwechsel: jede Seite derselben Domain hat `@view-transition` (das prüft schon `uebergang-check.mjs`, ich erweitere es um /links/ und /anfrage/)
- Inhalt am Ende sichtbar: kein Text mit Deckkraft < 0,1 nach Durchscrollen

**Phase 3: Probe.** Gewählte Richtung als Startseiten-Kopf + /ablauf/ im Worktree. Ich messe,
gucke selbst bei 390 + 1440, und du gibst sie per Artifact-Vorschau ab.

**Phase 4: System.** Eine geteilte Schicht `immersiv.css` + `immersiv.js` (Szene in Ebenen,
Licht über `@property`, Maus/Neigen, Halte-Knopf, reduce, Druck). Scroll-gebunden per
`animation-timeline` hinter `@supports`; WebGPU nur, falls die Richtung es braucht, mit
Standbild als Rückfall.

**Phase 5: Rollout Seite für Seite**, je Seite ein eigener Ort aus derselben Welt:
Start → /ablauf/ → /preise/ → /for-you/ → /about/ → /results/ → /wissen/ (Generator) →
/danke/ + /onboarding/ + /danke/studio/ (Generator) → /anfrage/ → /links/ → 404.
Nach jeder Seite: EN-Schwester, Tore. Ausgeliefert wird in Paketen von 2–3 Seiten per PR.
Nach jedem Paket prüft `live-gleich.py`, ob live derselbe Inhalt steht.

**Phase 6: Übergänge + Brücke zum Funnel** (free-content, eigener Worker-Deploy).

**Phase 7: Abschluss.** Visuelle Basisbilder neu, Besucher-Sim, `geraete-check.mjs`
(5 Engines), Evidenz-Datei abhaken, Loop-Bilanz, Memory + Handoff.

**Danach: vegetarianhulk.de** mit demselben Ablauf (Welt: Berg, Aufstieg, Wetter), Werkzeuge
aus Phase 2/4 werden mitgenutzt.

## 5. Was Sebi entscheidet / was ich entscheide

- **Sebi:** Richtung (Phase 1); Ton ja/nein; Endloses in der Startseite (Freigabe im Motion-Loop);
  Abnahme der Probe (Phase 3).
- **Ich (als meine Entscheidung markiert):** Technik (CSS-first, WebGPU nur bei Bedarf),
  Reihenfolge der Seiten, Paketgröße der PRs, Tor-Schwellen aus `regeln/web.md`.
