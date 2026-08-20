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

64 Aufnahmen: 8 Seiten × 4 Breiten (390 · 768 · 1024 · 1440) × chromium und
webkit. Schwelle: 0,1 % abweichende Pixel.

Die acht: Startseite · `/ablauf/` · `/about/` · `/for-you/` · `/results/` ·
`/preise/` · `/danke/` · `/onboarding/`. Die letzten beiden hängen bewusst
nicht an der geteilten Shell — sie sind trotzdem abgesichert, weil ihre
kopierten Fußzeilen auseinanderlaufen können.

### Die Basisbilder liegen nur lokal

Sie sind bewusst **nicht** im Repo: 64 Vollseiten-Aufnahmen sind über 100 MB.
Seit dem 04.08.2026 wäre `tests/` durch `_config.yml` zwar ohnehin von der
Veröffentlichung ausgenommen — im Repo haben Bilder in dieser Größe aber
trotzdem nichts verloren.

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

### ⚠️ Der Port gehört diesem Projekt allein

`playwright.config.mjs` startet einen eigenen Server auf **8917** mit
`reuseExistingServer: false`.

Bis zum 03.08.2026 stand dort `8899` mit `reuseExistingServer: true`. An dem Tag
belegte ein Server der zweiten Session diesen Port und lieferte
`~/s2s-kunden/_portal` aus. Playwright übernahm ihn kommentarlos und hätte die
Basisbilder gegen ein **völlig anderes Projekt** verglichen — ohne Warnung.

Deshalb gilt beides zusammen:

- ein unverwechselbarer Port statt der naheliegenden 88xx-Reihe
- `reuseExistingServer: false`, damit ein belegter Port **laut abbricht**

Ein lauter Abbruch ist besser als ein grüner Vergleich gegen die falsche Seite.
Läuft ein eigener Prüfserver, vor dem Testlauf beenden — aber **nur den
eigenen**. Vorher prüfen, wem der Prozess gehört:

```bash
for p in $(lsof -ti :8917); do
  lsof -a -p $p -d cwd -Fn | grep ^n | cut -c2-
done
```

## Der Gesprächsbogen der Startseite

Die Startseite ist seit dem 03.08.2026 **kein Katalog mehr, sondern ein
Closing**. Die Sektionen tragen fortlaufende Kapitel-Nummern, die den Bogen
sichtbar machen, ohne einen Satz Text hinzuzufügen:

| | Sektion | Rolle im Gespräch |
|---|---|---|
| — | `#hero` | Begrüßung **und Rahmensetzung** (`.hero-frame`: was gleich passiert) |
| 01 | `#stand` | Wo du stehst — der Schmerz, benannt |
| 02 | `#warum` | Warum's bisher nicht klappte — Einwand vorweg |
| 03 | `#ablauf` | Der Weg |
| 04 | `#proof` | Beweis |
| 05 | `#leistungen` | Was drin ist |
| 06 | `#faq` | Einwände |
| 07 | `#gratis` | Der leise Einstieg (Rückfalltür) |
| 08 | `#cta-bottom` | Abschluss |

**Die Reihenfolge ist nicht verhandelbar.** Vor 01 und 02 stand hier der
30-Sekunden-Check: drei Kästen mit „Für wen / Was wir machen / So startet's".
Sachlich korrekt, aber eine Inhaltsangabe des Katalogs — kein Grund
weiterzulesen. Ohne benannten Schmerz gibt es keinen Anlass zu handeln, und
ohne „warum's bisher nicht klappte" beantwortet die Besucherin den stärksten
Einwand selbst — meist mit „hat bei mir nicht funktioniert".

Eine neue Sektion einzuschieben heißt: **Kapitel-Nummern nachziehen.** Sie
stehen in `index.html` in den `.klabel` / `.s2eyebrow` / `.ix`-Elementen.

Die Unterseiten (`/preise/`, `/results/`, `/for-you/`, `/about/`) sind die
**Vertiefung** zu einzelnen Kapiteln, nicht eigene Closings. Sie brauchen keine
Nummerierung.

## ⚠️ Nach JEDEM Bau: Sicherheits-Block erneuern

```sh
node scripts/csp-haerten.mjs          # setzt CSP + Referrer-Policy + Rahmenschutz
node scripts/csp-pruefen-browser.mjs  # prüft im echten Browser, dass nichts bricht
```

**Warum das nicht optional ist.** Die Seite liegt auf GitHub Pages, und die
Plattform kann keine eigenen Antwort-Header setzen — nachgeprüft am 20.08.2026,
die Antwort enthält nicht einen einzigen, nicht einmal HSTS. Der gesamte Schutz
steht deshalb in der Seite selbst.

