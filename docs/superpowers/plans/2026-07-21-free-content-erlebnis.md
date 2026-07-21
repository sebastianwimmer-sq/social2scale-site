# Free-Content-Funnel — Plan 3: Erlebnis (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die abgenommenen Design-Prototypen (Formular · Bestätigungsmail · Build-Screen · Reveal) als echten Worker-Code ausliefern, sodass der Funnel end-to-end läuft: Eintrag → Mail → Bestätigung → Live-Build → ergebnisorientierter Reveal.

**Architecture:** Der bestehende Worker `s2s-free-content` (Plan 1+2, Branch `feat/free-content-funnel`) hat schon alle Daten-/API-Routen. Plan 3 fügt **HTML-Seiten** hinzu, die der Worker selbst ausliefert: `GET /` = Formular, `GET /r/:token` = eine einzige Seite, die vom **Build-Screen** (solange `state=building`) nahtlos zum **Reveal** (bei `state=ready`) morpht — ein durchgehender Faden, dasselbe Handy. Die Bestätigungsmail (`mail.js`) bekommt das Produktions-HTML. Alle Seiten liegen als fokussierte Module unter `free-content/src/pages/`, teilen sich eine Shell (`shell.js`) und referenzieren **gehostete** Schriften/Bilder (nie base64).

**Tech Stack:** Cloudflare Workers (ES-Module), D1, R2, Turnstile; Vitest + `@cloudflare/vitest-pool-workers` (206 Tests grün); Playwright (global unter `/opt/homebrew/lib/node_modules/playwright`) für Rendering-Smoke.

## Global Constraints

- **Gehostete Assets, NIE base64.** Schriften: `https://social2scale.com/fonts/{hanken,archivo,fraunces-normal}-latin.woff2`. Bilder: `https://social2scale.com/assets/workspace-portrait.webp`, `https://social2scale.com/assets/sig-wordmark.png`, `https://social2scale.com/assets/sig-avatar.png`. (Worker-Response klein/cachebar; Gmail rendert kein base64.)
- **Markensprache fix:** Schriften Fraunces (Serif-Headline + Emerald→Teal-Italic) / Archivo (Labels/Buttons, uppercase) / Hanken (Body). Palette `--emerald:#00B888` · `--emerald-soft:#1FC998` · `--teal:#1FA6E0` · Ink `#F2F3F1` auf `#03080D`. Hintergrund = Hero-Wash: `radial-gradient(95% 75% at 14% 6%,rgba(0,184,136,.34),transparent 55%), radial-gradient(98% 82% at 90% 92%,rgba(20,140,200,.30),transparent 56%), linear-gradient(150deg,#04140F,#05131C 52%,#03080D)`.
- **Responsive robust:** Content-Spalte `max-width` zentriert (Desktop), kleine Phones ohne Overflow (bei Platzmangel scrollen statt clippen), Stats umbruchsicher (`white-space:nowrap`), Handy-Breite relativ zur Spalte (`min(60%,232px)`) — nicht `vw`.
- **Turnstile Site-Key:** `0x4AAAAAAD5FwCxWtZhzGlpX` (Widget im Formular). Server prüft `TURNSTILE_SECRET`.
- **Keine Sackgassen (Spec §9):** Jeder Fehlerfall nennt die HANDLUNG (was JETZT tun), nicht die Ursache. Bestehende Muster: `CONFIRM_FEHLER` in `index.js`.
- **Reveal-CTA:** primär „Erstgespräch buchen" → `https://social2scale.com/anfrage/`; sekundär „Vorschau speichern" (lädt die 4 Bilder der gewählten Farbwelt). Digistore-CTA kommt später (Platzhalter-Kommentar, nicht bauen).
- **Vorschau-Hinweis** (Erwartung + Upsell): „∗ Beispiel-Vorschau — deinen echten Feed gestalten wir danach persönlich mit dir." — auf Formular UND Reveal.
- **Status-Kontrakt:** `GET /api/status/:token` → `{ state, step, done, total, images }`. `total = 8` (FRAME_IDS). `images` = Array bereits fertiger Frame-Namen. Bilder: `GET /img/:token/<frame>.jpg`. FRAME_IDS = `f-0-profil,f-0-s1,f-0-s2,f-0-s3,f-1-profil,f-1-s1,f-1-s2,f-1-s3` (Welt 0 & Welt 1 = 2 Farbwelten, je Profil + 3 Slides).
- **Dateien <400 Zeilen, Fehler nie still schlucken** (jeder `catch` loggt `console.error`).
- **Design-Quelle (verbindlich, 1:1 portieren, nur base64→gehostet + Endpunkte verdrahten):** `free-content/design/prototypes/{form,build,reveal,confirm-email}.html`. Die `__HANKEN__/__ARCHIVO__/__FRAUNCES__/__PHOTOBG__/__LOGO__`-Platzhalter in den Templates werden durch `@font-face`-Regeln bzw. `url(https://social2scale.com/...)` ersetzt (KEINE base64-Injektion mehr).

