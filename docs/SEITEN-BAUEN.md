# Seiten bauen

## Einmalige Einrichtung

```bash
cd ~/s2s-extern
ln -sfn /opt/homebrew/lib/node_modules ~/s2s-extern/node_modules
```

`@playwright/test` ist global installiert, es gibt keine lokale Installation.
Die Verknüpfung ist nötig, weil `NODE_PATH` bei ESM-Importen **nicht** wirkt.
Sie ist in `.gitignore` erfasst und landet nicht im Repo.

## Visueller Vergleich

```bash
npx --no-install playwright test
```

32 Aufnahmen: 4 Seiten × 4 Breiten (390 · 768 · 1024 · 1440) × chromium und
webkit. Schwelle: 0,1 % abweichende Pixel.

### Die Basisbilder liegen nur lokal

Sie sind bewusst **nicht** im Repo: 32 Vollseiten-Aufnahmen sind rund 65 MB,
und da hier `.nojekyll` liegt, liefert GitHub Pages jede Datei roh aus — sie
wären unter `social2scale.com/tests/basis/…` öffentlich abrufbar.

**Neu erzeugen** (nur von einem sauberen, geprüften Stand aus):

```bash
git status --short        # muss leer sein
rm -rf tests/basis
npx --no-install playwright test   # erster Lauf legt an, "faellt fehl"
npx --no-install playwright test   # zweiter Lauf muss gruen sein
```

⚠️ Basisbilder von einem ungeprüften Stand zementieren dessen Fehler. Nur von
einem Commit aus erzeugen, dessen Aussehen du überprüft hast.

### Wenn der Vergleich rot ist

- Änderung war **beabsichtigt** → `npx --no-install playwright test --update-snapshots`
- Änderung war **nicht beabsichtigt** → zurücknehmen

Die Schwelle in `playwright.config.mjs` bleibt, wo sie ist. Sie hochzusetzen,
damit ein Test grün wird, macht die Absicherung wertlos.

## Menüpunkt ändern, hinzufügen, entfernen

1. `lib/shell.mjs` bearbeiten — das ist die einzige Stelle.
2. `node scripts/build-pages.mjs`
3. `npx --no-install playwright test`
4. Ist der Vergleich rot und die Änderung war beabsichtigt:
   `npx --no-install playwright test --update-snapshots`.

Die Marker `<!-- SHELL:NAV -->`, `<!-- SHELL:MOBIL -->` und
`<!-- SHELL:FOOTER -->` in den HTML-Dateien nicht entfernen — ohne sie
überspringt der Bauschritt die Seite kommentarlos.

## Geteiltes CSS

`s2s.css` enthält Tokens, Dark-Hardening, Aurora-Wash, Loader, Typo-Rollen,
Header/Nav und Footer. Seiten-eigenes CSS bleibt im `<style>`-Block der
jeweiligen Seite — **nicht** in `s2s.css`.

Die Reihenfolge im `<head>` ist bindend: `fonts.css` → `s2s.css` → `<style>`.
Stünde `s2s.css` nach dem Inline-Block, würden geteilte Regeln die
seiten-eigenen überschreiben und Layouts kippen.

## Bewegung (Motion-System)

Alles liegt in `s2s.css` und `s2s.js` und steht damit **jeder** Seite zur Verfügung.
`s2s.js` ist das Verhaltens-Gegenstück zur Shell — ein einziger Scroll-Zuhörer,
gedrosselt über `requestAnimationFrame`. Bis zum
29.07.2026 hatte nur `index.html` eigene Animationen — die anderen vier Seiten
hatten null. Deshalb wirkten sie statisch, egal wie gut sie gesetzt waren.

### Die drei Bausteine

| Klasse | Was sie tut | Wann benutzen |
|---|---|---|
| `.reveal` | Element blendet beim Einscrollen ein (10 px Versatz, Blur 5→0, 0,5 s) | um jede Sektion, wie bisher |
| `.stagger` | Kinder erscheinen **nacheinander** statt gleichzeitig | wenn die *Menge* das Argument ist — Listen, Karten, Schritte |
| `.fillbar` | wächst per `scaleX` von 0 auf `--fill` | wenn eine Größe etwas **bedeutet** |
| `.grow` | Kinder wachsen per `scaleY` von unten, gestaffelt | Balken und Diagramme, wo die **Höhe** die Aussage ist |
| `.wipe` | Überschrift wischt per `clip-path` von unten auf | große Überschriften. Eigener Beobachter, braucht kein `.reveal` |
| `.from-left` / `.from-right` | Eintritt seitlich statt von unten | wenn eine Gegenüberstellung eine Richtung hat |
| `data-parallax="0.3"` | Hintergrund scrollt langsamer | Hero-Bilder. Elternteil braucht `overflow:hidden`, das Bild `inset:-22% 0` |