`script-src` arbeitet mit **sha256-Hashes statt `unsafe-inline`**: jedes
Inline-Skript ist einzeln freigegeben. Das heißt aber auch — **ändert sich auch
nur ein Zeichen in einem Inline-Skript, passt sein Hash nicht mehr und der
Browser führt es nicht mehr aus.** Ohne den Härtungslauf ist die Seite danach
still kaputt: sie sieht normal aus, aber Menü, Formular und Zählung tun nichts.

`csp-haerten.mjs --pruefen` ändert nichts und liefert Exit 1, sobald irgendeine
Seite einen veralteten Block hat — als Gate vor dem Deploy geeignet.

Der Browser-Test beginnt mit einem **Negativtest**: er hängt zur Laufzeit ein
Skript ein, das keinen passenden Hash hat, und bricht ab, wenn es NICHT
blockiert wird. Ohne den bewiese ein grüner Lauf nichts — bei einer gar nicht
angekommenen Regel meldete ebenfalls keine Seite einen Verstoß.

**Was auf GitHub Pages nicht geht:** `X-Content-Type-Options`, `HSTS` und
`Permissions-Policy` haben kein Meta-Äquivalent. `frame-ancestors` ignorieren
Browser im Meta-Tag grundsätzlich — deshalb der Rahmenschutz per Skript, der
die Seite aus einem fremden Rahmen heraussetzt. Für echte Header müsste die
Seite hinter Cloudflare laufen; `_headers` liegt dafür fertig im Repo.

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
| `data-scene` | **Angepinnte Szene** — bleibt stehen, Schritte schalten beim Scrollen | wenn mehrere Zustände nacheinander erzählt werden |

### Angepinnte Szene bauen

```html
<div class="…-scene" data-scene>
  <div class="…-track" data-scene-track>        <!-- height:300vh = Scrollstrecke -->
    <div class="…-pin">                          <!-- position:sticky, 100vh -->
      <li data-scene-step="0">…</li>             <!-- bekommt .is-active -->
      <article data-scene-panel="0">…</article>  <!-- bekommt .is-active -->
```

Der Treiber in `s2s.js` setzt `--p` (0–1) auf die Szene und `.is-active` auf den
jeweiligen Schritt und seine Tafel. `--p` lässt sich direkt in CSS benutzen, etwa
für einen Fortschrittsfaden: `height:calc(var(--p) * 100%)`.

⚠️ **Auf dem Handy nicht anpinnen.** Unter 960 px wird der Track auf `height:auto`
gesetzt und die Tafeln stapeln sich — angepinnte Szenen kosten auf kleinen
Schirmen mehr, als sie bringen.

⚠️ **Der visuelle Test muss die Szene auflösen.** Playwright scrollt beim
Vollseiten-Bild durch den Track; je nach Zeitpunkt wäre eine andere Tafel aktiv
und der Vergleich launisch. Steht in `tests/visuell.spec.mjs`.

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
- Einen neuen internen Ordner anlegen, ohne ihn in `_config.yml` unter
  `exclude` einzutragen. Alles, was nicht dort steht, ist sofort öffentlich
  abrufbar.

## ✅ Erledigt: interne Dateien sind nicht mehr öffentlich

Bis zum 04.08.2026 lag hier eine leere `.nojekyll`. Die schaltet die
Jekyll-Verarbeitung ab — und damit gab GitHub Pages **jede** Datei roh heraus.
Nachgeprüft, alle mit HTTP 200 öffentlich abrufbar: `docs/WER-MACHT-WAS.md`
mit der internen Arbeitsteilung, `docs/SEITEN-BAUEN.md`, `lib/shell.mjs`,
`scripts/build-pages.mjs`, `playwright.config.mjs`.

`robots.txt` hielt sie nur aus Such- und KI-Antworten heraus. Gegen einen
Direktaufruf half das nicht.

Jetzt steuert `_config.yml` im Wurzelverzeichnis, was veröffentlicht wird.
**Neue interne Ordner dort in `exclude` eintragen** — sonst sind sie sofort
öffentlich.

Gegenprobe nach der Umstellung: 23 öffentliche Ziele weiterhin 200,
8 interne jetzt 404, Domain und Zertifikat unberührt.

### ⚠️ Zwei Fallen dabei

1. **CNAME niemals ausschließen.** Ohne sie fällt die Seite auf die
   github.io-Adresse zurück und `social2scale.com` ist weg.
2. **Liquid-Syntax prüfen, bevor jemand `.nojekyll` wieder anfasst.** Jekyll
   liest `{{` und `{%` als Vorlagen-Anweisung. Vor der Umstellung geprüft:

   ```bash
   git ls-files "*.html" "*.css" "*.js" "*.txt" "*.xml" "*.svg" |
     while read f; do grep -q "{{\|{%" "$f" && echo "KOLLISION: $f"; done
   ```

   Damals null Treffer. Kommt je eine Datei mit dieser Syntax dazu, muss sie
   entweder in `exclude` oder ein `{% raw %}`-Block herum.