---

## File Structure

- **Create `free-content/src/pages/shell.js`** — `htmlDoc({ title, head, body })`: Doctype + `<head>` (charset, viewport, `color-scheme`, Titel, gehostete `@font-face`-Regeln, Brand-CSS-Tokens, Cosmos/Scene-Hintergrund) + `<body>`. Eine Quelle für Kopf/Tokens/Hintergrund aller Seiten.
- **Create `free-content/src/pages/form.js`** — `formPage(env)`: liefert das Formular-HTML (aus `design/prototypes/form.html` portiert). Postet same-origin an `/api/free-content`. Turnstile-Widget.
- **Create `free-content/src/pages/result.js`** — `resultPage(token)`: die `/r/:token`-Seite. Enthält Build-Screen- UND Reveal-Markup + das JS, das `/api/status/:token` pollt und zwischen den Zuständen morpht.
- **Create `free-content/src/pages/copy.js`** — geteilte, i18n-freie deutsche UI-Texte (Fortschritts-Steps, Fehlertexte, Reveal-Copy) als Konstanten. Hält Copy aus dem Markup, DRY über Build/Reveal/Error.
- **Create `free-content/src/track.js`** — `track(env, event)`: leichter Funnel-Zähler in D1 (`funnel_events`). Events: `entered, confirmed, ready, cta_call, cta_save`.
- **Modify `free-content/src/mail.js`** — `buildConfirmMail()` liefert das Produktions-HTML (aus `design/prototypes/confirm-email.html`), Platzhalter `{{VORNAME}}`/`{{CONFIRM_URL}}` gefüllt.
- **Modify `free-content/src/index.js`** — `GET /` → `formPage`; `GET /r/:token` → `resultPage`; `FORMULAR_URL` → `${PUBLIC_ORIGIN}/`; Tracking-Hooks (`entered` bei created, `confirmed` bei confirm).
- **Create migration `~/social2scale-clients/_portal/migrate-v13.sql`** — Tabelle `funnel_events` (additiv/idempotent). (NICHT `--remote` in diesem Plan; nur Datei anlegen; Live-Gate später.)
- **Tests:** `free-content/test/pages.test.js` (Seiten-Serving + Marker), erweitere `free-content/test/mail.test.js` (Produktions-HTML), `free-content/test/track.test.js`. Rendering-Smoke via `free-content/test/render-pages.mjs` (Playwright, gegen `wrangler dev` oder statisch gemountetes HTML).

---

### Task 1: Shared Shell + Formular-Seite an `/`

**Files:**
- Create: `free-content/src/pages/shell.js`, `free-content/src/pages/form.js`
- Modify: `free-content/src/index.js` (Route `GET /`, `FORMULAR_URL`)
- Design-Quelle: `free-content/design/prototypes/form.html`
- Test: `free-content/test/pages.test.js`

**Interfaces:**
- Consumes: `env.PUBLIC_ORIGIN` (z.B. `https://start.social2scale.com`), `env.TURNSTILE_SITE_KEY` (neu in `wrangler.toml` `[vars]` = `0x4AAAAAAD5FwCxWtZhzGlpX`).
- Produces: `htmlDoc({title, head, body})` (shell.js), `formPage(env)` → `Response` mit `Content-Type: text/html; charset=utf-8`.

