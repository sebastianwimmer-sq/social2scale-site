# Gemeinsame Shell — Umsetzungsplan (Phase 1+2)

> **Für agentische Umsetzung:** ERFORDERLICHE SUB-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, Aufgabe für Aufgabe. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Die vier Bestandsseiten teilen sich Tokens, Shell-CSS und Shell-Markup, ohne dass sich ihr Aussehen um mehr als 0,1 % der Pixel ändert.

**Architektur:** Geteiltes CSS wandert in `/s2s.css`, seiten-eigenes CSS bleibt inline in der jeweiligen Datei. Navigation, Kopf und Footer kommen aus `lib/shell.mjs` und werden von `scripts/build-pages.mjs` zwischen Markern eingesetzt. Jeder Schritt ist durch einen Pixel-Vergleich gegen den heutigen Stand abgesichert.

**Tech-Stack:** Statisches HTML auf GitHub Pages · Node ohne Abhängigkeiten für die Skripte · `@playwright/test` 1.60 (global installiert) für den visuellen Vergleich.

## Globale Vorgaben

- **Arbeitsordner:** `~/s2s-extern`, Branch `feat/website-extern`. **Niemals** in `~/social2scale-site` arbeiten — der gehört der internen Session (siehe `docs/WER-MACHT-WAS.md`).
- **Testbefehl immer:** `NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test`
  (Es gibt keine lokale Installation; `@playwright/test` liegt global unter `/opt/homebrew/lib/node_modules`.)
- **Schwelle:** `maxDiffPixelRatio: 0.001` — 0,1 % abweichende Pixel. Darüber = Rückbau, kein Weiterbauen.
- **Prüfbreiten:** 390 · 768 · 1024 · 1440. **Browser: chromium UND webkit.** WebKit ist Pflicht, nicht Kür — die CSP-Falle vom 28.07. war in Chromium unsichtbar.
- **Kein `upgrade-insecure-requests`** in irgendeiner CSP-Meta. Am 28.07. entfernt (`a366449`), darf nicht zurückkommen.
- **Bestandstexte wörtlich lassen.** Dieser Plan ändert Bauweise, nicht Worte. Jede geänderte Formulierung ist ein Fehler.
- **Kein Deko-Emoji** in erzeugtem Markup.
- **Reihenfolge im `<head>` ist bedeutsam:** `fonts.css` → `s2s.css` → `<style>`-Blöcke. Die Inline-Blöcke müssen zuletzt stehen, damit seiten-eigene Regeln geteilte weiterhin überschreiben.

---

### Aufgabe 1: Visuelles Sicherungsnetz

Muss **vor jeder Änderung** stehen. Ohne Basisbilder vom heutigen Zustand ist jeder spätere Vergleich wertlos.

**Dateien:**
- Anlegen: `package.json`
- Anlegen: `playwright.config.mjs`
- Anlegen: `tests/visuell.spec.mjs`
- Anlegen: `.gitignore` (erweitern, falls vorhanden)
- Erzeugt: `tests/basis/*.png` (Basisbilder, werden committet)

**Schnittstellen:**
- Erzeugt: das Kommando `NODE_PATH=… npx --no-install playwright test`, das alle folgenden Aufgaben als Tor benutzen.
- Erzeugt: Basisbilder unter `tests/basis/`, benannt `<seite>-<breite>-<projectName>.png`.

- [ ] **Schritt 1: `package.json` anlegen**

Nur nötig, damit Node die `.mjs`-Dateien als Module liest. Keine Abhängigkeiten.

```json
{
  "name": "social2scale-site",
  "private": true,
  "type": "module"
}
```

- [ ] **Schritt 2: `playwright.config.mjs` anlegen**

