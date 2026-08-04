# Freebie-Funnel: „Sie erkennt sich" — Personalisierung + IG-Detailtreue

Datum: 2026-08-04 · Branch: `feat/free-content-funnel` · Ordner: `~/social2scale-site/free-content/`

## Ziel

Die generierte Feed-Vorschau soll sich nach der jeweiligen Kundin anfühlen, nicht
nach einem generischen s2s-Template. Der Moment beim Öffnen des Reveals:
**„das bin ja ich!"** — ihr echtes Profilbild, ihre Markenfarbe, ein Mockup, das
wie echtes Instagram aussieht.

## Ist-Zustand (verifiziert 04.08.)

- Avatar im Profil-Frame = Initial-Buchstabe (`frames.js:165`).
- Payload-Feld `farbe` wird immer leer geschickt (`form.js:352`) — der Wizard
  fragt nie danach. `derivePalettes()` (`palette.js`) kann eine Wunschfarbe
  bereits als Akzent übernehmen, inkl. Kontrast-Gate pro Welt. **Ressource da,
  Auslieferung leer.**
- Einzige visuelle Personalisierung: Stimmungs-Chip → 2 von 4 festen Welten.
- Profil-Frame ist bereits ein IG-Mockup (Statusbar, Handle-Top, Stats, Bio,
  Highlights, 3er-Grid), aber mit Abstrichen in der Detailtreue.

## 1. Echtes Profilbild (Upload im Wizard — GEÄNDERT 04.08. abends)

⚠️ **Der automatische Weg ist tot, live verifiziert:** unavatar.io verlangt für
den Instagram-Provider einen Pro-Plan (403 + JSON), und Instagram leitet
Anfragen aus Cloudflare-Worker-IPs auf den Login um (vom Edge getestet via
Wegwerf-Worker, auch `/embed/` liefert keine Bild-URLs). Ein Server-Fetch
hätte still IMMER den Fallback geliefert — „Ressource da, Auslieferung leer"
als Feature. Entscheidung Sebi: **optionaler Foto-Upload im Wizard.**

- **Wo:** Neuer optionaler Wizard-Step „Zeig dich" — sie wählt ihr Profilbild
  oder ein Lieblingsfoto. Client verkleinert auf ~512px JPEG (Canvas) und
  schickt es als data-URL im bestehenden JSON-Payload (`foto`).
- **Server:** `handleSubmit` legt das geprüfte Bild nicht-fatal als
  `free/<token>/avatar.bin` in R2 ab (bewusst NICHT `.jpg` — der
  Fortschrittszähler `buildStatus` zählt `.jpg`-Keys). `generate.js` lädt es
  beim Bauen parallel zur Copy und bettet es als data-URL in die Frames.
