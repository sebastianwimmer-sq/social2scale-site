# Freebie „Sie erkennt sich" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die generierte Feed-Vorschau personalisieren: echtes IG-Profilbild, wählbare Markenfarbe, reparierte Stimmungs-Farbwelten, IG-Detailtreue im Profil-Frame.

**Architecture:** Server-seitiger Avatar-Fetch (unavatar.io) im Queue-Consumer, als data-URL in die gerenderten Frames eingebettet (KEIN R2-Objekt — `buildStatus` zählt `.jpg`-Keys im Prefix, ein `avatar.jpg` würde den Fortschrittsbalken verfälschen; und die Reveal-/Share-Flächen zeigen ohnehin die gerenderten Frames, nie das Rohbild). Markenfarbe = neuer optionaler Wizard-Step, füllt das existierende, bisher immer leere Payload-Feld `farbe`; `derivePalettes()` kann sie bereits verarbeiten.

**Tech Stack:** Cloudflare Worker (kein Node-API!), Vitest (`wrangler.test.toml`), @cloudflare/puppeteer (Browser Rendering), D1, R2.

## Global Constraints

- Arbeitsordner: `~/social2scale-site/free-content/` · Branch `feat/free-content-funnel`. NIE in `~/s2s-extern`, `~/social2scale-clients`, `~/s2s-kunden` schreiben (Ordner-Besitz anderer Stränge).
- Tests laufen mit `npx vitest run` im Ordner `free-content/` (nutzt `wrangler.test.toml`). Vor Abschluss: GESAMTE Suite grün (Stand: 261 Tests).
- Worker-Runtime: kein `Buffer`, kein `fs` — Base64 via `btoa`, Timeout via `AbortController`.
- Immutabilität: nie Objekte in-place ändern, immer `{ ...alt, neu }`.
- Alle sichtbaren Texte deutsch, Ton wie Bestand („dein Feed", kein Sie).
- User-Input nie roh in HTML (`esc()` aus frames.js) und nie roh in URLs (`encodeURIComponent`).
- Commits: `<type>: <beschreibung>` (feat/fix/test/docs), KEINE Attribution-Zeile, KEIN `--no-verify`.

---

### Task 1: Stimmungs-Mapping reparieren (3 von 4 Chips sind heute Attrappen)

Die Formular-Chips senden `ruhig|klar|warm|mutig` (`form.js:223-226`), aber `NACH_STIMMUNG` (`palette.js:40-48`) kennt nur `ruhig, natuerlich, hell, freundlich, kraftvoll, dunkel, edel` → `klar`, `warm`, `mutig` fallen still auf `STANDARD ['creme','nacht']`. Die Stimmungswahl bewirkt für 3 von 4 Chips nichts.

**Files:**
- Modify: `free-content/src/palette.js:40-48`
- Test: `free-content/test/palette.test.js`

**Interfaces:**
- Produces: unverändert `derivePalettes(stimmung, farbe)` — nur das Mapping wird vollständig.

- [ ] **Step 1: Failing Test schreiben** — in `test/palette.test.js` ergänzen:

```js
describe('Formular-Stimmungen (die 4 echten Chips)', () => {
  // form.js sendet exakt diese Werte — jede muss ein EIGENES, bewusstes Paar
  // treffen, nicht den Standard-Fallback (sonst ist der Chip eine Attrappe).
  it('ruhig, klar, warm, mutig treffen vier verschiedene Leit-Welten', () => {
    const leit = ['ruhig', 'klar', 'warm', 'mutig'].map(
      (s) => derivePalettes(s, '')[0].id
    );
    expect(new Set(leit).size).toBe(4);
  });
  it('klar fuehrt hell-professionell (papier), mutig fuehrt dunkel (nacht)', () => {
    expect(derivePalettes('klar', '')[0].id).toBe('papier');
    expect(derivePalettes('mutig', '')[0].id).toBe('nacht');
  });
});
```

- [ ] **Step 2: Test laufen lassen — muss scheitern**

Run: `cd ~/social2scale-site/free-content && npx vitest run test/palette.test.js`
Expected: FAIL — `klar/warm/mutig` liefern alle `creme` (STANDARD), Set-Größe 2.

- [ ] **Step 3: Mapping ergänzen** — in `palette.js` `NACH_STIMMUNG` erweitern (bestehende Schlüssel NICHT löschen, Kompatibilität für alte Leads):

```js
const NACH_STIMMUNG = {
  // Die 4 Werte, die das Formular WIRKLICH sendet (form.js data-mood):
  ruhig:      ['salbei', 'creme'],   // „Ruhig & natürlich" — Salbei führt
  klar:       ['papier', 'nacht'],   // „Klar & professionell"
  warm:       ['creme', 'salbei'],   // „Warm & nahbar" — Terracotta-Akzent führt
  mutig:      ['nacht', 'creme'],    // „Kraftvoll & mutig"
  // Ältere/synonyme Werte bleiben gültig:
  natuerlich: ['salbei', 'creme'],
  hell:       ['papier', 'creme'],
  freundlich: ['papier', 'salbei'],
  kraftvoll:  ['nacht', 'creme'],
  dunkel:     ['nacht', 'papier'],
  edel:       ['nacht', 'salbei'],
};
```

Hinweis: `ruhig` wechselt von `['creme','salbei']` auf `['salbei','creme']` — gleicher Farbraum, ehrlichere Leit-Welt für „natürlich". Falls ein Bestandstest das alte Paar festnagelt, den Bestandstest an das neue, dokumentierte Mapping anpassen (das alte war Teil des Bugs).

- [ ] **Step 4: Tests laufen lassen — grün**

Run: `npx vitest run test/palette.test.js`
Expected: PASS (alle, auch Bestand — ggf. gem. Step 3 Hinweis angepasst).

- [ ] **Step 5: Commit**

```bash
git add free-content/src/palette.js free-content/test/palette.test.js
git commit -m "fix(free-content): Stimmungs-Chips klar/warm/mutig treffen eigene Farbwelten statt Standard-Fallback"
```

---

### Task 2: Avatar-Modul — öffentliches IG-Profilbild als data-URL

**Files:**
- Create: `free-content/src/avatar.js`
- Modify: `free-content/src/constants.js` (3 Konstanten anhängen)
- Test: `free-content/test/avatar.test.js` (neu)

**Interfaces:**
- Produces: `holeAvatar(handle, fetchImpl = fetch): Promise<string|null>` — data-URL (`data:image/...;base64,...`) oder `null`. WIRFT NIE.

- [ ] **Step 1: Konstanten anhängen** — in `constants.js`:

```js
/** Avatar-Fetch (unavatar.io): Gates gegen „Ressource da, Auslieferung leer". */
export const AVATAR_TIMEOUT_MS = 4000;
export const AVATAR_MIN_BYTES = 2048;      // Platzhalter/kaputte Winzbilder raus
export const AVATAR_MAX_BYTES = 2_000_000; // data-URL-Bloat-Grenze fuer die Render-Seite
```

- [ ] **Step 2: Failing Tests schreiben** — `test/avatar.test.js` (Muster für Mocks: `test/copy.test.js` nutzt injizierte Fetches; hier ist `fetchImpl` direkt Parameter):

```js
import { describe, it, expect } from 'vitest';
import { holeAvatar } from '../src/avatar.js';

const PIXEL = new Uint8Array(3000).fill(7); // > AVATAR_MIN_BYTES

function fakeFetch({ status = 200, type = 'image/jpeg', body = PIXEL } = {}) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? type : null) },
    arrayBuffer: async () => body.buffer,
  });
}

describe('holeAvatar', () => {
  it('liefert eine data-URL bei gutem Bild', async () => {
    const url = await holeAvatar('yogamitanna', fakeFetch());
    expect(url).toMatch(/^data:image\/jpeg;base64,/);
  });
  it('null bei 404 (unavatar fallback=false)', async () => {
    expect(await holeAvatar('x', fakeFetch({ status: 404 }))).toBeNull();
  });
  it('null bei falschem Content-Type (HTML-Fehlerseite)', async () => {
    expect(await holeAvatar('x', fakeFetch({ type: 'text/html' }))).toBeNull();
  });
  it('null bei Winzbild unter der Mindestgroesse', async () => {
    expect(await holeAvatar('x', fakeFetch({ body: new Uint8Array(100) }))).toBeNull();
  });
  it('null bei leerem Handle, ohne Fetch-Aufruf', async () => {
    let aufgerufen = false;
    const spion = async () => { aufgerufen = true; };
    expect(await holeAvatar('', spion)).toBeNull();
    expect(aufgerufen).toBe(false);
  });
  it('null wenn der Fetch wirft (Timeout/Netz) — wirft selbst NIE', async () => {
    const kaputt = async () => { throw new Error('network'); };
    expect(await holeAvatar('x', kaputt)).toBeNull();
  });
});
```

- [ ] **Step 3: Laufen lassen — muss scheitern**

Run: `npx vitest run test/avatar.test.js`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 4: `src/avatar.js` schreiben**

```js
/**
 * Holt das oeffentliche Instagram-Profilbild ueber unavatar.io — server-seitig,
 * die Besucherin laedt NIE von Dritt-Origins. Ergebnis ist eine data-URL, die
 * direkt in die Render-Seite (frames.js) eingebettet wird: die Browser-
 * Rendering-Seite kommt per setContent ohne Origin und koennte relative/externe
 * Quellen nicht zuverlaessig laden.
 *
 * WIRFT NIE. Jeder Ausfall = null = Initial-Fallback im Frame. Gates gegen
 * „Ressource da, Auslieferung leer": Status, Content-Type, Mindest-/Maximalgroesse.
 */

import { AVATAR_TIMEOUT_MS, AVATAR_MIN_BYTES, AVATAR_MAX_BYTES } from './constants.js';

// fallback=false: unavatar liefert 404 statt eines generischen Platzhalters —
// wir wollen ihr echtes Bild oder ehrlich keins, nie ein fremdes Standardgesicht.
const quelle = (handle) =>
  `https://unavatar.io/instagram/${encodeURIComponent(handle)}?fallback=false`;

function base64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000; // String.fromCharCode-Argumentgrenze
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/**
 * @param {string} handle bereits validiert/normalisiert (validate.js, ohne @)
 * @param {typeof fetch} [fetchImpl] injizierbar fuer Tests
 * @returns {Promise<string|null>} data-URL oder null
 */
export async function holeAvatar(handle, fetchImpl = fetch) {
  const h = String(handle ?? '').trim();
  if (!h) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AVATAR_TIMEOUT_MS);
  try {
    const res = await fetchImpl(quelle(h), { signal: ctrl.signal });
    if (!res.ok) return null;
    const typ = String(res.headers.get('content-type') || '').split(';')[0].trim();
    if (!typ.startsWith('image/')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < AVATAR_MIN_BYTES || buf.byteLength > AVATAR_MAX_BYTES) return null;
    return `data:${typ};base64,${base64(buf)}`;
  } catch (err) {
    console.error('[avatar] Profilbild nicht ladbar (Fallback: Initial):', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 5: Tests grün**

Run: `npx vitest run test/avatar.test.js`
Expected: PASS (6 Tests).

- [ ] **Step 6: Commit**

```bash
git add free-content/src/avatar.js free-content/src/constants.js free-content/test/avatar.test.js
git commit -m "feat(free-content): Avatar-Modul — oeffentliches IG-Profilbild als data-URL, mit Gates und Timeout"
```

---

### Task 3: Frames — echtes Profilbild mit Story-Ring, Share-Card-Avatar, IG-Feinschliff

**Files:**
- Modify: `free-content/src/templates/frames.js` (`profil()` ~Zeile 152-187, `shareFrame()` ~Zeile 195-233)
- Modify: `free-content/src/templates/css.js` (Avatar-Block ~Zeile 143-148, `.grid3` ~Zeile 168, Share-Top-Bereich)
- Test: `free-content/test/frames.test.js`

**Interfaces:**
- Consumes: `clean.avatarUrl` (string data-URL | undefined) — gesetzt in Task 4. Frames müssen OHNE das Feld exakt wie heute aussehen (Fallback Initial).
- Produces: keine neuen Exporte; `buildPage(clean, copy, palettes, shareUrl, onlyIds)` unverändert.

- [ ] **Step 1: Failing Tests** — in `test/frames.test.js` ergänzen (bestehende Fixtures `clean`/`copy`/`palettes` der Datei wiederverwenden):

```js
describe('Avatar im Profil-Frame', () => {
  it('rendert das echte Profilbild mit Story-Ring, wenn avatarUrl da ist', () => {
    const html = buildPage({ ...clean, avatarUrl: 'data:image/jpeg;base64,QUJD' }, copy, palettes, 'https://x.de');
    expect(html).toContain('class="pfp-img"');
    expect(html).toContain('data:image/jpeg;base64,QUJD');
    expect(html).toContain('pfp-ring');
  });
  it('faellt ohne avatarUrl auf das Initial zurueck — kein img, kein leerer src', () => {
    const html = buildPage(clean, copy, palettes, 'https://x.de');
    expect(html).not.toContain('pfp-img');
    expect(html).toContain('class="avatar"');
  });
  it('Share-Card zeigt das Foto klein neben dem Handle', () => {
    const html = buildPage({ ...clean, avatarUrl: 'data:image/jpeg;base64,QUJD' }, copy, palettes, 'https://x.de');
    expect(html).toContain('share-pfp');
  });
});
```

- [ ] **Step 2: Laufen lassen — FAIL** (`npx vitest run test/frames.test.js`)

- [ ] **Step 3: `frames.js` umbauen** — in `profil()` den Avatar ersetzen:

```js
  const initial = esc((clean.name || clean.handle || '?').trim().charAt(0).toUpperCase());
  // Echtes Profilbild (data-URL, server-seitig geholt) mit Story-Ring — das
  // staerkste „das bin ja ich"-Signal. Ring in der Akzentfarbe, NICHT der
  // IG-Markengradient (Look-alike ja, Marken-Kopie nein). Ohne Bild: Initial.
  const avatarInhalt = clean.avatarUrl
    ? `<img class="pfp-img" src="${esc(clean.avatarUrl)}" alt="">`
    : initial;
```

und im Markup `<div class="avatar">${initial}</div>` ersetzen durch:

```html
<div class="pfp-ring"><div class="avatar">${avatarInhalt}</div></div>
```

In `shareFrame(clean, copy, shareUrl)` innerhalb `share-top` vor `.share-who`:

```js
  const sharePfp = clean.avatarUrl
    ? `<img class="share-pfp" src="${esc(clean.avatarUrl)}" alt="">`
    : '';
```

```html
<div class="share-top">
  <div class="share-id">${sharePfp}<div class="share-who"> … (Bestand unveraendert) … </div></div>
  <img class="share-mark" …>
</div>
```

- [ ] **Step 4: `css.js` ergänzen/ändern**

Avatar-Block (`.avatar` behält 104px; `flex:none` wandert an den Ring):

```css
  .pfp-ring {
    flex: none; padding: 4px; border-radius: 50%;
    background: conic-gradient(from 210deg,
      var(--accent),
      color-mix(in oklab, var(--accent) 30%, var(--paper)) 55%,
      var(--accent));
  }
  .avatar {
    width: 104px; height: 104px; border-radius: 50%;
    border: 4px solid var(--paper);
    background: var(--accent); color: var(--paper);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--ff-display); font-size: 42px; font-weight: 700;
    overflow: hidden;
  }
  .pfp-img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

IG-Detailtreue: `.grid3 { … gap: 4px … }` → `gap: 2px;` (IG-Grid ist nahezu randlos).

Share-Card:

```css
  .share-id { display: flex; align-items: center; gap: 16px; }
  .share-pfp { width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
    border: 2px solid rgba(255,255,255,.28); }
```

- [ ] **Step 5: Tests grün + Sichtprüfung der Frames lokal**

Run: `npx vitest run test/frames.test.js && node test/render-pages.mjs || true`
(`render-pages.mjs`/`vorschau.mjs` sind die vorhandenen Lokal-Vorschau-Helfer — wenn `render-pages.mjs` andere Argumente braucht, Kopf der Datei lesen.) Frames bei beiden Welten ANSEHEN (Screenshot öffnen): Ring sichtbar, Initial-Fallback intakt, Share-Card-Foto sitzt neben dem Handle, nichts verrutscht. Grüner Test allein beweist keine Optik.

- [ ] **Step 6: Commit**

```bash
git add free-content/src/templates/frames.js free-content/src/templates/css.js free-content/test/frames.test.js
git commit -m "feat(free-content): echtes Profilbild mit Story-Ring im Profil-Frame + Share-Card, IG-Grid-Feinschliff"
```

---

### Task 4: generate.js — Avatar parallel zur Copy holen und einbetten

**Files:**
- Modify: `free-content/src/generate.js` (Import + Zeilen ~154-193)
- Test: `free-content/test/generate.test.js`

**Interfaces:**
- Consumes: `holeAvatar(handle)` aus Task 2; `renderAll(env, token, clean, copy, palettes)` Bestand.
- Produces: `renderAll` erhält `clean` MIT `avatarUrl` (oder ohne das Feld bei Ausfall).

- [ ] **Step 1: Failing Test** — in `test/generate.test.js` ergänzen. Die Datei mockt Module bereits via `vi.mock` (Bestand ansehen und Muster übernehmen); zusätzlich `vi.mock('../src/avatar.js', …)`:

```js
vi.mock('../src/avatar.js', () => ({
  holeAvatar: vi.fn(async () => 'data:image/jpeg;base64,QUJD'),
}));

it('reicht die Avatar-data-URL an den Render weiter', async () => {
  // Bestand-Helfer der Datei nutzen (bestaetigter Lead, Mocks auf Erfolg)
  await generateFor(env, token);
  const { renderAll } = await import('../src/render.js');
  const cleanArg = vi.mocked(renderAll).mock.calls[0][2];
  expect(cleanArg.avatarUrl).toBe('data:image/jpeg;base64,QUJD');
});

it('rendert ohne avatarUrl, wenn der Avatar-Fetch null liefert', async () => {
  const { holeAvatar } = await import('../src/avatar.js');
  vi.mocked(holeAvatar).mockResolvedValueOnce(null);
  await generateFor(env, token);
  const { renderAll } = await import('../src/render.js');
  const cleanArg = vi.mocked(renderAll).mock.calls.at(-1)[2];
  expect(cleanArg.avatarUrl).toBeUndefined();
});
```

- [ ] **Step 2: Laufen lassen — FAIL** (`npx vitest run test/generate.test.js`)

- [ ] **Step 3: Implementieren** — in `generate.js`:

Import ergänzen: `import { holeAvatar } from './avatar.js';`

Im try-Block: den Fetch VOR der Copy STARTEN (läuft parallel zur ~15s-Claude-Copy, kostet also keine Wartezeit) und nach den Paletten EINSAMMELN:

```js
    await setzeSchritt(env.DB, token, 'building', SCHRITTE.texte);
    // Parallel zur Copy (holeAvatar wirft nie): ihr oeffentliches Profilbild —
    // bis die Texte stehen, ist es laengst da. Kostet keine Wartezeit.
    const avatarVersprechen = holeAvatar(clean.handle);
    const copy = await generateCopy(env, clean);   // wirft nie, faellt zurueck
```

nach `const palettes = derivePalettes(…)`:

```js
    const avatarUrl = await avatarVersprechen;
    const zumRendern = avatarUrl ? { ...clean, avatarUrl } : clean;
```

und im Render-Aufruf `clean` → `zumRendern`:

```js
    await mitRetry(() => renderAll(env, token, zumRendern, copy, palettes));
```

- [ ] **Step 4: Tests grün** (`npx vitest run test/generate.test.js`)

- [ ] **Step 5: Commit**

```bash
git add free-content/src/generate.js free-content/test/generate.test.js
git commit -m "feat(free-content): Profilbild parallel zur Copy holen und in den Render einbetten"
```

---

### Task 5: Wizard — optionaler Markenfarbe-Step (das brachliegende `farbe`-Feld verdrahten)

**Files:**
- Modify: `free-content/src/constants.js` (FARB_CHIPS anhängen)
- Modify: `free-content/src/pages/form.js` (neuer Step 7, Renumbering 7→8, 8→9, TOTAL, Payload, Live-Vorschau-Hook)
- Test: `free-content/test/palette.test.js` (Kontrast-Gate der Chips), `free-content/test/pages.test.js` (Formular enthält den Step; Payload-Zeile)

**Interfaces:**
- Consumes: `derivePalettes(stimmung, farbe)` Bestand — akzeptiert `#rrggbb`, Kontrast-Gate pro Welt existiert.
- Produces: `FARB_CHIPS: {hex: string, name: string}[]` in constants.js. Payload-Feld `farbe` (Vertrag form.js→validate.js: Name NICHT ändern, Wert '' oder `#rrggbb`).

- [ ] **Step 1: FARB_CHIPS + Kontrast-Test (failing)** — in `constants.js`:

```js
/**
 * Kuratierte Markenfarben fuer den Wizard-Step. JEDE muss auf ALLEN Welten-
 * Papieren >= ACCENT_MIN_CONTRAST tragen (Test erzwingt das) — eine Wahl, die
 * ihr Bild zerstoeren koennte, bieten wir gar nicht erst an.
 */
export const FARB_CHIPS = [
  { hex: '#C2410C', name: 'Terracotta' },
  { hex: '#B45309', name: 'Ocker' },
  { hex: '#2F6F5E', name: 'Tannengrün' },
  { hex: '#2563EB', name: 'Ozeanblau' },
  { hex: '#7C3AED', name: 'Violett' },
  { hex: '#BE185D', name: 'Beere' },
];
```

In `test/palette.test.js`:

```js
import { FARB_CHIPS } from '../src/constants.js';

describe('FARB_CHIPS', () => {
  // Alle Stimmungen abklappern = alle erreichbaren Papiere. Wenn der Akzent
  // ueberall uebernommen wird, hat jeder Chip das Kontrast-Gate ueberall bestanden.
  const stimmungen = ['ruhig', 'klar', 'warm', 'mutig', 'hell', 'dunkel', 'edel', 'freundlich', 'natuerlich', 'kraftvoll'];
  for (const { hex, name } of FARB_CHIPS) {
    it(`${name} traegt auf jeder Welt`, () => {
      for (const s of stimmungen) {
        for (const p of derivePalettes(s, hex)) {
          expect(p.accent, `${name} auf ${p.id}`).toBe(hex);
        }
      }
    });
  }
});
```

Run: `npx vitest run test/palette.test.js` → FAIL (kein Export FARB_CHIPS) → Export anlegen → PASS. Fällt ein Chip durchs Kontrast-Gate, den Hex nachdunkeln/aufhellen bis er trägt — der Test ist die Wahrheit, nicht die Liste oben.

- [ ] **Step 2: Failing Page-Test** — in `test/pages.test.js` (Muster der Datei für den Seitenabruf übernehmen):

```js
it('Formular enthaelt den optionalen Markenfarbe-Step mit Chips und Skip', () => {
  // formPage(...) wie in den Bestandstests der Datei aufrufen
  expect(html).toContain('id="farbe"');
  expect(html).toContain('Terracotta');
  expect(html).toContain('data-hex="#C2410C"');
  expect(html).toMatch(/data-step="8"[^>]*>/); // Mail-Step ist nachgerueckt
});
```

Run → FAIL.

- [ ] **Step 3: form.js umbauen** (Reihenfolge wichtig, alles in EINEM Durchgang):

1. Import oben ergänzen: `import { FARB_CHIPS } from '../constants.js';`
2. **Neuer Step** zwischen Stimmung (data-step="6") und Mail einfügen:

```js
      <div class="q" data-step="7">
        <span class="eyebrow">Deine Markenfarbe</span>
        <h2>Hat deine Marke eine <em>Farbe</em>?</h2>
        <div class="chips farb-chips" id="farbe" role="group" aria-label="Markenfarbe">
          ${FARB_CHIPS.map((f) => `<button class="chip farb" data-hex="${f.hex}" aria-pressed="false"><span><i class="sw" style="background:${f.hex}"></i>${f.name}</span></button>`).join('')}
          <button class="chip farb" id="farb-eigene" aria-pressed="false"><span><i class="sw sw-multi"></i>Eigene…</span></button>
        </div>
        <input type="color" id="f-farbe-custom" value="#2F6F5E" aria-label="Eigene Markenfarbe" style="position:absolute;width:0;height:0;opacity:0;pointer-events:none">
        <div class="react" id="r-farbe"></div>
        <div class="foot"><button class="next" data-go="8"><span class="lab">Weiter</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6"/></svg></span></button><button class="back" data-go="6">Zurück</button><p class="hint" style="margin-top:.5rem">Optional — ohne Auswahl wählen wir eine, die zu deiner Stimmung passt.</p></div>
      </div>
```

3. **Renumbering:** Mail-Step `data-step="7"` → `"8"`, sein `back data-go="6"` → `"7"`. Done-Step `data-step="8"` → `"9"`, dort „E-Mail ändern" `data-go="7"` → `"8"`. Im Skript `show(8)` (Submit-Erfolg, form.js:363) → `show(9)`. `const TOTAL=7` → `const TOTAL=8`. Danach GEGENPRÜFEN: `grep -n 'data-step=\|data-go=\|TOTAL\|show(' src/pages/form.js` — jede Nummer muss auf einen existierenden Step zeigen.
4. **Chip-CSS** im Style-Block der Datei ergänzen:

```css
  .farb-chips{display:flex;flex-wrap:wrap;gap:10px}
  .farb .sw{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:9px;vertical-align:-2px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
  .sw-multi{background:conic-gradient(#C2410C,#2563EB,#2F6F5E,#BE185D,#C2410C)}
```

5. **Interaktion** im PAGE_SCRIPT (nach dem Stimmung-Chip-Block einfügen; abwählbar, Live-Vorschau färbt via `--mood` wie die Stimmung es tut):

```js
  let farbeWahl='';
  const farbeSetzen=(hex,msg)=>{farbeWahl=hex;if(hex){document.documentElement.style.setProperty('--mood',hex);react('#r-farbe',msg||'Deine Farbe — dein Feed trägt sie als Akzent.');}else clr('#r-farbe');};
  document.querySelectorAll('#farbe .chip').forEach(c=>c.addEventListener('click',()=>{
    if(c.id==='farb-eigene'){document.querySelectorAll('#farbe .chip').forEach(x=>x.setAttribute('aria-pressed','false'));c.setAttribute('aria-pressed','true');$('#f-farbe-custom').click();return;}
    const war=c.getAttribute('aria-pressed')==='true';
    document.querySelectorAll('#farbe .chip').forEach(x=>x.setAttribute('aria-pressed','false'));
    if(war){farbeSetzen('');return;}
    c.setAttribute('aria-pressed','true');farbeSetzen(c.dataset.hex);
  }));
  $('#f-farbe-custom').addEventListener('input',e=>{
    const eig=$('#farb-eigene');eig.querySelector('.sw').style.background=e.target.value;farbeSetzen(e.target.value);
  });
```

6. **Payload:** `farbe:'',` (form.js:352) → `farbe:farbeWahl,`

- [ ] **Step 4: Tests grün + volle Suite**

Run: `npx vitest run`
Expected: alles PASS. Schlagen Bestandstests an, die Stepzahlen/`TOTAL` festnageln: an die neue 8er-Zählung anpassen (bewusste Änderung).

- [ ] **Step 5: Wizard im Browser durchklicken (lokal)** — `npx wrangler dev` im `free-content/`-Ordner, mit Playwright oder von Hand: alle 9 Screens vor/zurück, Farbchip an/ab/eigene, Live-Vorschau färbt um, „In 60 Sekunden"-Hint noch vertretbar (8 Steps). Viewports 390 UND 1440 ansehen. Danach `wrangler dev` beenden.

- [ ] **Step 6: Commit**

```bash
git add free-content/src/constants.js free-content/src/pages/form.js free-content/test/palette.test.js free-content/test/pages.test.js
git commit -m "feat(free-content): optionaler Markenfarbe-Step — das leere farbe-Feld ist verdrahtet, Chips kontrastgeprueft"
```

---

### Task 6: Datenschutz-Handoff (extern besitzt die Website — nur Übergabe, nichts anfassen)

**Files:**
- Create: `free-content/HANDOFF-avatar-datenschutz-04-08.md`

**Interfaces:** keine (reine Doku).

- [ ] **Step 1: Handoff-Datei schreiben**

```markdown
# HANDOFF an extern (Website-Strang): Datenschutz-Ergänzung Avatar-Fetch

Datum: 2026-08-04 · Von: Funnel-Strang (`feat/free-content-funnel`)

Der Free-Content-Funnel holt seit heute server-seitig das ÖFFENTLICHE
Instagram-Profilbild der Interessentin (Quelle: unavatar.io, abgeleitet aus dem
von ihr selbst angegebenen Handle) und bettet es ausschließlich in ihre eigene,
tokengeschützte Vorschau ein. Kein R2-Objekt, keine Weitergabe, Lebensdauer =
die der gerenderten Vorschau-Bilder.

## Bitte in die Datenschutzerklärung (social2scale.com/datenschutz/) aufnehmen

Vorschlag (Abschnitt Gratis-Vorschau):

> Zur Personalisierung deiner Gratis-Vorschau rufen wir einmalig dein
> öffentliches Instagram-Profilbild über den von dir angegebenen Nutzernamen ab
> (Dienstleister: unavatar.io). Das Bild wird ausschließlich in deine eigene,
> nur über deinen persönlichen Link erreichbare Vorschau eingebettet und mit
> ihr gelöscht. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Erstellung der von
> dir angeforderten Vorschau).

## 🔴 Sebi liest den Satz fachlich gegen, BEVOR extern ihn einbaut.

## Payload-Vertrag (Info, keine Aktion)

`farbe` wird jetzt vom Formular befüllt ('' oder '#rrggbb'). Feldname
unverändert — validate.js/leads.js kannten das Feld schon. Der Vertrag in
`~/social2scale-clients/docs/WER-MACHT-WAS.md` bleibt gültig; der Kunden-Strang
kann den Eintrag bei Gelegenheit um „farbe: jetzt befüllt" ergänzen (sein Ordner).
```

- [ ] **Step 2: Commit**

```bash
git add free-content/HANDOFF-avatar-datenschutz-04-08.md
git commit -m "docs(free-content): Handoff Datenschutz-Satz Avatar-Fetch + Payload-Vertragsnotiz"
```

---

### Task 7: Volle Suite, Deploy, Live-Beweis mit Testlead, Aufräumen

**Files:** keine neuen — Verifikation.

- [ ] **Step 1: Gesamte Suite** — `cd ~/social2scale-site/free-content && npx vitest run` → ALLES grün (Erwartung: 261 Bestand + ~15 neu).

- [ ] **Step 2: Deploy** — `npx wrangler deploy` (im `free-content/`-Ordner; der Worker hängt nicht am Git-Branch). Danach **~60s warten** (Deploy-Rennen: die Kante liefert kurz die alte Version).

- [ ] **Step 3: Live-Beweis** — EINEN Testlead durchspielen:
  1. Funnel-URL im Browser öffnen (aus `wrangler.toml`/`PUBLIC_ORIGIN`), Wizard komplett ausfüllen — Handle: ein echtes, öffentliches IG-Profil (z. B. das s2s-eigene), Markenfarbe wählen, Test-Mailadresse.
  2. Bestätigung: Token aus D1 lesen (`npx wrangler d1 execute … --remote --command "SELECT token FROM free_leads WHERE email='<testmail>'"`), `GET /c/<token>` aufrufen.
  3. `status='ready'` abwarten (Poll auf `/api/status`), dann Reveal ÖFFNEN und ANSEHEN (390 + 1440): echtes Profilbild mit Ring? Gewählte Farbe als Akzent in beiden Welten? Share-Card mit Foto? Stimmungs-Welten unterscheiden sich?
  4. Negativtest: zweiter Testlead mit erfundenem Handle (`kein-echtes-profil-xyz123`) → Feed baut trotzdem, Avatar = Initial (kein kaputtes Bild, kein Hänger).
- [ ] **Step 4: Testdaten RESTLOS entfernen** — beide Testleads: `DELETE FROM free_leads WHERE email IN (…)`; zugehörige `submissions`/`clients`/`activity`/`events`-Zeilen (mirrorToCrm legt sie an!) löschen; R2-Prefixe `free/<token>/` leeren. Danach SELECT-Gegenprobe: 0 Zeilen.
- [ ] **Step 5: Push + Abschlussmeldung** — `git push origin feat/free-content-funnel`. Status 🟢/🟡/🔴 an Sebi: was live ist, was er gegenlesen muss (Datenschutz-Satz, Task 6).