```js
// Visueller Regressionsschutz fuer den Shell-Port.
// Es gibt bewusst keine lokale Installation: @playwright/test liegt global.
// Aufruf: NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
export default {
  testDir: './tests',
  // Basisbilder neben den Tests, nach Browser getrennt.
  snapshotPathTemplate: '{testDir}/basis/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: {
      // 0,1 % — deckt Schrift-Rasterung ab, schlaegt bei echter Verschiebung an.
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    },
  },
  // Eigener Server, damit der Test nicht von einem laufenden Terminal abhaengt.
  webServer: {
    command: 'python3 -m http.server 8899',
    url: 'http://localhost:8899/',
    reuseExistingServer: true,
    timeout: 20000,
  },
  use: { baseURL: 'http://localhost:8899' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
};
```

- [ ] **Schritt 3: `tests/visuell.spec.mjs` anlegen**

```js
import { test, expect } from '@playwright/test';

const SEITEN = [
  { name: 'start', pfad: '/' },
  { name: 'about', pfad: '/about/' },
  { name: 'fuer-wen', pfad: '/for-you/' },
  { name: 'ergebnisse', pfad: '/results/' },
];
const BREITEN = [390, 768, 1024, 1440];

for (const seite of SEITEN) {
  for (const breite of BREITEN) {
    test(`${seite.name} bei ${breite}px unveraendert`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: 900 });
      await page.goto(seite.pfad, { waitUntil: 'load' });

      // Loader wegblenden und Reveals aufloesen: beide sind zeitabhaengig und
      // wuerden sonst bei jedem Lauf ein anderes Bild ergeben.
      await page.evaluate(() => {
        const l = document.getElementById('loader');
        if (l) l.style.display = 'none';
        document.querySelectorAll('.reveal, .r').forEach((e) => {
          e.style.opacity = '1';
          e.style.transform = 'none';
        });
      });
      await page.waitForTimeout(600);

      await expect(page).toHaveScreenshot(`${seite.name}-${breite}.png`, {
        fullPage: true,
      });
    });
  }
}
```

- [ ] **Schritt 4: Erster Lauf — legt die Basisbilder an**

```bash
cd ~/s2s-extern
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: **32 Tests schlagen fehl** mit „A snapshot doesn't exist … writing actual." Das ist das normale Verhalten beim ersten Lauf — Playwright legt dabei die Basisbilder an.

- [ ] **Schritt 5: Zweiter Lauf — muss grün sein**

```bash
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: `32 passed`. Ist er nicht grün, ist etwas im Bild zeitabhängig (Animation, Zufallswert) — dann in Schritt 3 ruhigstellen, **nicht** die Schwelle erhöhen.

- [ ] **Schritt 6: Testrückstände von der Verfolgung ausschließen**

`.gitignore` anlegen bzw. ergänzen:

```gitignore
test-results/
playwright-report/
```

Die Basisbilder unter `tests/basis/` werden **committet** — sie sind der Vergleichsmaßstab.

- [ ] **Schritt 7: Committen**

```bash
git add package.json playwright.config.mjs tests/ .gitignore
git commit -m "test: visuelles Sicherungsnetz fuer den Shell-Port

32 Basisbilder (4 Seiten x 4 Breiten x chromium/webkit) vom Stand vor dem
Port. Schwelle 0,1 Prozent abweichende Pixel. Jede folgende Aenderung muss
gegen diese Bilder gruen bleiben."
```

---

### Aufgabe 2: Totes CSS aus den drei Unterseiten entfernen

`about/`, `for-you/` und `results/` tragen CSS für sechs Sektionen, die **nur** auf der Startseite existieren: `#hero`, `#proof`, `#ablauf`, `#leistungen`, `#faq`, `#gratis`. Nachgemessen am 28.07.: keine dieser IDs kommt in den drei Unterseiten vor.

Diese Aufgabe steht vor der Extraktion, weil sie die Menge verkleinert, die überhaupt geteilt werden muss — und weil sie beweist, dass das Sicherungsnetz aus Aufgabe 1 trägt.

**Dateien:**
- Ändern: `about/index.html`, `for-you/index.html`, `results/index.html`

**Schnittstellen:**
- Verbraucht: Basisbilder aus Aufgabe 1.
- Erzeugt: nichts, wovon spätere Aufgaben abhängen.