- **Gates (kein „Ressource da, Auslieferung leer"):** data-URL-Format
  (`image/jpeg|png|webp`), Mindestgröße (> 2 KB), Maximalgröße. Nur wenn alle
  Gates halten, gilt das Bild als da.
- **DSGVO-Vorteil:** Sie lädt selbst hoch = klare Einwilligung, kein Scraping,
  kein Drittanbieter.
- **Ablage:** KEIN R2-Objekt (Entscheidung im Plan: ein `avatar.jpg` im
  Lead-Prefix würde den `.jpg`-Zähler von `buildStatus` verfälschen, und
  Reveal/Share zeigen ohnehin nur die gerenderten Frames). Das Bild lebt als
  data-URL nur im Render-Durchlauf und danach eingebrannt in den Frames.
- **Einbettung ins Frame:** als data-URL in `clean.avatarUrl` — die
  Browser-Rendering-Seite kommt per `setContent` ohne Origin und kann externe
  Quellen nicht zuverlässig laden. Rund maskiert im bestehenden
  `.avatar`-Slot, mit Story-Ring in der Akzentfarbe.
- **Fallback:** Fetch scheitert / Gates greifen → Initial-Buchstabe wie heute.
  Der Ausfall ist still für die Besucherin, aber geloggt.
- **Reveal + Share-Card ziehen mit:** Reveal-Profilkarte zeigt das echte Foto;
  Share-Card zeigt es klein neben `@handle` (persönlicheres Teilen). Fallback
  identisch (Initial).
- **Kein Client-Fetch:** Die Besucherin lädt nie direkt von unavatar/IG —
  alles re-hosted aus R2, CSP bleibt eng.

## 2. Markenfarbe im Wizard (optional, +1 Step)

- Neuer Step direkt NACH der Stimmungsfrage: **„Hat deine Marke eine Farbe?"**
- 6 kuratierte Farb-Chips — jede auf allen 4 Welten-Papieren gegen
  `ACCENT_MIN_CONTRAST` geprüft (Test erzwingt das), damit keine Wahl das Bild
  zerstören kann. Plus „Eigene…" (nativer Color-Input) + prominentes
  „Überspringen" (Step ist optional, kein `data-req`).
- Payload: füllt das existierende Feld `farbe` (Hex). Backend-Änderung: nahe
  null — `derivePalettes()` und `validate.js` können es bereits; Payload-Vertrag
  (`WER-MACHT-WAS.md`, Berührungsfläche form.js→validate.js) prüfen und ggf.
  Doku nachziehen, NICHT umbenennen.
- Bei „Eigene…" mit zu schwachem Kontrast entscheidet weiterhin `derivePalettes`
  pro Welt (stiller Rückfall auf den Welt-Akzent — bestehendes, dokumentiertes
  Verhalten).
- Schrittzahl-Anzeige („In 60 Sekunden" / `TOTAL`) mitzählen und Text prüfen.

## 3. IG-Detailtreue („an Instagram selbst orientieren")

Der Profil-Frame wird näher ans echte IG-Profil gerückt — Premium heißt hier:
sieht aus wie ein Screenshot, nicht wie eine Illustration.

- Avatar mit **Story-Ring** (Gradient-Ring wie bei aktiver Story) um das echte
  Foto — stärkstes IG-Signal.
- Profil-Kopf-Reihenfolge/Proportionen wie IG heute: Avatar links, Stats rechts,
  Name fett, Bio darunter, Highlights als Kreise mit Label, Grid randlos mit
  1-2px Gaps.
- Post-Slides: Karussell-Indikator („1/3"-Pille oben rechts) statt/zusätzlich
  zur `idx`-Zeile, sofern es die bestehende Slide-Typo nicht schlägt —
  Feinschliff-Entscheidung beim Umsetzen mit Sichtprüfung.
- KEIN Nachbau von IG-Chrome-Elementen mit Marken-Assets (kein IG-Logo-Asset
  einbetten) — Look-alike ja, Logo-Kopie nein.

## 4. DSGVO / Sicherheit

- Avatar-Fetch = Verarbeitung öffentlicher IG-Daten auf unseren Servern →
  **ein Satz im Datenschutz-Abschnitt des Funnels ergänzen** (Quelle, Zweck
  Vorschau-Personalisierung, Speicherdauer an Lead-Lebensdauer gekoppelt).
  🔴 Sebi liest den Satz gegen (wie Abschnitt 12).
- Fetch-URL wird ausschließlich aus dem VALIDIERTEN Handle gebaut (validate.js
  normalisiert bereits); kein roher User-Input in URLs.
- Bild wird niemals von Dritt-Origins an Besucherinnen ausgeliefert; CSP
  (Report-Only) unverändert eng.

## Nicht in diesem Scope (YAGNI)

Farb-Extraktion aus dem Avatar · Foto-Upload im Wizard · Canva-Export ·
CSP scharf schalten (eigener Backlog-Punkt) · Follow-up-Triage.

## Tests & Verifikation

- Vitest: Avatar-Gates (404, falscher Content-Type, Mini-Bild, Timeout →
  Fallback Initial) · Farb-Chip-Kontrast-Test (6 Chips × 4 Welten ≥
  `ACCENT_MIN_CONTRAST`) · Payload enthält `farbe` · Frames rendern mit und
  ohne Avatar-Quelle.
- E2E: echter Testlead durch den 8-Step-Wizard (Playwright, EIGENER Port,
  `reuseExistingServer:false` — Fremdserver-Falle), Screenshots 390/1440,
  danach Testdaten restlos entfernen.
- Live-Verifikation nach Deploy: Deploy-Rennen beachten (~1 Min warten),
  Reveal + Share-Card + Mail selbst ansehen — grüner Vergleich beweist nichts.