- [ ] **Step 1: Failing test — `/` liefert das Formular**
```js
// free-content/test/pages.test.js
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

describe('Formular-Seite', () => {
  it('GET / liefert HTML mit Formular, gehosteten Assets und Turnstile', async () => {
    const req = new Request('https://start.social2scale.com/');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('/api/free-content');                 // postet richtig
    expect(html).toContain('social2scale.com/fonts/hanken');     // gehostete Schrift
    expect(html).toContain('0x4AAAAAAD5FwCxWtZhzGlpX');           // Turnstile-Sitekey
    expect(html).not.toContain('base64');                        // KEINE eingebetteten Assets
    expect(html).toContain('Beispiel-Vorschau');                 // Vorschau-Hinweis
  });
});
```
- [ ] **Step 2: Run — erwartet FAIL** (`GET /` gibt aktuell 404 `not_found`).
Run: `cd free-content && npx vitest run test/pages.test.js`
Expected: FAIL (status 404, kein HTML).

- [ ] **Step 3: `shell.js` schreiben.** `htmlDoc({title, head='', body})` gibt einen `Response` zurück. Der `<head>` enthält: `<meta charset>`, `<meta viewport>`, `<meta name="color-scheme" content="dark light">`, `<title>`, die drei `@font-face`-Regeln mit `src:url(https://social2scale.com/fonts/<x>-latin.woff2)`, die `:root`-Brand-Tokens + der Cosmos/Scene-Hintergrund (Hero-Wash + `.photo`-Layer mit `url(https://social2scale.com/assets/workspace-portrait.webp)` + `.grain` SVG-noise inline). CSS-Tokens/Hintergrund **1:1 aus `design/prototypes/form.html`** übernehmen, nur die `@font-face src`- und `.photo background`-Werte von `__PLATZHALTER__`/base64 auf die gehosteten URLs setzen. Datei <400 Zeilen (nur Kopf/Tokens/Hintergrund, kein Seiten-spezifisches CSS).

- [ ] **Step 4: `form.js` schreiben.** `formPage(env)` baut den Formular-`body` (Markup + seiten-spezifisches CSS + JS) **portiert aus `design/prototypes/form.html`**, mit diesen Änderungen:
  - `__HANKEN__/__ARCHIVO__/__FRAUNCES__` entfallen (die `@font-face` kommen aus `shell.js`, gehostet).
  - `.photo` `url(...)` → `https://social2scale.com/assets/workspace-portrait.webp`.
  - `.wm-logo src` → `https://social2scale.com/assets/sig-wordmark.png`.
  - Formular-`submit`: statt Prototyp-Navigation `show(6)` beim letzten Schritt echt an `POST /api/free-content` senden (JSON: `{name, email, handle, branche:thema, ziel:'', stimmung, farbe, consent, elapsed, turnstile, source}`; `elapsed` = ms seit Laden gegen `isTooFast`; `turnstile` = Token des Turnstile-Widgets). Bei `res.ok` → `show(6)` (Postfach-Screen). Bei Fehler (422/403/429) → die Frage-Sheet zeigt einen dezenten Fehlertext (Handlung nennen: „Bitte prüf deine E-Mail" / „Kurz warten und nochmal").
  - Turnstile-Widget: `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` + ein `<div class="cf-turnstile" data-sitekey="0x4AAAAAAD5FwCxWtZhzGlpX" data-theme="dark">` auf dem letzten Schritt; Token via `turnstile.getResponse()`.
  - Alle anderen Interaktionen (Live-Vorschau, Stimmung→Farbwelt, E-Mail-Tippfehler-Vorschlag, Postfach-öffnen, Vorschau-Hinweis, Responsive-Regeln) **unverändert** aus dem Prototyp übernehmen.
  Return: `htmlDoc({ title:'Deine Gratis-Vorschau · social2scale', head:'', body })`.