- [ ] **Schritt 1: Prüfen, dass die IDs in den Unterseiten wirklich fehlen**

```bash
cd ~/s2s-extern
for f in about for-you results; do
  echo "--- $f"
  grep -oE 'id="(hero|proof|ablauf|leistungen|faq|gratis)"' $f/index.html || echo "  keine der sechs IDs"
done
```

Erwartet: dreimal „keine der sechs IDs". **Bricht die Ausgabe davon ab, diese Aufgabe überspringen** und im Plan vermerken — dann ist das CSS nicht tot.

- [ ] **Schritt 2: Die Kandidaten auflisten lassen, statt sie zu suchen**

```bash
cd ~/s2s-extern
for f in about for-you results; do
  echo "=== $f ==="
  python3 - "$f/index.html" <<'PY'
import re, sys, pathlib
IDS = ('#hero', '#proof', '#ablauf', '#leistungen', '#faq', '#gratis')
css = '\n'.join(re.findall(r'<style>(.*?)</style>',
                pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'), re.S))
zeilen = css.split('\n')
for nr, z in enumerate(zeilen, 1):
    if any(i in z for i in IDS) and '{' in z:
        print(f'  {nr:5}  {z.strip()[:100]}')
PY
done
```

Ausgabe ist die Arbeitsliste: jede Zeile ist eine Regel, die weg kann.

- [ ] **Schritt 3: Eine Datei nach der anderen bereinigen — beginne mit `about/index.html`**

Entferne die in Schritt 2 gelisteten Regeln sowie die zugehörigen Kommentar-Überschriften. Orientierung geben die Blockmarker im CSS, z. B.:

```
/* ===== hero — centered, brand-anchored, conversion-first ===== */
/* ===== proof section — relocated growth dashboard, full-bleed under hero ===== */
/* ===== leistungen — bento (1 hero + 2 narrow) ===== */
/* ===== faq ===== */
```

⚠️ **Achtung bei `@media`-Blöcken.** Die Datei enthält 21 davon. Steht eine zu entfernende Regel **innerhalb** eines `@media`-Blocks, darf nur die Regel verschwinden — die Klammer des `@media` muss stehen bleiben. Eine gelöschte schließende Klammer zerreißt den Rest des Stylesheets.

⚠️ **Klassen wie `.blk`, `.band`, `.wrap`, `.lead` NICHT anfassen** — die nutzen auch die Unterseiten. Nur ID-gebundene Selektoren.

- [ ] **Schritt 4: Nach jeder Datei prüfen**

```bash
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: `32 passed`. Schlägt ein Test fehl, war die entfernte Regel doch nicht tot → Änderung rückgängig machen, nicht nachjustieren.

- [ ] **Schritt 5: Schritt 3 und 4 für `for-you/index.html` wiederholen**

- [ ] **Schritt 6: Schritt 3 und 4 für `results/index.html` wiederholen**

- [ ] **Schritt 7: Ersparnis belegen**

```bash
ls -l about/index.html for-you/index.html results/index.html
```

Notiere die neuen Größen für die Commit-Nachricht (vorher: 73 KB · 80 KB · 85 KB).

- [ ] **Schritt 8: Committen**

```bash
git add about/index.html for-you/index.html results/index.html
git commit -m "perf: totes Startseiten-CSS aus den drei Unterseiten entfernt

about, for-you und results trugen die Regeln fuer #hero, #proof, #ablauf,
#leistungen, #faq und #gratis mit — Sektionen, die es dort nicht gibt. Jede
Besucherin dieser Seiten lud sie trotzdem.