```html
<div class="wrap reveal">
  <ul class="stagger">…</ul>                        <!-- erscheint nacheinander -->
  <div class="bar"><i class="fillbar" style="--fill:.28"></i></div>
</div>
```

`.stagger` und `.fillbar` brauchen **kein eigenes JavaScript**: sie hängen per
CSS am umgebenden `.reveal.on`, das der vorhandene Beobachter ohnehin setzt.

### Regeln

- Nur `transform`, `opacity` und `filter` animieren — nie `width`, `height`,
  `top` oder `margin`. Layoutgebundene Eigenschaften zwingen den Browser bei
  jedem Bild zu einer Neuberechnung.
- **Bewegung muss etwas bedeuten.** Der Balken, der den eigenen Aufwand zeigt,
  darf wachsen. Ein Element, das nur hüpft, weil es kann, macht eine Seite für
  1.547 € billiger, nicht besser.
- `prefers-reduced-motion` schaltet alles ab — steht bereits in `s2s.css`,
  nichts nachzurüsten.

### Zwei Fallen, beide schon einmal zugeschnappt

1. **Der `<noscript>`-Notfallstil muss `filter:none` zurücksetzen.** Er setzte
   nur `opacity` und `transform` — mit dem neuen Startzustand wäre ohne
   JavaScript die halbe Seite unscharf gewesen. Auf allen elf Seiten korrigiert.
2. **Der visuelle Test darf keine Stile überschreiben, sondern muss `.on`
   setzen.** Sonst lösen die gestaffelten Kinder nie auf und die Unschärfe
   landet in den Basisbildern.

## Niemals

- Navigation oder Footer direkt in einer HTML-Datei ändern. Der nächste
  Bauschritt überschreibt es kommentarlos.

- `upgrade-insecure-requests` in eine CSP zurückschreiben — bricht Safari auf
  localhost, alle Assets scheitern. Entfernt am 28.07.2026 (`a366449`).
- Dateien im Repo ablegen, die niemand sehen soll. `.nojekyll` bedeutet:
  **alles** ist öffentlich abrufbar.

## 🟡 Offen: interne Dateien werden mit ausgeliefert

Weil `.nojekyll` im Root liegt, gibt GitHub Pages jede Datei roh heraus —
auch `docs/`, `lib/`, `scripts/`, `package.json` und `playwright.config.mjs`.
Nachgeprüft am 29.07.2026: alle liefern HTTP 200.

Betroffen ist unter anderem `docs/domain-umzug-cloudflare.md` mit dem
DNS-Bestand und dem Umzugs-Runbook. Die DNS-Werte selbst sind ohnehin
öffentlich (`dig TXT social2scale.com` zeigt dasselbe) — unangenehm ist, dass
interne Runbooks und Specs mit sehr offener Innensicht auf der Marketing-Domain
liegen.

**Vorläufig** hält `robots.txt` sie aus Such- und KI-Antworten heraus. Das
verhindert keinen Direktaufruf.

**Richtig gelöst** wäre es auf einem dieser Wege — beides ändert den
Auslieferungsweg der Live-Seite und gehört deshalb bewusst entschieden, nicht
nebenbei gemacht:
1. `.nojekyll` entfernen, `_config.yml` mit `exclude:` anlegen. Jekyll reicht
   HTML ohne Front-Matter unverändert durch, das Risiko ist gering — aber es
   ist eine Änderung am Deploy einer laufenden Seite.
2. Interne Dokumente in ein nicht veröffentlichtes Repo verschieben. Sauberste
   Trennung, macht aber die Abstimmung zwischen den Sessions umständlicher,
   weil `WER-MACHT-WAS.md` dann nicht mehr neben dem Code liegt.