- [ ] **Step 5: `index.js` verdrahten.** Oben `import { formPage } from './pages/form.js';`. In `fetch`, VOR dem `not_found`-Fallback: `if (url.pathname === '/' && request.method === 'GET') return formPage(env);`. `FORMULAR_URL` von `'https://social2scale.com/free-content/'` auf `` `${env.PUBLIC_ORIGIN || 'https://start.social2scale.com'}/` `` umstellen — dazu `FORMULAR_URL` aus Konstante in die Fehler-Helfer als Parameter reichen ODER innerhalb `fetch` bilden (Env erst dort verfügbar). Sauber: `CONFIRM_FEHLER` in eine Funktion `confirmFehler(formularUrl, anfrageUrl)` wandeln, in `handleConfirm(token, env, ctx)` mit `env.PUBLIC_ORIGIN` aufrufen.

- [ ] **Step 6: Run — erwartet PASS.**
Run: `cd free-content && npx vitest run test/pages.test.js`
Expected: PASS.

- [ ] **Step 7: Rendering-Smoke (Playwright).** Schreibe `free-content/test/render-pages.mjs`: startet `npx wrangler dev --port 8799` (oder rendert das `formPage`-HTML in eine Temp-Datei), lädt `http://localhost:8799/` bei 390px und 1440px, prüft: Logo sichtbar (nicht abgeschnitten), Handy-Vorschau sichtbar, keine Konsolen-Fehler, kein horizontaler Overflow (`document.documentElement.scrollWidth <= innerWidth`). Screenshot nach `free-content/design/prototypes/_smoke-form-{390,1440}.png`. Manuell prüfen.
Run: `cd free-content && node test/render-pages.mjs`
Expected: „ok", zwei Screenshots, kein Overflow.

- [ ] **Step 8: Commit.**
```bash
git add free-content/src/pages/shell.js free-content/src/pages/form.js free-content/src/index.js free-content/test/pages.test.js free-content/test/render-pages.mjs
git commit -m "feat(free-content): Formular-Seite vom Worker an / (gehostete Assets, Turnstile)"
```

---

### Task 2: Bestätigungsmail — Produktions-HTML in mail.js

**Files:**
- Modify: `free-content/src/mail.js` (`buildConfirmMail`)
- Design-Quelle: `free-content/design/prototypes/confirm-email.html`
- Test: `free-content/test/mail.test.js`

**Interfaces:**
- Consumes: `lead.name`, `lead.token`, `env.PUBLIC_ORIGIN`.
- Produces: `buildConfirmMail(lead, publicOrigin)` → `{ subject, html }` (Signatur unverändert; nur `html` wird ersetzt).

- [ ] **Step 1: Failing test.**
```js
// ergänze in free-content/test/mail.test.js
import { buildConfirmMail } from '../src/mail.js';
it('Bestätigungsmail: gehostete Bilder, Confirm-Link, Vorname, kein base64', () => {
  const { html } = buildConfirmMail({ name: 'Sabine', token: 'abc123' }, 'https://start.social2scale.com');
  expect(html).toContain('Sabine');
  expect(html).toContain('https://start.social2scale.com/c/abc123');
  expect(html).toContain('social2scale.com/assets/sig-wordmark.png'); // gehostet
  expect(html).not.toContain('base64');
  expect(html).toContain('Philipp Libowicz');                          // Impressum-Pflicht
  expect(html).not.toContain('{{VORNAME}}');                           // Platzhalter ersetzt
});
```
- [ ] **Step 2: Run — FAIL** (aktuelles `buildConfirmMail` liefert das alte, minimale HTML).
Run: `cd free-content && npx vitest run test/mail.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementieren.** In `mail.js` das `html` von `buildConfirmMail` durch das Markup aus `design/prototypes/confirm-email.html` ersetzen (als Template-String, ohne `<html>`-Doctype-Duplikat falls `send()` schon rahmt — prüfen; die Prototyp-Datei ist ein vollständiges HTML-Dokument, das ist für E-Mail korrekt). `{{VORNAME}}` → `esc(lead.name || 'schön')`, `{{CONFIRM_URL}}` → `` `${publicOrigin}/c/${encodeURIComponent(lead.token)}` ``. `subject` unverändert lassen (`'Nur noch ein Klick bis zu deinem ersten s2s Free Content'`). Bilder-URLs bleiben die gehosteten aus dem Prototyp.

- [ ] **Step 4: Run — PASS.**
Run: `cd free-content && npx vitest run test/mail.test.js`
Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add free-content/src/mail.js free-content/test/mail.test.js
git commit -m "feat(free-content): produktionsreife Bestätigungsmail (gehostet, Impressum, color-scheme)"
```