Visueller Vergleich unveraendert gruen (32 Bilder, chromium + webkit)."
```

---

### Aufgabe 3: `s2s.css` mit Tokens und Shell

**Dateien:**
- Anlegen: `s2s.css`
- Ändern: `index.html`, `about/index.html`, `for-you/index.html`, `results/index.html` (je: `<link>` ergänzen, Blöcke aus dem Inline-CSS entfernen)

**Schnittstellen:**
- Verbraucht: Basisbilder aus Aufgabe 1.
- Erzeugt: `/s2s.css` mit den Tokens (`:root`), Dark-Hardening, Loader, geteilten Typo-Rollen, Header/Nav und Footer. Aufgabe 4 und 5 setzen voraus, dass diese Regeln **nicht mehr** inline stehen.

- [ ] **Schritt 1: Die geteilten Blöcke in `s2s.css` kopieren**

Quelle ist `index.html` — sie hat die vollständigste Fassung. Übernimm **wörtlich** und in dieser Reihenfolge die Blöcke unter diesen Kommentar-Überschriften:

```
/* ===== surfaces: dark-grey stack (no pure #000 except topbar) ===== */
/* ===== 8pt spacing scale — single source of truth, no stray px ===== */
/* ===== Fix-Dark Hardening — dunkel in JEDEM OS-Modus (Dark-Audit) ===== */
/* ===== s2s-Loader (Intro + Seitenwechsel) — kurze Marke, fadet weg ===== */
/* ===== shared type roles ===== */
/* ===== sticky header + nav (flat, hairline) ===== */
/* ===== footer — editorial, wordmark left, meta right ===== */
/* ===== Footer (editorial · Liquid-Glass) ===== */
/* ===== Loader-Progressbar (leichtgewichtig, transform-Sweep) · LDR-BAR ===== */
```

Setze oben in `s2s.css` einen Kopfkommentar:

```css
/* social2scale — geteilte Shell.
   Tokens, Dark-Hardening, Loader, Typo-Rollen, Header/Nav und Footer.
   Wird von jeder Seite geladen, NACH fonts.css und VOR dem Inline-<style>,
   damit seiten-eigene Regeln weiterhin gewinnen.
   Seiten-spezifisches CSS gehoert NICHT hierher, sondern in den
   <style>-Block der jeweiligen Seite. */
```

⚠️ **`@media`-Blöcke, die zu diesen Bereichen gehören, mitnehmen** — insbesondere die Regel, die die Menüleiste bei `max-width:959px` durch das Burger-Menü ersetzt. Sie steht in allen vier Dateien identisch.

- [ ] **Schritt 2: In allen vier Seiten den `<link>` ergänzen**

Direkt **nach** der Zeile mit `fonts.css` und **vor** dem ersten `<style>`:

```html
<link rel="stylesheet" href="/s2s.css">
```

Die Reihenfolge ist nicht kosmetisch: stünde `s2s.css` nach dem Inline-Block, würden geteilte Regeln seiten-eigene überschreiben und Layouts kippen.

- [ ] **Schritt 3: Prüfen, dass jetzt doppelt geladen wird — aber nichts kaputt ist**

```bash
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: `32 passed`. Die Regeln stehen jetzt zweimal (inline und in `s2s.css`), was optisch nichts ändert. Ist es hier schon rot, stimmt die Reihenfolge im `<head>` nicht.

- [ ] **Schritt 4: Committen — Zwischenstand mit Sicherheitsnetz**

```bash
git add s2s.css index.html about/index.html for-you/index.html results/index.html
git commit -m "refactor(css): s2s.css angelegt und in allen vier Seiten verlinkt

Noch ohne Entfernen der Inline-Duplikate: erst beweisen, dass Einbindung und
Reihenfolge stimmen, dann aufraeumen."
```

- [ ] **Schritt 5: Die Blöcke aus `index.html` entfernen — eine Datei nach der anderen**

Entferne aus dem Inline-`<style>` genau die Blöcke, die in Schritt 1 nach `s2s.css` kopiert wurden.

- [ ] **Schritt 6: Prüfen**

```bash
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: `32 passed`.

- [ ] **Schritt 7: Schritt 5 und 6 für `about/index.html` wiederholen**

- [ ] **Schritt 8: Schritt 5 und 6 für `for-you/index.html` wiederholen**

- [ ] **Schritt 9: Schritt 5 und 6 für `results/index.html` wiederholen**

- [ ] **Schritt 10: Committen**

```bash
git add index.html about/index.html for-you/index.html results/index.html
git commit -m "refactor(css): geteilte Regeln nur noch in s2s.css

