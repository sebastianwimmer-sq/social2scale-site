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

## Niemals

- Navigation oder Footer direkt in einer HTML-Datei ändern. Der nächste
  Bauschritt überschreibt es kommentarlos.

- `upgrade-insecure-requests` in eine CSP zurückschreiben — bricht Safari auf
  localhost, alle Assets scheitern. Entfernt am 28.07.2026 (`a366449`).
- Dateien im Repo ablegen, die niemand sehen soll. `.nojekyll` bedeutet:
  **alles** ist öffentlich abrufbar.