---

### Task 3: Result-Seite `/r/:token` — Build-Screen-Zustand

**Files:**
- Create: `free-content/src/pages/result.js`, `free-content/src/pages/copy.js`
- Modify: `free-content/src/index.js` (Route `GET /r/:token`)
- Design-Quelle: `free-content/design/prototypes/build.html`
- Test: `free-content/test/pages.test.js`

**Interfaces:**
- Consumes: `GET /api/status/:token` → `{ state, step, done, total, images }`; Bilder `GET /img/:token/<frame>.jpg`; FRAME_IDS-Reihenfolge (s. Global Constraints).
- Produces: `resultPage(token)` → `Response` (HTML). Das eingebettete JS pollt Status im 1,5-s-Takt, füllt das Grid mit den Bildern aus `images`, zeigt `step` als Fortschrittstext, `done/total` als Zähler. Bei `state==='ready'` ruft es `showReveal()` (Task 4). Bei Fehler-States (Task 5) `showError(reason)`.

- [ ] **Step 1: Failing test.**
```js
it('GET /r/:token liefert Build-Screen-HTML, das /api/status pollt', async () => {
  const req = new Request('https://start.social2scale.com/r/deadbeefdead');
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain('/api/status/deadbeefdead');   // pollt den richtigen Token
  expect(html).toContain('/img/deadbeefdead/');         // Bild-Pfad-Präfix
  expect(html).not.toContain('Wird gebaut (Plan 2)');   // Platzhalter ersetzt
  expect(html).not.toContain('base64');
});
```
- [ ] **Step 2: Run — FAIL** (aktuell Platzhalter „Wird gebaut (Plan 2)").
Run: `cd free-content && npx vitest run test/pages.test.js`
Expected: FAIL.

- [ ] **Step 3: `copy.js` schreiben.** Exportiere `STEPS` (Array `{at, text}` aus dem Build-Prototyp: „Wir lesen deine Marke …" … „Fertig — scroll dich rein."), `FRAME_IDS`, `TILE_LABELS`, und `ERROR_COPY` (Task 5) als Konstanten.

- [ ] **Step 4: `result.js` — Build-Teil schreiben.** `resultPage(token)` baut den `body` **portiert aus `design/prototypes/build.html`** (echtes iPhone, IG-Profil, Grid, s2s-Live-Activity, Tiefe/Bokeh/Grain, Motion, `prefers-reduced-motion`), mit:
  - `token` server-seitig in einen `<script>const TOKEN='<token>'</script>` injiziert (nur aus dem validierten Route-Match, `[a-f0-9]{8,128}`).
  - Das Prototyp-`window.__setState`/`render(done)` wird ersetzt durch einen echten **Poller**: `fetch('/api/status/'+TOKEN)` alle 1500 ms; aus der Antwort `render(done, step)` aufrufen; die `images`-Liste bestimmt, welche Grid-Kacheln ihr echtes `<img src="/img/<TOKEN>/<frame>.jpg" loading="lazy">` bekommen (Kachel-Reihenfolge = FRAME_IDS der Welt 0: `f-0-profil` als Profil-Avatar/Vorschau, `f-0-s1..s3` als erste drei Kacheln; die übrigen als „kommt gleich"-Shimmer bis `images` sie enthält).
  - `@font-face`/Hintergrund kommen aus `shell.js`; base64 raus.
  - Poll stoppt bei `state ∈ {ready, failed, moderation}` und ruft `showReveal()` bzw. `showError(state)`.
  Return `htmlDoc({ title:'Dein Feed entsteht · social2scale', body })`.

- [ ] **Step 5: `index.js` verdrahten.** `import { resultPage } from './pages/result.js';`. Den bestehenden `/r/`-Platzhalter-Block ersetzen:
```js
const resultMatch = url.pathname.match(/^\/r\/([a-f0-9]{8,128})$/);
if (resultMatch) return resultPage(resultMatch[1]);
```

- [ ] **Step 6: Run — PASS.**
Run: `cd free-content && npx vitest run test/pages.test.js`
Expected: PASS.

- [ ] **Step 7: Rendering-Smoke.** In `render-pages.mjs` einen Fall ergänzen: `/r/<testtoken>` laden, den Poller mit einem gefälschten `/api/status`-Response (via Playwright `route`) durch die States 0→8 fahren, prüfen dass Kacheln füllen + Fortschritt läuft, Screenshot. Manuell prüfen.

- [ ] **Step 8: Commit.**
```bash
git add free-content/src/pages/result.js free-content/src/pages/copy.js free-content/src/index.js free-content/test/pages.test.js free-content/test/render-pages.mjs
git commit -m "feat(free-content): Build-Screen an /r/:token (echtes Status-Polling, füllendes Grid)"
```

---

### Task 4: Result-Seite — Reveal-Zustand (Conversion)

**Files:**
- Modify: `free-content/src/pages/result.js` (Reveal-Markup + `showReveal()`), `free-content/src/pages/copy.js` (Reveal-Copy)
- Design-Quelle: `free-content/design/prototypes/reveal.html`
- Test: `free-content/test/pages.test.js`

**Interfaces:**
- Consumes: die 8 Bilder unter `/img/:token/<frame>.jpg`; die zwei Farbwelten = FRAME_IDS-Präfix `f-0-*` (Welt A) und `f-1-*` (Welt B).
- Produces: `showReveal()` blendet (blur-up) den fertigen Feed ein; Farbwelt-Switcher tauscht zwischen Welt-0- und Welt-1-Bildern; CTAs.

- [ ] **Step 1: Failing test.**
```js
it('Reveal-Markup ist in /r/:token vorhanden (versteckt bis ready) mit beiden CTAs', async () => {
  const html = await (await worker.fetch(new Request('https://start.social2scale.com/r/deadbeefdead'), env, createExecutionContext())).text();
  expect(html).toContain('https://social2scale.com/anfrage/'); // primärer CTA-Ziel
  expect(html).toContain('Vorschau speichern');                // sekundärer CTA
  expect(html).toContain('Beispiel-Vorschau');                 // Vorschau-Hinweis auch im Reveal
  expect(html).toMatch(/f-1-|Welt|Farbwelt/);                  // Farbwelt-Switcher-Anker
});
```
- [ ] **Step 2: Run — FAIL.**
Run: `cd free-content && npx vitest run test/pages.test.js`
Expected: FAIL.

- [ ] **Step 3: Reveal-Copy nach `copy.js`.** `REVEAL = { eyebrow, head, headAccent, sub, offerHead, offerSub, ctaPrimary, ctaSecondary, wmNote }` — ergebnis-/lösungsorientiert: Ergebnis rahmen („Das ist dein Feed") → Problem benennen („monatlich konsistent posten schafft kaum jemand allein") → Paket als Lösung → CTA. Exakte Texte aus `design/prototypes/reveal.html` übernehmen, `offerSub` um den Lösungs-Satz ergänzen.

- [ ] **Step 4: Reveal in `result.js`.** Das Reveal-Markup (aus `reveal.html`) in dieselbe Seite als zunächst verstecktes `<section id="reveal" hidden>` einbauen; `showReveal()` (aus Task 3 aufgerufen) setzt die echten Bilder (`/img/<TOKEN>/f-0-*` bzw. `f-1-*`), entfernt `hidden`, startet die blur-up-Reveal-Animation und den „scroll into it"-Effekt (IntersectionObserver, kein Scroll-Listener). Farbwelt-Switcher: Buttons „Warm/Kühl" (bzw. die zwei generierten Welten) tauschen `img src` zwischen `f-0-*` und `f-1-*`. CTAs: primär `<a href="https://social2scale.com/anfrage/">` (+ `track(env,'cta_call')` clientseitig via `navigator.sendBeacon('/api/track?e=cta_call&t='+TOKEN)`), sekundär „Vorschau speichern" lädt die 4 Bilder der aktiven Welt (per `<a download>` je Bild oder ein Canvas-Compose). Vorschau-Hinweis-Fußnote einbauen.

- [ ] **Step 5: Run — PASS.**
Run: `cd free-content && npx vitest run test/pages.test.js`
Expected: PASS.

- [ ] **Step 6: Rendering-Smoke.** In `render-pages.mjs`: nach dem Build-Durchlauf `state:'ready'` + `images:[alle 8]` liefern, prüfen dass Reveal einblendet, Switcher die Bilder tauscht, CTAs klickbar. Screenshot.

- [ ] **Step 7: Commit.**
```bash
git add free-content/src/pages/result.js free-content/src/pages/copy.js free-content/test/pages.test.js free-content/test/render-pages.mjs
git commit -m "feat(free-content): Reveal (fertiger Feed, Farbwelt-Switcher, ergebnisorientierte CTAs)"
```

---

### Task 5: Fehler-/Edge-States — keine Sackgassen

**Files:**
- Modify: `free-content/src/pages/result.js` (`showError`), `free-content/src/pages/copy.js` (`ERROR_COPY`)
- Test: `free-content/test/pages.test.js`

**Interfaces:**
- Consumes: `state`-Werte aus `buildStatus`: `building` (weiter pollen), `ready` (Reveal), `failed` (Render-Fehler), `moderation` (Thema abgelehnt), `not_found`/`not_confirmed`. (Falls `buildStatus` heute nur `building/ready` liefert und Fehler anders signalisiert: den tatsächlichen Vertrag in `src/generate.js:buildStatus` lesen und `ERROR_COPY`-Schlüssel darauf mappen — NICHT raten.)
- Produces: `showError(reason)` zeigt eine handlungsorientierte Karte statt endlos zu pollen.

- [ ] **Step 1: `buildStatus`-Vertrag verifizieren.** `src/generate.js` lesen: welche `state`-/Fehlerwerte kommen wirklich raus (`moderation`, `render`, Timeout)? Die `ERROR_COPY`-Schlüssel exakt darauf setzen. (Dieser Schritt ist Pflicht — die genauen Strings stehen im Code, nicht in diesem Plan.)

- [ ] **Step 2: Failing test.**
```js
// Poller-Logik als reine Funktion testbar machen: exportiere nextAction(status) aus result.js
import { nextAction } from '../src/pages/result.js';
it('moderation -> Fehler (KEIN Retry), render -> Fehler mit Retry, ready -> reveal, building -> poll', () => {
  expect(nextAction({ state:'moderation' })).toEqual({ kind:'error', reason:'moderation', retry:false });
  expect(nextAction({ state:'failed' })).toEqual({ kind:'error', reason:'failed', retry:true });
  expect(nextAction({ state:'ready', images:[] })).toEqual({ kind:'reveal' });
  expect(nextAction({ state:'building', done:3 })).toEqual({ kind:'poll' });
});
```
(Schlüssel `moderation/failed` an den echten `buildStatus`-Vertrag aus Step 1 anpassen.)
- [ ] **Step 3: Run — FAIL** (`nextAction` existiert nicht).
- [ ] **Step 4: Implementieren.** `nextAction(status)` als reine, exportierte Funktion in `result.js`; der Poller ruft sie. `ERROR_COPY`:
  - `moderation`: „Dieses Thema können wir leider nicht automatisch aufbauen. Lass uns kurz persönlich sprechen." → CTA `/anfrage/`. **Kein „nochmal".**
  - `failed`/`render`: „Da ist beim Bauen was schiefgelaufen — nicht deine Schuld. Probier's gleich nochmal." → Button lädt `/c/<token>` NICHT neu (Token ggf. verbraucht); stattdessen „Nochmal eintragen" → `/`.
  - `not_confirmed`/`not_found`: freundlich zurück zum Formular.
  - Building-Timeout (Poller läuft > `BUILDING_TIMEOUT_MINUTES` aus `constants.js`): „Das dauert länger als sonst — wir haben dir das Ergebnis per Mail geschickt, sobald es fertig ist." (kein Endlos-Spinner).
- [ ] **Step 5: Run — PASS.**
- [ ] **Step 6: Commit.**
```bash
git add free-content/src/pages/result.js free-content/src/pages/copy.js free-content/test/pages.test.js
git commit -m "feat(free-content): handlungsorientierte Fehler-States (moderation vs render vs timeout, keine Sackgasse)"
```

---

### Task 6: Leichtes Funnel-Tracking

**Files:**
- Create: `free-content/src/track.js`, `~/social2scale-clients/_portal/migrate-v13.sql`
- Modify: `free-content/src/index.js` (Tracking-Hooks + `GET /api/track`)
- Test: `free-content/test/track.test.js`

**Interfaces:**
- Consumes: `env.DB` (D1).
- Produces: `track(env, event)` (Insert-or-count in `funnel_events`), `GET /api/track?e=<event>&t=<token>` (Beacon-Endpunkt, no-CORS, immer 204).

- [ ] **Step 1: Migration schreiben** (`migrate-v13.sql`, additiv/idempotent):
```sql
CREATE TABLE IF NOT EXISTS funnel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  token TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_funnel_event ON funnel_events(event);
```
- [ ] **Step 2: Failing test.**
```js
// free-content/test/track.test.js
import { track } from '../src/track.js';
import { env } from 'cloudflare:test';
it('track schreibt ein Event', async () => {
  await env.DB.exec("CREATE TABLE IF NOT EXISTS funnel_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, token TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))");
  await track(env, { event: 'entered', token: 'abc' });
  const row = await env.DB.prepare('SELECT COUNT(*) c FROM funnel_events WHERE event=?').bind('entered').first();
  expect(row.c).toBe(1);
});
```
- [ ] **Step 3: Run — FAIL.**
- [ ] **Step 4: `track.js` implementieren** (fail-open: ein Tracking-Fehler darf den Funnel NIE bremsen — `try/catch` + `console.error`, kein Throw). `GET /api/track` in `index.js` (validiert `e` gegen Allowlist `['entered','confirmed','ready','cta_call','cta_save']`, `t` gegen Token-Zeichensatz, `ctx.waitUntil(track(...))`, immer `204`). Hooks: in `handleSubmit` bei `action==='created'` → `track(env,{event:'entered',token:lead.token})`; in `handleConfirm` nach `confirmLead.ok` → `track(env,{event:'confirmed',token})`.
- [ ] **Step 5: Run — PASS.**
- [ ] **Step 6: Commit.**
```bash
git add free-content/src/track.js free-content/src/index.js free-content/test/track.test.js
git commit -m "feat(free-content): leichtes Funnel-Tracking (entered/confirmed/ready/cta)"
```

---

## Nach allen Tasks

- **Volle Test-Suite grün:** `cd free-content && npx vitest run` (die 206 bestehenden + neuen).
- **Live-Gate (Sebi, separat, NICHT Teil der Umsetzung):** `migrate-v13.sql --remote` gegen `s2s-crm`; Custom Domain `start.social2scale.com`; `wrangler deploy`; `bash test/gate-plan2.sh`; ein echter End-to-End-Lauf (Form → Mail → Klick → Build → Reveal); Phils Build-Screen-Abnahme.
- **Danach Plan 4:** Einstiegs-CTA + Social-Link + OG-Card auf `social2scale.com` (eigener Plan, Main-Site-Repo).

## Global-Constraints-Erinnerung für Reviewer

Copy-Regeln & exakte Werte, die jeder Task erfüllen muss, stehen oben unter **Global Constraints** — insbesondere: **keine base64-Assets**, gehostete URLs exakt wie gelistet, Turnstile-Sitekey `0x4AAAAAAD5FwCxWtZhzGlpX`, Reveal-CTA-Ziel `https://social2scale.com/anfrage/`, keine Sackgassen, Dateien <400 Zeilen, kein stilles Fehler-Schlucken.