Rund 23 KB standen in jeder der vier Seiten identisch — Tokens, Dark-Hardening,
Loader, Typo-Rollen, Header/Nav, Footer. Jetzt an einer Stelle.

Visueller Vergleich unveraendert gruen (32 Bilder, chromium + webkit)."
```

---

### Aufgabe 4: Shell-Markup an einer Stelle — angewandt auf `about/`

Die kleinste der vier Seiten zuerst, damit ein Fehler im Bauschritt möglichst wenig kostet.

**Dateien:**
- Anlegen: `lib/shell.mjs`
- Anlegen: `scripts/build-pages.mjs`
- Ändern: `about/index.html` (Marker einsetzen)

**Schnittstellen:**
- Erzeugt: `lib/shell.mjs` mit den benannten Exporten
  - `navigation(aktiv)` → `string` · `aktiv` ist einer von `'start' | 'about' | 'for-you' | 'results'`, steuert nur, welcher Menüpunkt `aria-current="page"` bekommt
  - `mobilMenue(aktiv)` → `string`
  - `fusszeile()` → `string`
- Erzeugt: `scripts/build-pages.mjs`, ausführbar über `node scripts/build-pages.mjs`. Aufgabe 5 wendet es auf die restlichen Seiten an.
- Markervertrag im HTML: `<!-- SHELL:NAV -->` … `<!-- /SHELL:NAV -->`, ebenso `SHELL:MOBIL` und `SHELL:FOOTER`. Alles zwischen den Markern wird bei jedem Lauf **ersetzt**.

- [ ] **Schritt 1: `lib/shell.mjs` anlegen**

Übernimm das Markup **wörtlich** aus `about/index.html` (Navigation ab Zeile ~608, Mobil-Menü ab ~628, Footer ab ~632 — Zeilen vor dem Port prüfen, sie verschieben sich durch Aufgabe 2 und 3).

```js
/**
 * Einzige Quelle fuer Navigation, Mobil-Menue und Footer.
 * Geaendert wird hier — nie in den einzelnen HTML-Dateien.
 * Danach `node scripts/build-pages.mjs` laufen lassen.
 */

// Menuepunkte in Anzeigereihenfolge. Pfade sind absolut, damit dieselbe
// Zeichenkette auf Start- und Unterseiten funktioniert.
const PUNKTE = [
  { schluessel: 'leistungen', text: 'Leistungen', href: '/#leistungen' },
  { schluessel: 'ablauf', text: 'Ablauf', href: '/#ablauf' },
  { schluessel: 'for-you', text: 'Für wen', href: '/for-you/' },
  { schluessel: 'results', text: 'Ergebnisse', href: '/results/' },
  { schluessel: 'about', text: 'Über uns', href: '/about/' },
  { schluessel: 'faq', text: 'FAQ', href: '/#faq' },
  // Kurzes Label mit Absicht: "Gratis-Vorschau" liess das Menue bei 1024px
  // umbrechen. Mobil und im Footer steht die lange Form.
  { schluessel: 'gratis', text: 'Gratis', href: '/#gratis' },
];

const aktuell = (schluessel, aktiv) =>
  schluessel === aktiv ? ' aria-current="page"' : '';

export function navigation(aktiv) {
  const eintraege = PUNKTE.map(
    (p) => `        <li><a href="${p.href}"${aktuell(p.schluessel, aktiv)}>${p.text}</a></li>`
  ).join('\n');
  return `      <ul class="nav-links">
${eintraege}
      </ul>`;
}

export function mobilMenue(aktiv) {
  const lang = { gratis: 'Gratis-Vorschau' };
  return PUNKTE.map(
    (p) =>
      `    <a class="m-link" href="${p.href}"${aktuell(p.schluessel, aktiv)}>${lang[p.schluessel] || p.text}</a>`
  ).join('\n');
}

// Nimmt `aktiv` entgegen, obwohl der Footer kein aria-current braucht:
// auf der Startseite muessen die Anker relativ bleiben (siehe Aufgabe 5).
export function fusszeile(aktiv) {
  const eintraege = PUNKTE.map((p) => {
    const lang = p.schluessel === 'gratis' ? 'Gratis-Vorschau' : p.text;
    return `          <li><a href="${p.href}">${lang}</a></li>`;
  }).join('\n');
  return `          <li><a href="https://mein.social2scale.com">Login · Mein Bereich</a></li>
${eintraege}`;
}
```

- [ ] **Schritt 2: `scripts/build-pages.mjs` anlegen**

```js
#!/usr/bin/env node
/**
 * Setzt Navigation, Mobil-Menue und Footer aus lib/shell.mjs in die Seiten ein.
 * Alles zwischen <!-- SHELL:X --> und <!-- /SHELL:X --> wird ersetzt.
 *
 * Aufruf: node scripts/build-pages.mjs
 * Ohne Argumente laeuft es ueber alle eingetragenen Seiten.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { navigation, mobilMenue, fusszeile } from '../lib/shell.mjs';

const SEITEN = [
  { datei: 'index.html', aktiv: 'start' },
  { datei: 'about/index.html', aktiv: 'about' },
  { datei: 'for-you/index.html', aktiv: 'for-you' },
  { datei: 'results/index.html', aktiv: 'results' },
];

function ersetze(html, name, inhalt, datei) {
  const muster = new RegExp(
    `(<!-- SHELL:${name} -->)[\\s\\S]*?(<!-- /SHELL:${name} -->)`
  );
  if (!muster.test(html)) {
    throw new Error(`Marker SHELL:${name} fehlt in ${datei}`);
  }
  return html.replace(muster, `$1\n${inhalt}\n$2`);
}

let geaendert = 0;
for (const seite of SEITEN) {
  let html;
  try {
    html = readFileSync(seite.datei, 'utf8');
  } catch {
    console.log(`übersprungen (nicht vorhanden): ${seite.datei}`);
    continue;
  }
  if (!html.includes('<!-- SHELL:NAV -->')) {
    console.log(`übersprungen (noch keine Marker): ${seite.datei}`);
    continue;
  }

  const neu = ersetze(
    ersetze(
      ersetze(html, 'NAV', navigation(seite.aktiv), seite.datei),
      'MOBIL',
      mobilMenue(seite.aktiv),
      seite.datei
    ),
    'FOOTER',
    fusszeile(seite.aktiv),
    seite.datei
  );

  if (neu !== html) {
    writeFileSync(seite.datei, neu, 'utf8');
    console.log(`aktualisiert: ${seite.datei}`);
    geaendert++;
  } else {
    console.log(`unveraendert: ${seite.datei}`);
  }
}
console.log(`fertig — ${geaendert} Datei(en) geaendert.`);
```

- [ ] **Schritt 3: Marker in `about/index.html` setzen**

Umschließe die drei Bereiche. Beispiel für die Navigation:

```html
      <!-- SHELL:NAV -->
      <ul class="nav-links">
        … bestehendes Markup bleibt vorerst stehen …
      </ul>
      <!-- /SHELL:NAV -->
```

Ebenso `SHELL:MOBIL` um die `.m-link`-Zeilen und `SHELL:FOOTER` um die `<li>`-Liste in der Footer-Spalte „Agentur".

- [ ] **Schritt 4: Bauschritt laufen lassen**

```bash
cd ~/s2s-extern
node scripts/build-pages.mjs
```

Erwartet:
```
aktualisiert: about/index.html
übersprungen (noch keine Marker): index.html
übersprungen (noch keine Marker): for-you/index.html
übersprungen (noch keine Marker): results/index.html
fertig — 1 Datei(en) geaendert.
```

- [ ] **Schritt 5: Prüfen**

```bash
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: `32 passed`. Rot bedeutet: das erzeugte Markup weicht vom Bestand ab — dann `lib/shell.mjs` angleichen, **nicht** das Basisbild neu schreiben.

- [ ] **Schritt 6: Prüfen, dass ein fehlender Marker auffällt**

```bash
node -e "
import('./lib/shell.mjs').then(async () => {
  const { readFileSync } = await import('node:fs');
  const h = readFileSync('about/index.html','utf8');
  console.log('Marker vorhanden:', ['NAV','MOBIL','FOOTER'].every(n => h.includes('<!-- SHELL:'+n+' -->')));
});
"
```

Erwartet: `Marker vorhanden: true`

- [ ] **Schritt 7: Committen**

```bash
git add lib/ scripts/build-pages.mjs about/index.html
git commit -m "refactor(shell): Navigation, Mobil-Menue und Footer aus einer Quelle

lib/shell.mjs ist ab jetzt die einzige Stelle, an der Menuepunkte stehen.
scripts/build-pages.mjs setzt sie zwischen die SHELL-Marker. Zuerst nur
about/ — die kleinste Seite, damit ein Fehler wenig kostet.

Visueller Vergleich unveraendert gruen (32 Bilder, chromium + webkit)."
```

---

### Aufgabe 5: Die restlichen drei Seiten auf die Shell

**Dateien:**
- Ändern: `index.html`, `for-you/index.html`, `results/index.html`

**Schnittstellen:**
- Verbraucht: `lib/shell.mjs` und `scripts/build-pages.mjs` aus Aufgabe 4, unverändert.

- [ ] **Schritt 1: Marker in `for-you/index.html` setzen**

Genau wie in Aufgabe 4, Schritt 3: `SHELL:NAV`, `SHELL:MOBIL`, `SHELL:FOOTER`.

- [ ] **Schritt 2: Bauen und prüfen**

```bash
node scripts/build-pages.mjs
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: `aktualisiert: for-you/index.html` und danach `32 passed`.

- [ ] **Schritt 3: Committen**

```bash
git add for-you/index.html
git commit -m "refactor(shell): for-you auf die gemeinsame Shell"
```

- [ ] **Schritt 4: Marker in `results/index.html` setzen, bauen, prüfen, committen**

```bash
node scripts/build-pages.mjs
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
git add results/index.html
git commit -m "refactor(shell): results auf die gemeinsame Shell"
```

- [ ] **Schritt 5: Marker in `index.html` setzen — zuletzt, weil sie am meisten trägt**

⚠️ Auf der Startseite verweisen die Menüpunkte auf **Anker ohne führenden Schrägstrich** (`#leistungen` statt `/#leistungen`). `lib/shell.mjs` erzeugt die absolute Form. Beides führt zum selben Ziel, aber die absolute Form löst auf der Startseite einen zusätzlichen Navigationsschritt aus.

Ergänze in `lib/shell.mjs` oben, neben `aktuell`:

```js
// Auf der Startseite bleiben Anker relativ (#faq), sonst absolut (/#faq).
// Beides landet am selben Ziel, aber die absolute Form loest auf der
// Startseite einen unnoetigen Seitenwechsel aus.
const pfad = (href, aktiv) =>
  aktiv === 'start' && href.startsWith('/#') ? href.slice(1) : href;
```

und benutze in **allen drei** Funktionen `pfad(p.href, aktiv)` statt `p.href` —
auch in `fusszeile`, die `aktiv` genau dafür entgegennimmt.

⚠️ **Der Pixel-Vergleich sieht diese Änderung nicht** — `href`-Werte erzeugen
keine optische Abweichung. Deshalb zusätzlich prüfen:

```bash
grep -o 'href="[^"]*faq"' index.html | sort -u
grep -o 'href="[^"]*faq"' about/index.html | sort -u
```

Erwartet: `href="#faq"` auf der Startseite, `href="/#faq"` auf `about/`.

- [ ] **Schritt 6: Bauen und prüfen**

```bash
node scripts/build-pages.mjs
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: `32 passed`.

- [ ] **Schritt 7: Gegenprobe — ändert eine Menü-Änderung wirklich alle vier Seiten?**

```bash
# Testweise einen Punkt umbenennen
sed -i '' "s/text: 'FAQ'/text: 'Fragen'/" lib/shell.mjs
node scripts/build-pages.mjs
grep -c '>Fragen<' index.html about/index.html for-you/index.html results/index.html
```

Erwartet: jede Datei meldet mindestens 2 Treffer (Nav + Footer). Danach zurücknehmen:

```bash
sed -i '' "s/text: 'Fragen'/text: 'FAQ'/" lib/shell.mjs
node scripts/build-pages.mjs
NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
```

Erwartet: wieder `32 passed`.

- [ ] **Schritt 8: Committen**

```bash
git add lib/shell.mjs index.html
git commit -m "refactor(shell): Startseite auf die gemeinsame Shell

Damit stehen die Menuepunkte an genau einer Stelle. Gegengeprueft: eine
Aenderung in lib/shell.mjs schlaegt auf alle vier Seiten durch.

Visueller Vergleich unveraendert gruen (32 Bilder, chromium + webkit)."
```

---

### Aufgabe 6: Ablauf festhalten, damit er benutzt wird

Ein Bauschritt, den niemand kennt, wird umgangen — und dann stehen Menüpunkte wieder in vier Dateien.

**Dateien:**
- Ändern: `docs/WER-MACHT-WAS.md`
- Anlegen: `docs/SEITEN-BAUEN.md`

- [ ] **Schritt 1: `docs/SEITEN-BAUEN.md` anlegen**

```markdown
# Seiten bauen

## Menüpunkt ändern, hinzufügen, entfernen

1. `lib/shell.mjs` bearbeiten — das ist die einzige Stelle.
2. `node scripts/build-pages.mjs`
3. `NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test`
4. Ist der visuelle Vergleich rot und die Änderung war beabsichtigt:
   `… playwright test --update-snapshots` und die neuen Bilder mitcommitten.
   Ist sie **nicht** beabsichtigt: zurücknehmen.

## Niemals

- Navigation oder Footer direkt in einer HTML-Datei ändern. Der nächste
  Bauschritt überschreibt es kommentarlos.
- Die Schwelle in `playwright.config.mjs` erhöhen, damit ein Test grün wird.
- `upgrade-insecure-requests` in eine CSP zurückschreiben — bricht Safari
  auf localhost, siehe Commit `a366449`.

## Geteiltes CSS

`s2s.css` enthält Tokens, Dark-Hardening, Loader, Typo-Rollen, Header/Nav
und Footer. Seiten-eigenes CSS bleibt im `<style>`-Block der jeweiligen
Seite — **nicht** in `s2s.css`. Reihenfolge im `<head>` ist bindend:
`fonts.css` → `s2s.css` → `<style>`.
```

- [ ] **Schritt 2: In `docs/WER-MACHT-WAS.md` unter „Besitz nach Bereich" ergänzen**

```markdown
| Shell und Bauschritt | **extern** | `s2s.css`, `lib/shell.mjs`, `scripts/build-pages.mjs`, `tests/`, `playwright.config.mjs` |
```

- [ ] **Schritt 3: Committen und nach `main` bringen**

```bash
git add docs/
git commit -m "docs: Ablauf fuer Menue-Aenderungen und geteiltes CSS"
git push origin feat/website-extern:main
```

---

## Fertig ist Phase 1+2, wenn

- [ ] `s2s.css` existiert und wird von allen vier Seiten geladen
- [ ] Kein Menüpunkt steht mehr in einer HTML-Datei — nur in `lib/shell.mjs`
- [ ] `node scripts/build-pages.mjs` erzeugt alle vier Seiten reproduzierbar
- [ ] 32 visuelle Vergleiche grün, chromium **und** webkit
- [ ] Die drei Unterseiten tragen kein Startseiten-CSS mehr
- [ ] `docs/SEITEN-BAUEN.md` beschreibt den Ablauf
- [ ] Alles auf `main` gepusht, Live-Seite unverändert im Aussehen
