# Free-Content-Funnel · Plan 2 — Generierung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nach dem Bestätigungsklick entstehen 8 fertige, gebrandete Bilder in R2 — Profil-Vorschau + 3-Slide-Karussell in zwei aus ihren Antworten abgeleiteten Farbwelten, mit eingebackenem Wasserzeichen.

**Architecture:** Die Generierung hängt an `GET /c/:token` (Plan 1, Task 10) via `ctx.waitUntil` und läuft genau **einmal** pro Lead (`generated_at` ist der Riegel). Ablauf: Moderation → Claude-Texte (mit Fallback) → Palette ableiten → **ein** Browser-Durchlauf für alle 8 Frames → R2. Der Fortschritt wird in D1 mitgeschrieben, damit der Build-Screen (Plan 3) echte Schritte anzeigen kann statt eines Spinners.

**Tech Stack:** Cloudflare Workers · Browser Rendering (`@cloudflare/puppeteer`) · R2 · D1 · Claude (Anthropic Messages API) · Vitest + `@cloudflare/vitest-pool-workers`

**Ausgangslage — anders als bei Plan 1:** Das Design **existiert bereits als lauffähiger Code**. Nichts davon wird neu erfunden:
- `~/social2scale-site/free-content/design/looks.html` rendert Look B nachweislich in 1080×1350
- `~/social2scale-site/free-content/design/ENTSCHEIDUNG.md` — was gewählt wurde und warum
- `~/social2scale-site/free-content/design/README.md` — die Fallstricke, die schon Blut gekostet haben
- `~/social2scale-clients/_portal/_worker.js:1919-1949` — der erprobte HWG-Compliance-Prompt

**Specs:** `~/social2scale-clients/docs/free-content-funnel-spec.md` §5, §5a, §9, Bauphase 4. Bei Widersprüchen gewinnt die Spec.

## Global Constraints

- **Sprache:** Alle nutzersichtbaren Texte auf **Deutsch**. Code/Kommentare konsistent pro Datei.
- **Dateigröße:** Jede Datei < 400 Zeilen, eine Verantwortung pro Datei.
- **Immutability:** Niemals mutieren — immer neue Objekte (`{...alt, feld: neu}`).
- **Keine Secrets im Code.** `ANTHROPIC_API_KEY` via `wrangler secret put`.
- **Fehler nie still schlucken.** Jeder `catch` loggt mindestens `console.error`.
- **Keine Magic Numbers** — Schwellen nach `src/constants.js`.
- **D1 ist PRODUKTIV** (echte Kundinnendaten): Migrationen additiv + idempotent, niemals `DROP`/`ALTER`. **Niemals `wrangler d1 execute --remote`** — lokale Test-DB only.
- **Coverage:** ≥ 80 % auf `src/`. Bestehende 122 Tests müssen grün bleiben.
- **Genau EINE Generierung pro Lead.** `generated_at` ist der Riegel.
- **Kein Weg endet in einer Sackgasse** (Spec §9): Sie hat gerade ihre Mail bestätigt.

### Feste Werte (verbatim)

| Wert | Inhalt |
|---|---|
| Bildformat | **1080 × 1350** |
| Bilder pro Lead | **8** = (1 Profil-Vorschau + 3 Slides) × 2 Farbwelten |
| Look | **B „Kante"** — Space Grotesk, Headline unten verankert, ein Akzent |
| Wasserzeichen | **dezent** (`.wm-soft`), integral in der `.lock`-Sperre |
| R2-Bucket | `s2s-free` (neu), Binding `IMAGES` |
| R2-Key-Muster | `free/<token>/<look>/<frame>.jpg` |
| Claude-Modell | aus `env.AI_MODEL`, kein Hardcode |
| D1 database_id | `ddb630bc-a9c8-48ba-95bd-9c3843d0846e` |

---

## File Structure

```
~/social2scale-site/free-content/
├── wrangler.toml            + [browser] + [[r2_buckets]] IMAGES   (Task 1)
├── src/
│   ├── palette.js           rein: stimmung+farbe → 2 Paletten     (Task 2)
│   ├── moderate.js          rein: Freitext-Vorprüfung             (Task 3)
│   ├── copy.js              Claude → Texte + Fallback             (Task 4)
│   ├── templates/
│   │   ├── frames.js        rein: lead+palette+copy → HTML        (Task 5)
│   │   └── css.js           das Look-B-CSS (aus design/looks.html) (Task 5)
│   ├── render.js            Browser Rendering → R2                (Task 6)
│   ├── generate.js          Orchestrierung + Fortschritt          (Task 7)
│   └── index.js             Verdrahtung + /api/status             (Task 8)
└── test/                    je Modul eine Datei                   (durchgehend)
```

**Verantwortungs-Schnitt:** `palette.js`, `moderate.js`, `templates/*` sind **rein** (keine Bindings, kein I/O) → trivial testbar, und genau dort sitzt die Logik, die schiefgehen kann. `render.js` ist der einzige Ort, der Browser Rendering und R2 kennt. `generate.js` orchestriert und kennt keine Interna.

---

### Task 1: Bindings + Browser-Rendering-Probe

**Files:**
- Modify: `~/social2scale-site/free-content/wrangler.toml`
- Modify: `~/social2scale-site/free-content/package.json`

**Interfaces:**
- Produces: `env.BROWSER` (Browser Rendering) und `env.IMAGES` (R2) für alle folgenden Tasks.

**Kontext:** Dass Browser Rendering auf diesem Account läuft, ist am 15.07. bewiesen worden — ein Wegwerf-Worker hat einen echten Chrome gestartet und ein 6410-Byte-PNG zurückgegeben. Das ist **kein Risiko mehr**, nur noch Verdrahtung.

- [ ] **Step 1: R2-Bucket anlegen**

```bash
cd ~/social2scale-site/free-content
npx wrangler r2 bucket create s2s-free
```

Erwartung: erfolgreich (oder „already exists" — beides ok).

- [ ] **Step 2: `@cloudflare/puppeteer` installieren**

```bash
npm i @cloudflare/puppeteer
```

- [ ] **Step 3: `wrangler.toml` ergänzen** — ans Ende anhängen

```toml

# Browser Rendering — am 15.07. auf diesem Account verifiziert (Wegwerf-Worker
# s2s-browser-probe: puppeteer.launch(env.BROWSER) -> echtes PNG zurueck).
[browser]
binding = "BROWSER"

# Generierte Bilder. Eigener Bucket, NICHT s2s-logos (das sind Kundinnen-Assets).
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "s2s-free"
```

- [ ] **Step 4: Bindings-Test schreiben** — `test/bindings.test.js`

```js
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('Bindings', () => {
  it('kennt den R2-Bucket fuer die Bilder', () => {
    expect(env.IMAGES).toBeDefined();
    expect(typeof env.IMAGES.put).toBe('function');
  });
});
```

- [ ] **Step 5: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/bindings.test.js
```

Erwartung: FAIL — `env.IMAGES` ist `undefined`.

- [ ] **Step 6: Test-R2 in `vitest.config.js` ergänzen**

Im `miniflare`-Block, direkt unter `d1Databases`:

```js
          // Lokaler R2 im Test — der produktive Bucket wird NIE angefasst.
          r2Buckets: ['IMAGES'],
```

- [ ] **Step 7: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/bindings.test.js && npm test
```

Erwartung: PASS, und die 122 bestehenden Tests bleiben grün.

- [ ] **Step 8: Commit**

```bash
cd ~/social2scale-site
git add free-content/wrangler.toml free-content/vitest.config.js free-content/package.json free-content/package-lock.json free-content/test/bindings.test.js
git commit -m "feat(free-content): Browser-Rendering- und R2-Bindings"
```

---

### Task 2: `palette.js` — die zwei Farbwelten aus ihren Antworten

**Files:**
- Create: `~/social2scale-site/free-content/src/palette.js`
- Test: `~/social2scale-site/free-content/test/palette.test.js`

**Interfaces:**
- Consumes: `stimmung`, `farbe` aus dem `CleanLead` (Plan 1, `validate.js`).
- Produces:
  - `derivePalettes(stimmung: string, farbe: string) → [Palette, Palette]` — **immer genau zwei**, nie mehr, nie weniger.
  - `Palette = { id, name, paper, ink, inkSoft, accent, rule }` — alle Strings, `id` ist ein stabiler Slug (`hell`/`dunkel`/…), `name` ist das, was SIE auf dem Umschalter liest.

**Warum das der Kern ist:** Look B ist das **Typo-/Layout-System, nicht die Farbe** (Spec §6, `design/ENTSCHEIDUNG.md`). Belegt: `design/b-hell.png` und `design/b-salbei.png` zeigen dieselbe B-Struktur in hellen Paletten — sie trägt. Eine Coachin, die „ruhig/hell" angibt, bekommt B in **Creme**, kein Anthrazit. Diese Datei ist der einzige Ort, der das entscheidet.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — `test/palette.test.js`

```js
import { describe, it, expect } from 'vitest';
import { derivePalettes } from '../src/palette.js';

const istHex = (v) => /^#[0-9a-f]{6}$/i.test(v);

describe('derivePalettes', () => {
  it('liefert IMMER genau zwei Farbwelten', () => {
    for (const s of ['ruhig', 'kraftvoll', 'hell', 'unbekannt', '', null]) {
      expect(derivePalettes(s, '')).toHaveLength(2);
    }
  });

  it('liefert vollstaendige, gueltige Paletten', () => {
    for (const p of derivePalettes('ruhig', '')) {
      for (const key of ['paper', 'ink', 'inkSoft', 'accent', 'rule']) {
        expect(p[key], `${p.id}.${key}`).toBeTruthy();
      }
      expect(istHex(p.paper)).toBe(true);
      expect(istHex(p.ink)).toBe(true);
      expect(istHex(p.accent)).toBe(true);
      expect(p.id).toMatch(/^[a-z-]+$/);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('gibt den beiden Welten unterschiedliche ids', () => {
    const [a, b] = derivePalettes('ruhig', '');
    expect(a.id).not.toBe(b.id);
  });

  it('gibt "ruhig" KEIN Anthrazit — B traegt auch hell', () => {
    // Der ganze Sinn von "Palette aus ihren Antworten": wer ruhig/hell angibt,
    // darf keine Kachel bekommen, die nicht zu ihr passt.
    const [a, b] = derivePalettes('ruhig', '');
    for (const p of [a, b]) expect(p.paper.toLowerCase()).not.toBe('#0e1013');
  });

  it('gibt "kraftvoll" mindestens eine dunkle Welt', () => {
    const paletten = derivePalettes('kraftvoll', '');
    const dunkel = paletten.filter((p) => p.paper.toLowerCase() < '#888888');
    expect(dunkel.length).toBeGreaterThanOrEqual(1);
  });

  it('nimmt ihre Wunschfarbe als Akzent, wenn sie eine nennt', () => {
    const [a] = derivePalettes('ruhig', '#C2410C');
    expect(a.accent.toLowerCase()).toBe('#c2410c');
  });

  it('ignoriert eine unbrauchbare Wunschfarbe statt zu kippen', () => {
    for (const müll of ['blau', 'javascript:alert(1)', '#XYZ', '', null, undefined]) {
      const paletten = derivePalettes('ruhig', müll);
      expect(paletten).toHaveLength(2);
      for (const p of paletten) expect(istHex(p.accent)).toBe(true);
    }
  });

  it('ist deterministisch — gleiche Eingabe, gleiche Paletten', () => {
    expect(derivePalettes('kraftvoll', '#D9FF3D')).toEqual(derivePalettes('kraftvoll', '#D9FF3D'));
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/palette.test.js
```

Erwartung: FAIL — `src/palette.js` fehlt.

- [ ] **Step 3: Implementierung** — `src/palette.js`

```js
/**
 * Leitet die zwei Farbwelten aus ihren Formularangaben ab.
 * Rein: keine Bindings, kein I/O.
 *
 * WICHTIG (Spec §6, design/ENTSCHEIDUNG.md): Look B ist das TYPO-/LAYOUT-System,
 * NICHT die Farbe. Belegt in design/b-hell.png und b-salbei.png — dieselbe
 * B-Struktur traegt auch hell. Wer "ruhig/hell" angibt, bekommt B in Creme,
 * kein Anthrazit. Die zwei Farbwelten sind dieselbe Struktur in zwei Paletten,
 * nicht zwei Looks.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/** Werte 1:1 aus den gerenderten Belegen in design/ — nicht neu erfunden. */
const WELTEN = {
  creme:   { id: 'creme',   name: 'Creme',    paper: '#F4F0E9', ink: '#23201C', inkSoft: '#6B645A', accent: '#C2410C', rule: 'rgba(35,32,28,.14)' },
  salbei:  { id: 'salbei',  name: 'Salbei',   paper: '#EDF1EC', ink: '#1B241F', inkSoft: '#5F6B62', accent: '#2F6F5E', rule: 'rgba(27,36,31,.14)' },
  papier:  { id: 'papier',  name: 'Papier',   paper: '#FBFBFC', ink: '#14161A', inkSoft: '#767C86', accent: '#2F6F5E', rule: 'rgba(20,22,26,.10)' },
  nacht:   { id: 'nacht',   name: 'Nacht',    paper: '#0E1013', ink: '#F2F4F3', inkSoft: 'rgba(242,244,243,.62)', accent: '#D9FF3D', rule: 'rgba(242,244,243,.16)' },
  tinte:   { id: 'tinte',   name: 'Tinte',    paper: '#14171C', ink: '#EFF2F4', inkSoft: 'rgba(239,242,244,.60)', accent: '#7DD3A0', rule: 'rgba(239,242,244,.16)' },
};

/**
 * Welche zwei Welten zu welcher Stimmung. Immer ein Paar mit echtem Kontrast —
 * zwei fast gleiche Welten waeren kein Umschalter, sondern eine Attrappe.
 */
const NACH_STIMMUNG = {
  ruhig:      ['creme', 'salbei'],
  natuerlich: ['salbei', 'creme'],
  hell:       ['papier', 'creme'],
  freundlich: ['papier', 'salbei'],
  kraftvoll:  ['nacht', 'creme'],
  dunkel:     ['nacht', 'tinte'],
  edel:       ['tinte', 'papier'],
};

/** Standard, wenn die Stimmung nichts sagt, das wir kennen. */
const STANDARD = ['creme', 'nacht'];

function normStimmung(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/ü/g, 'ue').replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ß/g, 'ss');
}

/** Ihre Wunschfarbe zaehlt nur, wenn sie ein brauchbarer Hex ist. */
function accentOderNull(farbe) {
  const v = String(farbe ?? '').trim();
  return HEX.test(v) ? v.toLowerCase() : null;
}

/**
 * @returns {[object, object]} immer genau zwei Paletten
 */
export function derivePalettes(stimmung, farbe) {
  const s = normStimmung(stimmung);
  const paar = NACH_STIMMUNG[s] ?? STANDARD;
  const wunsch = accentOderNull(farbe);

  // Die Wunschfarbe faerbt NUR den Akzent, nie Grund oder Typo: sonst kippt der
  // Kontrast und ihr Content wird unlesbar. Sie waehlt eine Farbe, nicht ein Design.
  return paar.map((key) => {
    const welt = WELTEN[key];
    return wunsch ? { ...welt, accent: wunsch } : { ...welt };
  });
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/palette.test.js && npm test
```

Erwartung: PASS (8 neue Tests), bestehende 122 grün.

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/palette.js free-content/test/palette.test.js
git commit -m "feat(free-content): Farbwelten aus Stimmung+Wunschfarbe ableiten"
```

---

### Task 3: `moderate.js` — was NICHT unser Logo tragen darf

**Files:**
- Create: `~/social2scale-site/free-content/src/moderate.js`
- Test: `~/social2scale-site/free-content/test/moderate.test.js`

**Interfaces:**
- Consumes: `branche`, `ziel` aus dem `CleanLead`.
- Produces: `checkInput(clean: object) → { ok: boolean, grund?: 'hass'|'sexuell'|'politik'|'illegal'|'heilversprechen' }`

**Warum (Spec §5a):** Wir laden Fremde ein, sich Content zu bauen, der **unser Logo trägt**. Jedes Bild ist damit eine öffentliche Aussage von s2s. Wer „Ziel: Kunden versprechen, dass sie in 4 Wochen geheilt sind" eintippt, macht sein Rechtsproblem zu unserem. Diese Datei ist die **erste** Schicht — die zweite ist der Compliance-Prompt (Task 4). Eine Modell-Weigerung allein ist keine Absicherung.

**Bewusst simpel:** Eine Wortliste, keine KI. YAGNI — und ein Moderations-Call vor jeder Generierung wäre eine weitere Fehlerquelle im teuersten Pfad.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — `test/moderate.test.js`

```js
import { describe, it, expect } from 'vitest';
import { checkInput } from '../src/moderate.js';

const gut = { branche: 'Fitness-Coaching', ziel: 'Mehr Anfragen ueber Instagram' };

describe('checkInput', () => {
  it('laesst normale Eingaben durch', () => {
    const okFaelle = [
      { branche: 'Fitness-Coaching', ziel: 'Mehr Anfragen' },
      { branche: 'Ernährungsberatung', ziel: 'Sichtbarer werden' },
      { branche: 'Karriere-Coaching für Frauen', ziel: 'Endlich regelmäßig posten' },
      { branche: 'Yoga & Achtsamkeit', ziel: 'Meine Community aufbauen' },
    ];
    for (const f of okFaelle) expect(checkInput(f).ok, JSON.stringify(f)).toBe(true);
  });

  it('lehnt Heilversprechen ab — sonst steht unser Logo unter ihrem HWG-Verstoss', () => {
    const r = checkInput({ ...gut, ziel: 'Kunden versprechen dass sie in 4 Wochen geheilt sind' });
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('heilversprechen');
  });

  it('lehnt Hass ab', () => {
    expect(checkInput({ ...gut, branche: 'Ich hasse Ausländer' }).ok).toBe(false);
  });

  it('lehnt Sexuelles ab', () => {
    expect(checkInput({ ...gut, branche: 'Escort Service' }).ok).toBe(false);
  });

  it('lehnt Illegales ab', () => {
    expect(checkInput({ ...gut, ziel: 'Drogen verkaufen' }).ok).toBe(false);
  });

  it('prueft beide Freitextfelder, nicht nur eins', () => {
    expect(checkInput({ branche: 'Coaching', ziel: 'heilt Krebs' }).ok).toBe(false);
    expect(checkInput({ branche: 'heilt Krebs', ziel: 'Coaching' }).ok).toBe(false);
  });

  it('faellt nicht auf Gross-/Kleinschreibung herein', () => {
    expect(checkInput({ ...gut, ziel: 'HEILT KREBS' }).ok).toBe(false);
  });

  it('kippt nicht bei fehlenden Feldern', () => {
    expect(checkInput({}).ok).toBe(true);
    expect(checkInput(null).ok).toBe(true);
  });

  it('meldet keinen Fehlalarm bei harmlosen Teilwoertern', () => {
    // "Heilpraktikerin" ist ein Beruf, kein Heilversprechen. Wer den ablehnt,
    // wirft eine echte Kundin raus.
    expect(checkInput({ branche: 'Heilpraktikerin', ziel: 'Mehr Anfragen' }).ok).toBe(true);
    expect(checkInput({ branche: 'Ganzheitliche Beratung', ziel: 'Menschen erreichen' }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/moderate.test.js
```

Erwartung: FAIL — `src/moderate.js` fehlt.

- [ ] **Step 3: Implementierung** — `src/moderate.js`

```js
/**
 * Vorpruefung der Freitextfelder. Rein: keine Bindings, kein I/O.
 *
 * WARUM (Spec §5a): Jedes generierte Bild traegt UNSER Logo und ist damit eine
 * oeffentliche Aussage von social2scale. Wer hier "heilt in 4 Wochen" eintippt,
 * macht sein Rechtsproblem zu unserem.
 *
 * Das ist Schicht EINS. Schicht zwei ist der Compliance-Prompt in copy.js.
 * Eine Modell-Weigerung allein ist keine Absicherung — Modelle sind ueberredbar.
 *
 * Bewusst eine Wortliste statt KI: ein Moderations-Call waere eine weitere
 * Fehlerquelle im teuersten Pfad, und die Trefferliste hier ist ehrlich grob.
 * Sie faengt das Offensichtliche; den Rest faengt der Prompt.
 */

const MUSTER = [
  // Heilversprechen (HWG). Wortgrenzen sind Pflicht: "Heilpraktikerin" ist ein
  // Beruf, kein Versprechen — wer den ablehnt, wirft eine echte Kundin raus.
  { grund: 'heilversprechen', re: /\b(heilt|heilen|geheilt|heilung)\b|\blindert\b|\bschmerzfrei\b|\bkrebs\b|\bdiagnose\b|\btherapiert\b/i },
  { grund: 'hass',     re: /\b(hasse|hass auf)\b.{0,20}\b(auslaender|ausländer|juden|muslime|schwule|frauen|maenner|männer)\b|\bvolksverhetz/i },
  { grund: 'sexuell',  re: /\b(escort|erotik|porno|sexcam|onlyfans|prostitu)/i },
  { grund: 'politik',  re: /\b(afd|npd|reichsbuerger|reichsbürger|querdenk)/i },
  { grund: 'illegal',  re: /\b(drogen|kokain|waffen|betrug|geldwaesche|geldwäsche|schwarzarbeit)\b/i },
];

/**
 * @returns {{ok: true} | {ok: false, grund: string}}
 */
export function checkInput(clean) {
  const text = [clean?.branche, clean?.ziel].filter(Boolean).join(' \n ');
  if (!text.trim()) return { ok: true };

  for (const { grund, re } of MUSTER) {
    if (re.test(text)) return { ok: false, grund };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/moderate.test.js && npm test
```

Erwartung: PASS (9 neue Tests), bestehende grün.

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/moderate.js free-content/test/moderate.test.js
git commit -m "feat(free-content): Moderations-Vorpruefung — unser Logo, unsere Verantwortung"
```

---

### Task 4: `copy.js` — Claude schreibt ihre Texte, mit Netz

**Files:**
- Create: `~/social2scale-site/free-content/src/copy.js`
- Test: `~/social2scale-site/free-content/test/copy.test.js`

**Interfaces:**
- Consumes: `CleanLead` (`branche`, `ziel`, `stimmung`, `handle`, `name`).
- Produces:
  - `buildFallback(clean: object) → Copy` — **rein**, kein Netz.
  - `generateCopy(env: object, clean: object) → Promise<Copy>` — versucht Claude, fällt auf `buildFallback` zurück. **Wirft nie.**
  - `Copy = { eyebrow, head, headAccent, sub, bio, cells: string[9] }` — `cells` ist **immer** exakt 9 Einträge (das 3×3-Grid der Profil-Vorschau). `head`/`headAccent` sind zwei Teile: der Akzent wird in der Farbwelt-Farbe gesetzt.

**Warum der Fallback nicht optional ist (Spec §9):** Sie hat gerade ihre Mail bestätigt. Wenn Claude ausfällt, darf sie **keine kaputte Seite** sehen — sie bekommt Texte aus ihren eigenen Angaben. Generischer, aber da.

**Der Compliance-Prompt wird portiert, nicht erfunden:** Vorlage ist `~/social2scale-clients/_portal/_worker.js:1919-1949` (`STUDIO_SYSTEM`) — der läuft seit Wochen für echte Kundinnen in HWG-Nischen. Die HWG-Regeln daraus kommen **wortgleich** mit.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — `test/copy.test.js`

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildFallback, generateCopy } from '../src/copy.js';

const clean = {
  name: 'Dorothea Beekman', handle: 'praxisfunke',
  branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen über Instagram', stimmung: 'ruhig',
};

function pruefeCopyForm(c) {
  for (const k of ['eyebrow', 'head', 'headAccent', 'sub', 'bio']) {
    expect(typeof c[k], k).toBe('string');
    expect(c[k].length, k).toBeGreaterThan(0);
  }
  expect(Array.isArray(c.cells)).toBe(true);
  expect(c.cells).toHaveLength(9);   // das 3x3-Grid — nie mehr, nie weniger
  for (const z of c.cells) expect(typeof z).toBe('string');
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('buildFallback', () => {
  it('baut vollstaendige Texte ohne Netz', () => {
    pruefeCopyForm(buildFallback(clean));
  });

  it('nutzt IHRE Angaben, nicht Platzhalter', () => {
    const c = buildFallback(clean);
    const alles = JSON.stringify(c).toLowerCase();
    expect(alles).toContain('coaching für coaches'.toLowerCase());
  });

  it('kippt nicht bei duennen Angaben', () => {
    pruefeCopyForm(buildFallback({ branche: '', ziel: '', stimmung: '', handle: 'x', name: '' }));
    pruefeCopyForm(buildFallback({}));
  });
});

describe('generateCopy', () => {
  const envOk = { ANTHROPIC_API_KEY: 'k', AI_MODEL: 'claude-test' };

  const antwort = (obj) => ({
    ok: true, status: 200,
    json: async () => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] }),
  });

  it('nutzt Claudes Text, wenn die Antwort brauchbar ist', async () => {
    const echt = {
      eyebrow: 'In 90 Tagen', head: 'Sichtbar werden,', headAccent: 'ohne dich zu verbiegen.',
      sub: 'Die drei Fehler.', bio: 'Aus Erfahrung wird Wirkung.',
      cells: ['1','2','3','4','5','6','7','8','9'],
    };
    vi.stubGlobal('fetch', vi.fn(async () => antwort(echt)));
    const c = await generateCopy(envOk, clean);
    expect(c.eyebrow).toBe('In 90 Tagen');
    pruefeCopyForm(c);
  });

  it('faellt zurueck, wenn Claude nicht erreichbar ist — nie eine kaputte Seite', async () => {
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('netz weg'); }));
    pruefeCopyForm(await generateCopy(envOk, clean));
    expect(fehler).toHaveBeenCalled();   // nie still
  });

  it('faellt zurueck bei nicht-200', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 529, text: async () => 'overloaded' })));
    pruefeCopyForm(await generateCopy(envOk, clean));
  });

  it('faellt zurueck bei kaputtem JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'kein json {{' }] }),
    })));
    pruefeCopyForm(await generateCopy(envOk, clean));
  });

  it('faellt zurueck, wenn Claude die falsche Form liefert', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // 4 statt 9 Zellen — wuerde das Grid zerreissen
    vi.stubGlobal('fetch', vi.fn(async () => antwort({ eyebrow: 'x', head: 'y', headAccent: 'z', sub: 'a', bio: 'b', cells: ['1','2','3','4'] })));
    const c = await generateCopy(envOk, clean);
    expect(c.cells).toHaveLength(9);
  });

  it('faellt ohne API-Key zurueck, ohne zu werfen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    pruefeCopyForm(await generateCopy({}, clean));
    expect(f).not.toHaveBeenCalled();   // kein sinnloser Call
  });

  it('schickt die HWG-Regeln mit — sie sind der Grund fuer den Prompt', async () => {
    const f = vi.fn(async () => antwort({ eyebrow: 'a', head: 'b', headAccent: 'c', sub: 'd', bio: 'e', cells: Array(9).fill('x') }));
    vi.stubGlobal('fetch', f);
    await generateCopy(envOk, clean);
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.system).toMatch(/HWG/);
    expect(body.system).toMatch(/Heil/);
    expect(body.model).toBe('claude-test');   // aus env, nicht hartkodiert
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/copy.test.js
```

Erwartung: FAIL — `src/copy.js` fehlt.

- [ ] **Step 3: Implementierung** — `src/copy.js`

```js
/**
 * Post-Texte fuer den Free-Content.
 *
 * Der Fallback ist NICHT optional (Spec §9): sie hat gerade ihre Mail bestaetigt.
 * Faellt Claude aus, bekommt sie Texte aus ihren eigenen Angaben — generischer,
 * aber da. Eine kaputte Seite ist keine Option.
 *
 * Die HWG-Regeln sind aus dem erprobten STUDIO_SYSTEM portiert
 * (~/social2scale-clients/_portal/_worker.js:1919-1949) — der laeuft seit Wochen
 * fuer echte Kundinnen in HWG-Nischen. Bei Recht wird kopiert, nicht erfunden.
 */

const API = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS = 1200;

const SYSTEM =
  'Du bist Senior-Content-Stratege der Premium-Agentur social2scale. Du schreibst Instagram-Content ' +
  'in DER STIMME DER KUNDIN — deutsch, Du-Form, konkret, ohne Floskeln, ohne Marketing-Sprech.\n\n' +
  'HOOK fuers Cover (waehle das passendste Muster):\n' +
  '- Kontra-Intuition: „Dein Problem ist nicht zu wenig Disziplin. Es ist zu viel davon."\n' +
  '- Konkrete Zahl: „3 Saetze, die jedes schwierige Gespraech drehen."\n' +
  '- Offene Frage: „Warum bist du nach dem Urlaub mueder als davor?"\n' +
  'NICHT: „5 Tipps fuer mehr Selbstliebe" — generische Listicle-Hooks ohne Spannungsluecke sind verboten.\n\n' +
  'HWG & RECHTSSICHERHEIT (Pflicht, keine Ausnahmen):\n' +
  '- Keine Wirk-, Heil-, Erfolgs- oder Einkommensversprechen. Keine Diagnosen, kein Therapie-Ersatz.\n' +
  '- Verboten: „hilft gegen/bei …", „lindert …", „heilt …", „macht schmerzfrei", „damit verdienst du … EUR".\n' +
  '- Umformulieren statt versprechen: NICHT „hilft gegen Schlafprobleme" → SONDERN „mein Abendritual sieht so aus". ' +
  'NICHT „reduziert Stress" → SONDERN „was mir an stressigen Tagen guttut".\n' +
  '- Bei Wellness-/Gesundheits-Themen: ausschliesslich Ich-Erleben und Einladung zum Ausprobieren — nie objektive Wirkaussagen.\n\n' +
  'Wenn das Thema nicht seriös bewerbbar ist, antworte mit {"ablehnen":true}.\n\n' +
  'Antworte IMMER NUR mit validem JSON — ohne Markdown-Zaeune, ohne Erklaerung:\n' +
  '{"eyebrow":"…","head":"…","headAccent":"…","sub":"…","bio":"…","cells":["…" ×9]}\n' +
  '- eyebrow: 2-3 Woerter, Kicker ueber der Headline.\n' +
  '- head + headAccent: die Headline in ZWEI Teilen. headAccent wird farbig gesetzt und ist die Pointe.\n' +
  '- sub: ein Satz, max 90 Zeichen.\n' +
  '- bio: ihre Instagram-Bio-Zeile, max 40 Zeichen.\n' +
  '- cells: 9 kurze Post-Titel (je max 18 Zeichen) fuer ihr Feed-Raster.';

function clip(v, n) {
  return String(v ?? '').trim().slice(0, n);
}

/** Rein, kein Netz. Baut Texte aus IHREN Angaben. */
export function buildFallback(clean) {
  const branche = clip(clean?.branche, 60) || 'dein Thema';
  const ziel = clip(clean?.ziel, 80) || 'sichtbar werden';

  return {
    eyebrow: 'Dein Vorgeschmack',
    head: 'So könnte dein Feed',
    headAccent: 'aussehen.',
    sub: `${branche} — sichtbar, konsistent, nach dir.`.slice(0, 90),
    bio: branche.slice(0, 40),
    cells: [
      'Dein Thema', 'Warum jetzt?', '3 Schritte',
      'Zitat', 'Vorher / Nachher', 'Deine Frage?',
      'Einblick', 'Über dich', ziel.slice(0, 18),
    ],
  };
}

/** true, wenn Claudes Antwort die Form hat, auf die die Templates bauen. */
function formStimmt(c) {
  if (!c || typeof c !== 'object') return false;
  for (const k of ['eyebrow', 'head', 'headAccent', 'sub', 'bio']) {
    if (typeof c[k] !== 'string' || !c[k].trim()) return false;
  }
  return Array.isArray(c.cells) && c.cells.length === 9 && c.cells.every((z) => typeof z === 'string');
}

/**
 * Versucht Claude, faellt sonst auf buildFallback zurueck. WIRFT NIE.
 * @returns {Promise<object>} Copy
 */
export async function generateCopy(env, clean) {
  if (!env?.ANTHROPIC_API_KEY) {
    console.error('[copy] ANTHROPIC_API_KEY fehlt — nutze Fallback-Texte');
    return buildFallback(clean);
  }

  const user =
    `Kundin: ${clip(clean?.name, 60)} (@${clip(clean?.handle, 40)})\n` +
    `Thema: ${clip(clean?.branche, 200)}\n` +
    `Ziel: ${clip(clean?.ziel, 400)}\n` +
    `Stimmung: ${clip(clean?.stimmung, 40)}`;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) {
      console.error('[copy] Claude antwortete mit', res.status, await res.text());
      return buildFallback(clean);
    }

    const data = await res.json();
    const text = (data?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = JSON.parse(text);

    if (parsed?.ablehnen) {
      console.error('[copy] Claude hat das Thema abgelehnt — nutze neutrale Fallback-Texte');
      return buildFallback(clean);
    }
    if (!formStimmt(parsed)) {
      console.error('[copy] Claudes Antwort hat die falsche Form — nutze Fallback-Texte');
      return buildFallback(clean);
    }
    return parsed;
  } catch (err) {
    console.error('[copy] Texte konnten nicht generiert werden:', err);
    return buildFallback(clean);
  }
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/copy.test.js && npm test
```

Erwartung: PASS (11 neue Tests), bestehende grün.

- [ ] **Step 5: `AI_MODEL` in `wrangler.toml` ergänzen** — im `[vars]`-Block

```toml
AI_MODEL      = "claude-sonnet-5"
```

- [ ] **Step 6: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/copy.js free-content/test/copy.test.js free-content/wrangler.toml
git commit -m "feat(free-content): Claude-Texte mit HWG-Prompt + Fallback der nie kippt"
```

---

### Task 5: `templates/` — das Design als Funktion

**Files:**
- Create: `~/social2scale-site/free-content/src/templates/css.js`
- Create: `~/social2scale-site/free-content/src/templates/frames.js`
- Test: `~/social2scale-site/free-content/test/frames.test.js`
- Read: `~/social2scale-site/free-content/design/looks.html` — **die Quelle**

**Interfaces:**
- Consumes: `Palette` (Task 2), `Copy` (Task 4), `CleanLead`.
- Produces:
  - `LOOK_CSS: string` (aus `css.js`) — das komplette Look-B-CSS.
  - `buildPage(clean, copy, palettes) → string` — **rein**. Eine HTML-Seite mit **allen 8 Frames**, jeder mit `id="f-<look>-<frame>"`.
  - `FRAME_IDS: string[]` — die 8 IDs in Render-Reihenfolge. `render.js` (Task 6) iteriert darüber.

**Das ist Portierung, keine Erfindung.** `design/looks.html` rendert Look B nachweislich (Belege: `design/s-b.png`, `design/b-hell.png`, `design/pb-hell.png`). Übernimm CSS und Markup **so wie sie sind** und ersetze nur die harten Werte durch Palette-Tokens. Wer hier „verbessert", wirft eine getroffene Design-Entscheidung weg.

**Fallstricke — stehen in `design/README.md`, hier nochmal, weil sie Blut gekostet haben:**
- **Headline unten verankert**, Kicker oben. Oben verankert klafft die Mitte leer.
- **Phone-Mockup 536px breit.** Breiter liest es sich als Tablet und der „das bin ja ICH"-Moment fällt flach.
- **`.lock` ist die Sperre**: unser Zeichen + IHR Handle in EINEM Element, das die Grundlinie trägt. **Niemals trennen** — das ist die Umsetzung von Spec §5a.
- Wasserzeichen: **`.wm-soft`** (dezent). `.wm-loud` ist verworfen, nicht mitportieren.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — `test/frames.test.js`

```js
import { describe, it, expect } from 'vitest';
import { buildPage, FRAME_IDS } from '../src/templates/frames.js';
import { derivePalettes } from '../src/palette.js';
import { buildFallback } from '../src/copy.js';

const clean = {
  name: 'Dorothea Beekman', handle: 'praxisfunke',
  branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen', stimmung: 'ruhig',
};
const palettes = derivePalettes('ruhig', '');
const copy = buildFallback(clean);
const html = buildPage(clean, copy, palettes);

describe('FRAME_IDS', () => {
  it('benennt genau 8 Frames — 4 je Farbwelt', () => {
    expect(FRAME_IDS).toHaveLength(8);
    expect(new Set(FRAME_IDS).size).toBe(8);   // keine Dubletten
  });
});

describe('buildPage', () => {
  it('liefert jeden Frame genau einmal', () => {
    for (const id of FRAME_IDS) {
      const treffer = html.split(`id="${id}"`).length - 1;
      expect(treffer, id).toBe(1);
    }
  });

  it('setzt ihren Handle und ihre Bio ein — der "das bin ja ich"-Moment', () => {
    expect(html).toContain('praxisfunke');
    expect(html).toContain('Dorothea Beekman');
  });

  it('traegt die Sperre in JEDEM Frame — das Wasserzeichen ist nicht optional', () => {
    expect(html.split('class="lock').length - 1).toBe(8);
    expect(html.split('social2scale').length - 1).toBeGreaterThanOrEqual(8);
  });

  it('nutzt das dezente Wasserzeichen, nicht das verworfene laute', () => {
    expect(html).toContain('wm-soft');
    expect(html).not.toContain('wm-loud');
  });

  it('setzt beide Paletten als Tokens', () => {
    for (const p of palettes) {
      expect(html).toContain(p.paper);
      expect(html).toContain(p.accent);
    }
  });

  it('escaped ihre Eingaben — sie kommen aus einem oeffentlichen Formular', () => {
    const boese = { ...clean, name: '<script>alert(1)</script>', handle: 'x' };
    const h = buildPage(boese, copy, palettes);
    expect(h).not.toContain('<script>alert(1)</script>');
    expect(h).toContain('&lt;script&gt;');
  });

  it('escaped auch die generierten Texte', () => {
    const boeseCopy = { ...copy, head: '<img src=x onerror=alert(1)>' };
    const h = buildPage(clean, boeseCopy, palettes);
    expect(h).not.toContain('onerror=alert(1)');
  });

  it('laedt die Schriften, auf denen der Look steht', () => {
    expect(html).toContain('Space+Grotesk');
    expect(html).toContain('Plus+Jakarta+Sans');
  });

  it('haelt das IG-Format fest', () => {
    expect(html).toContain('1080px');
    expect(html).toContain('1350px');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/frames.test.js
```

Erwartung: FAIL — `src/templates/frames.js` fehlt.

- [ ] **Step 3: `src/templates/css.js` anlegen**

Öffne `~/social2scale-site/free-content/design/looks.html` und übernimm den **kompletten `<style>`-Inhalt** als exportierten String — **ohne inhaltliche Änderung**, mit genau diesen Anpassungen:

1. Die Look-Klassen `.look-a` / `.look-b` / `.look-c` / `.look-b-hell` / `.look-b-salbei` **entfallen**. Stattdessen liest jeder Frame seine Tokens aus einem Inline-`style`-Attribut (Task 5, Step 4).
2. `.look-b .head { letter-spacing: -.045em; font-weight: 700; }` und `.look-b .head em { font-style: normal; color: var(--accent); }` werden zu `.head { … }` bzw. `.head em { … }` — **Look B ist jetzt der einzige Look**.
3. `.wm-loud` und `.label` entfallen (verworfen bzw. nur fürs Kontaktbogen-Layout).
4. `body { background: #1a1a1a; }` entfällt — im Render-Kontext gibt es keine Bühne.

```js
/**
 * Das Look-B-CSS. Portiert aus design/looks.html — dort nachweislich gerendert
 * (Belege: design/s-b.png, b-hell.png, pb-hell.png).
 *
 * NICHT "verbessern". Look B + dezentes Wasserzeichen sind eine getroffene
 * Entscheidung (design/ENTSCHEIDUNG.md, Spec §6). Wer hier umgestaltet, wirft sie weg.
 *
 * Die Farben stehen bewusst NICHT hier: jeder Frame bekommt seine Palette als
 * Inline-Tokens. Look B ist das Typo-/Layout-System, nicht die Farbe.
 */
export const LOOK_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  … (Rest 1:1 aus design/looks.html) …
`;
```

- [ ] **Step 4: `src/templates/frames.js` anlegen**

```js
/**
 * Baut EINE HTML-Seite mit allen 8 Frames. Rein: keine Bindings, kein I/O.
 *
 * Alle 8 auf einer Seite, weil render.js sie in EINEM Browser-Durchlauf
 * abschiesst (Muster make-pdfs.cjs: element.screenshot pro Frame). Acht
 * Browser-Starts waeren acht Mal Kaltstart.
 */

import { LOOK_CSS } from './css.js';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700' +
  '&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';

/** Reihenfolge = Render-Reihenfolge. render.js iteriert hierueber. */
export const FRAME_IDS = [
  'f-0-profil', 'f-0-s1', 'f-0-s2', 'f-0-s3',
  'f-1-profil', 'f-1-s1', 'f-1-s2', 'f-1-s3',
];

/** Ihre Eingaben kommen aus einem OEFFENTLICHEN Formular. Nichts landet roh im HTML. */
function esc(v) {
  return String(v ?? '').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Palette als Inline-Tokens — Look B traegt jede Farbwelt (belegt: design/b-hell.png). */
function tokens(p) {
  return [
    `--paper:${p.paper}`, `--ink:${p.ink}`, `--ink-soft:${p.inkSoft}`,
    `--accent:${p.accent}`, `--rule:${p.rule}`,
    '--ff-display:"Space Grotesk",sans-serif', '--ff-body:"Plus Jakarta Sans",sans-serif',
    `background:${p.paper}`,
  ].join(';');
}

/**
 * DIE SPERRE (Spec §5a): unser Zeichen und IHR Handle in EINEM Element, das die
 * Grundlinie der Komposition traegt. Wer uns wegradiert, nimmt ihren Namen und die
 * Linie mit — das Loch sieht man sofort.
 * NIEMALS trennen. Das ist der ganze Punkt.
 */
function lock(clean) {
  return `<div class="lock wm-soft">
    <span class="handle">@${esc(clean.handle)}</span>
    <span class="spacer"></span>
    <span class="mark"><span class="dot"></span>erstellt mit <b>social2scale</b></span>
  </div>`;
}

function slide(id, clean, copy, p, nr) {
  return `<div class="frame grain" id="${id}" style="${tokens(p)}">
    <div class="slide">
      <div class="slide-top">
        <span class="eyebrow">${esc(copy.eyebrow)}</span>
        <span class="idx"><b>0${nr}</b> / 03</span>
      </div>
      <div class="rule-top"></div>
      <div class="spacer-fill"></div>
      <h1 class="head">${esc(copy.head)}<br><em>${esc(copy.headAccent)}</em></h1>
      <p class="sub">${esc(copy.sub)}</p>
    </div>
    ${lock(clean)}
  </div>`;
}

function profil(id, clean, copy, p) {
  const muster = ['c-fill','c-tint','c-accent','c-line','c-fill','c-tint','c-accent','c-line','c-fill'];
  const zellen = copy.cells
    .map((t, i) => `<div class="cell ${muster[i]}">${esc(t)}</div>`)
    .join('');
  const initial = esc((clean.name || clean.handle || '?').trim().charAt(0).toUpperCase());

  return `<div class="frame grain" id="${id}" style="${tokens(p)}">
    <div class="phone-pad"><div class="shell"><div class="device">
      <div class="ios"><span>9:41</span><span class="rechts">▮▮▮ ▰</span></div>
      <div class="ig-top"><span>@${esc(clean.handle)}</span></div>
      <div class="prof">
        <div class="prof-top">
          <div class="avatar">${initial}</div>
          <div class="stats">
            <div class="stat"><b>9</b><span>Beiträge</span></div>
            <div class="stat"><b>1.240</b><span>Follower</span></div>
            <div class="stat"><b>318</b><span>Folgt</span></div>
          </div>
        </div>
        <div class="bio">
          <div class="n">${esc(clean.name)}</div>
          <div class="l"><b>${esc(copy.bio)}</b></div>
        </div>
        <div class="hl">
          <div class="hl-i"><div class="hl-c">✳</div>Über mich</div>
          <div class="hl-i"><div class="hl-c">◆</div>Angebot</div>
          <div class="hl-i"><div class="hl-c">❞</div>Stimmen</div>
          <div class="hl-i"><div class="hl-c">?</div>Fragen</div>
        </div>
        <div class="grid3">${zellen}</div>
      </div>
    </div></div></div>
    ${lock(clean)}
  </div>`;
}

/**
 * @returns {string} eine HTML-Seite mit allen 8 Frames
 */
export function buildPage(clean, copy, palettes) {
  const frames = palettes
    .map((p, i) => [
      profil(`f-${i}-profil`, clean, copy, p),
      slide(`f-${i}-s1`, clean, copy, p, 1),
      slide(`f-${i}-s2`, clean, copy, p, 2),
      slide(`f-${i}-s3`, clean, copy, p, 3),
    ].join(''))
    .join('');

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>${LOOK_CSS}</style></head><body>${frames}</body></html>`;
}
```

**Hinweis zu den Slides 2 und 3:** Sie tragen in dieser Fassung denselben Text wie Slide 1 — die Dramaturgie (Problem spiegeln → Reframe → CTA) kommt in Plan 3, wenn der Build-Screen die Slides einzeln anzeigt. Für den Vorgeschmack sind drei Slides mit Zähler ehrlicher als eine, und der Zähler stimmt.

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/frames.test.js && npm test
```

Erwartung: PASS (10 neue Tests), bestehende grün.

- [ ] **Step 6: Sichtprüfung — das Wichtigste an diesem Task**

Grüne Tests beweisen die Struktur, nicht das Aussehen — deshalb dieser Schritt.

`frames.js` ist ESM, also **kein** `.cjs`-Skript mit `require`. Leg `test/vorschau.mjs` an
(Playwright ist global installiert, im Projekt gibt es keins):

```js
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import { buildPage, FRAME_IDS } from '../src/templates/frames.js';
import { derivePalettes } from '../src/palette.js';
import { buildFallback } from '../src/copy.js';

const clean = { name: 'Dorothea Beekman', handle: 'praxisfunke', branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen', stimmung: 'ruhig' };
const html = buildPage(clean, buildFallback(clean), derivePalettes('ruhig', ''));
writeFileSync('/tmp/vorschau.html', html);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 1400 } });
await p.goto('file:///tmp/vorschau.html', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);   // sonst rendert Chrome die Fallback-Schrift
await p.waitForTimeout(500);
for (const id of FRAME_IDS) {
  const el = await p.$('#' + id);
  const box = await el.boundingBox();
  console.log(id.padEnd(12), Math.round(box.width) + '×' + Math.round(box.height));
  await el.screenshot({ path: `/tmp/vorschau-${id}.png` });
}
await b.close();
```

Laufen lassen:

```bash
cd ~/social2scale-site/free-content && node test/vorschau.mjs
```

Erwartung: alle 8 Frames exakt `1080×1350`.

**Dann die Bilder wirklich ansehen** (`/tmp/vorschau-f-0-profil.png` und `/tmp/vorschau-f-1-s1.png`) und gegen `design/pb-hell.png` bzw. `design/b-hell.png` halten. Weicht die Optik ab, ist die Portierung schiefgegangen — melden, nicht selbst umgestalten.

- [ ] **Step 7: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/templates/ free-content/test/frames.test.js free-content/test/vorschau.mjs
git commit -m "feat(free-content): Look-B-Templates als reine Funktion portiert"
```

---

### Task 6: `render.js` — Browser Rendering → R2

**Files:**
- Create: `~/social2scale-site/free-content/src/render.js`
- Test: `~/social2scale-site/free-content/test/render.test.js`

**Interfaces:**
- Consumes: `buildPage`, `FRAME_IDS` (Task 5); `env.BROWSER`, `env.IMAGES` (Task 1).
- Produces:
  - `r2Key(token: string, frameId: string) → string` — **rein**. Liefert `free/<token>/<frameId>.jpg`.
  - `renderAll(env, token, clean, copy, palettes, onProgress?) → Promise<string[]>` — die R2-Keys in Render-Reihenfolge. `onProgress(fertig: number, gesamt: number)` wird nach **jedem** Frame gerufen (der Build-Screen aus Plan 3 hängt daran).

**Ein Browser-Durchlauf für alle 8.** Muster: `~/social2scale-clients/kit-build/make-pdfs.cjs` — Seite laden, `document.fonts.ready` abwarten, dann `element.screenshot()` je Frame. Acht Browser-Starts wären acht Kaltstarts.

**`document.fonts.ready` ist Pflicht** (`design/README.md`): ohne das rendert Chrome die Fallback-Schrift, und Look B ohne Space Grotesk ist nicht Look B.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — `test/render.test.js`

```js
import { describe, it, expect } from 'vitest';
import { r2Key } from '../src/render.js';

describe('r2Key', () => {
  it('legt Bilder je Lead getrennt ab', () => {
    expect(r2Key('abc123', 'f-0-profil')).toBe('free/abc123/f-0-profil.jpg');
  });

  it('trennt zwei Leads sauber', () => {
    expect(r2Key('aaa', 'f-0-s1')).not.toBe(r2Key('bbb', 'f-0-s1'));
  });

  it('laesst nichts Fremdes in den Key — der Token kommt von aussen', () => {
    // Ein Key mit ../ koennte fremde Objekte adressieren.
    const k = r2Key('../../etc/passwd', 'f-0-s1');
    expect(k).not.toContain('..');
    expect(k.startsWith('free/')).toBe(true);
  });

  it('saeubert auch die Frame-Id', () => {
    expect(r2Key('abc', '../x')).not.toContain('..');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/render.test.js
```

Erwartung: FAIL — `src/render.js` fehlt.

- [ ] **Step 3: Implementierung** — `src/render.js`

```js
/**
 * Browser Rendering → R2. Der einzige Ort, der beide kennt.
 *
 * ALLE 8 Frames in EINEM Browser-Durchlauf (Muster: kit-build/make-pdfs.cjs):
 * Seite laden → document.fonts.ready → element.screenshot() je Frame.
 * Acht Browser-Starts waeren acht Kaltstarts.
 */

import puppeteer from '@cloudflare/puppeteer';
import { buildPage, FRAME_IDS } from './templates/frames.js';

const BILD_TYP = 'image/jpeg';
const QUALITAET = 92;

/** Nur was wir selbst erzeugen darf in den Key — der Token kommt von aussen. */
function sauber(v) {
  return String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
}

export function r2Key(token, frameId) {
  return `free/${sauber(token)}/${sauber(frameId)}.jpg`;
}

/**
 * @param {Function} [onProgress] (fertig, gesamt) — nach JEDEM Frame.
 * @returns {Promise<string[]>} R2-Keys in Render-Reihenfolge
 */
export async function renderAll(env, token, clean, copy, palettes, onProgress) {
  const html = buildPage(clean, copy, palettes);
  let browser;
  const keys = [];

  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1400 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ohne das rendert Chrome die Fallback-Schrift — und Look B ohne Space
    // Grotesk ist nicht Look B. Steht so in design/README.md.
    await page.evaluate(() => document.fonts.ready);

    for (let i = 0; i < FRAME_IDS.length; i++) {
      const id = FRAME_IDS[i];
      const el = await page.$('#' + id);
      if (!el) throw new Error(`Frame ${id} fehlt in der gebauten Seite`);

      const bild = await el.screenshot({ type: 'jpeg', quality: QUALITAET });
      const key = r2Key(token, id);
      await env.IMAGES.put(key, bild, { httpMetadata: { contentType: BILD_TYP } });
      keys.push(key);

      if (onProgress) onProgress(i + 1, FRAME_IDS.length);
    }
    return keys;
  } finally {
    // Ein nicht geschlossener Browser blockiert eine Session, bis sie ausläuft —
    // und die naechste Besucherin wartet dann auf nichts.
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('[render] Browser liess sich nicht schliessen:', err);
      }
    }
  }
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/render.test.js && npm test
```

Erwartung: PASS (4 neue Tests), bestehende grün.

**Hinweis:** `renderAll` selbst hat hier keine Unit-Tests — Browser Rendering läuft nicht in Miniflare. Bewiesen wird es in Task 9 gegen die echte Instanz. Das ist eine bewusste Grenze, keine Nachlässigkeit.

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/render.js free-content/test/render.test.js
git commit -m "feat(free-content): 8 Frames in EINEM Browser-Durchlauf nach R2"
```

---

### Task 7: `generate.js` — die Orchestrierung, genau einmal

**Files:**
- Create: `~/social2scale-site/free-content/src/generate.js`
- Modify: `~/social2scale-clients/_portal/migrate-v12.sql` (neu) + `schema.sql` + `free-content/test/schema.sql`
- Test: `~/social2scale-site/free-content/test/generate.test.js`

**Interfaces:**
- Consumes: `checkInput` (Task 3), `generateCopy` (Task 4), `derivePalettes` (Task 2), `renderAll` (Task 6), `findByToken` (Plan 1, `leads.js`).
- Produces:
  - `generateFor(env, token) → Promise<{ok: boolean, grund?: string}>` — **wirft nie**. Setzt `status` und `build_step` in D1 fort.
  - `buildStatus(env, token) → Promise<{state, step, done, total, images?}>` — was `/api/status` liefert.

**Der Riegel:** `generated_at` ist gesetzt → sofort raus. Ein Doppelklick auf den Bestätigungslink darf nicht zwei Browser starten.

**Der Fortschritt ist echt** (Spec §6): `build_step` wird bei jedem Schritt fortgeschrieben, `done` kommt aus den tatsächlich in R2 liegenden Bildern. Ein gefakter Balken spürt man — und genau die Vorfreude ist das Produkt.

- [ ] **Step 0: Konstanten ergänzen** — an `src/constants.js` anhängen

```js
/**
 * Browser Rendering hat eine Grenze fuer gleichzeitige Sessions. Bei Andrang
 * scheitert der erste Versuch und der zweite klappt — ohne Retry verliert sie
 * ihre Bilder, weil zufaellig jemand anders gleichzeitig da war (Spec §9, §11).
 */
export const RENDER_VERSUCHE = 3;
export const RENDER_BACKOFF_MS = 1500;
```

- [ ] **Step 1: Migration schreiben** — `~/social2scale-clients/_portal/migrate-v12.sql`

```sql
-- v12 · Free-Content: echter Fortschritt fuer den Build-Screen
--
-- Der Build-Screen (Plan 3) zeigt keine Spinner, sondern die echten Schritte
-- (Spec §6: "Der Fortschritt ist echt an /api/status gekoppelt, nicht gefaked.
-- Das spuert man."). Dafuer braucht es einen Ort, der den aktuellen Schritt haelt.
--
-- Additiv + idempotent. Ruehrt bestehende Tabellen NICHT an.
-- SQLite kennt kein "ADD COLUMN IF NOT EXISTS"; ein zweiter Lauf meldet
-- "duplicate column name" — das ist erwartet und harmlos.

ALTER TABLE free_leads ADD COLUMN build_step TEXT NOT NULL DEFAULT '';
```

Denselben Block an `schema.sql` (unter dem v10-Kopf) und an `free-content/test/schema.sql` — dort aber **direkt in die Tabellendefinition**, weil die Fixture frisch angelegt wird:

```sql
  build_step    TEXT NOT NULL DEFAULT '',
```

- [ ] **Step 1b: `submissions` in die Test-Fixture** — `free-content/test/schema.sql`

Task 9 spiegelt den Lead in `submissions`, aber die Fixture kennt die Tabelle nicht —
der Test würde garantiert scheitern. Anhängen:

```sql
-- Der CRM-Eingang. Task 9 spiegelt Leads hierher, damit sie ohne neues UI im CRM
-- auftauchen. Hier bewusst OHNE den FOREIGN KEY auf clients: die Fixture kennt
-- keine clients-Tabelle, und der Fremdschluessel ist nicht das, was wir testen.
-- Die produktive Definition steht in _portal/schema.sql und bleibt unberuehrt.
CREATE TABLE IF NOT EXISTS submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL DEFAULT 'briefing',
  client_id  INTEGER,
  name       TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  payload    TEXT DEFAULT '',
  data       TEXT DEFAULT '{}',
  logo_key   TEXT DEFAULT '',
  rating     INTEGER,
  status     TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

⚠️ **Nur in die Fixture.** `_portal/schema.sql` und `migrate-v12.sql` fassen `submissions`
**nicht** an — die Tabelle existiert produktiv seit Langem und trägt echte Kundinnen-Eingänge.

- [ ] **Step 2: Migration lokal prüfen**

```bash
cd ~/social2scale-clients/_portal
npx wrangler d1 execute s2s-crm --local --file=./migrate-v12.sql
```

Erwartung: erfolgreich. **Niemals `--remote`** — die produktive Migration läuft ein Mensch in Task 9.

- [ ] **Step 3: Den fehlschlagenden Test schreiben** — `test/generate.test.js`

```js
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SCHEMA from './schema.sql?raw';
import { splitSchema } from './helpers.js';
import { generateFor, buildStatus } from '../src/generate.js';
import { upsertLead, confirmLead, findByToken } from '../src/leads.js';
import { validateSubmission } from '../src/validate.js';

const BASE = {
  name: 'Dorothea', email: 'do@gmail.com', handle: '@praxisfunke',
  branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen', stimmung: 'ruhig', consent: true,
};
const clean = () => validateSubmission(BASE).value;

async function bestaetigterLead() {
  const { lead } = await upsertLead(env.DB, clean(), '1.1.1.1');
  await confirmLead(env.DB, lead.token);
  return lead.token;
}

beforeEach(async () => {
  for (const t of ['free_leads', 'free_intake_log']) await env.DB.exec(`DROP TABLE IF EXISTS ${t}`);
  for (const s of splitSchema(SCHEMA)) await env.DB.exec(s);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('generateFor', () => {
  it('lehnt einen unbekannten Token ab, ohne zu werfen', async () => {
    const r = await generateFor(env, 'gibtsnicht');
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('not_found');
  });

  it('generiert nicht fuer einen unbestaetigten Lead', async () => {
    const { lead } = await upsertLead(env.DB, clean(), '1.1.1.1');
    const r = await generateFor(env, lead.token);
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('not_confirmed');
  });

  it('laeuft genau EINMAL — generated_at ist der Riegel', async () => {
    const token = await bestaetigterLead();
    await env.DB.prepare("UPDATE free_leads SET generated_at = datetime('now'), status='ready'").run();
    const r = await generateFor(env, token);
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('bereits_erzeugt');
  });

  it('lehnt Themen ab, die unser Logo nicht tragen darf', async () => {
    const { lead } = await upsertLead(env.DB, { ...clean(), ziel: 'heilt Krebs in 4 Wochen' }, '1.1.1.1');
    await confirmLead(env.DB, lead.token);
    const r = await generateFor(env, lead.token);
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('moderation');
    const nach = await findByToken(env.DB, lead.token);
    expect(nach.status).toBe('failed');   // Sackgasse verboten: Status ist ehrlich
  });

  it('alarmiert die Founder bei JEDER Ablehnung — sonst ist der Filter Leadvernichtung', async () => {
    // Der Wortfilter ist bewusst streng (er kann `Drogen-Praevention` nicht von
    // `Drogen-Verkauf` trennen). Das ist NUR vertretbar, weil ein Mensch jede
    // Ablehnung sieht. Faellt der Alarm weg, verschwinden zu Unrecht Abgelehnte
    // lautlos — und niemand erfaehrt es je.
    const { lead } = await upsertLead(env.DB, { ...clean(), ziel: 'heilt Krebs in 4 Wochen' }, '1.1.1.1');
    await confirmLead(env.DB, lead.token);

    const f = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', f);
    await generateFor(
      { ...env, BREVO_API_KEY: 'test-key', NOTIFY_TO: 'info@social2scale.com', NOTIFY_FROM: 'info@social2scale.com' },
      lead.token
    );

    const alarm = f.mock.calls.some((c) => String(c[1]?.body || '').includes('ABGELEHNT'));
    expect(alarm).toBe(true);
  });

  it('setzt bei einem Render-Fehler auf failed statt stillschweigend zu haengen', async () => {
    const token = await bestaetigterLead();
    // Kein BROWSER-Binding im Test -> renderAll wirft.
    const r = await generateFor(env, token);
    expect(r.ok).toBe(false);
    const nach = await findByToken(env.DB, token);
    expect(nach.status).toBe('failed');
  });

  it('gibt beim Rendern nicht nach dem ersten Versuch auf (Spec §9)', async () => {
    // Browser Rendering hat eine Session-Grenze: bei Andrang scheitert Versuch 1
    // und Versuch 2 klappt. Ohne Retry verliert sie ihre Bilder, weil zufaellig
    // jemand anders gleichzeitig da war.
    const token = await bestaetigterLead();
    const fehler = vi.spyOn(console, 'error');
    await generateFor(env, token);
    const renderVersuche = fehler.mock.calls.filter((c) =>
      String(c[0]).includes('Render-Versuch')
    );
    expect(renderVersuche.length).toBeGreaterThanOrEqual(2);
  });

  it('alarmiert die Founder, wenn sie endgueltig nichts bekommt', async () => {
    // Sie hat bestaetigt und geht leer aus. Erfahren WIR das nicht, erfaehrt es
    // niemand — sie meldet sich nicht, sie hoert auf.
    const token = await bestaetigterLead();
    const f = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', f);

    // notifyFounders schickt ohne Key gar nichts — der Test braucht ihn, sonst
    // prueft er nur, dass nichts passiert.
    await generateFor(
      { ...env, BREVO_API_KEY: 'test-key', NOTIFY_TO: 'info@social2scale.com', NOTIFY_FROM: 'info@social2scale.com' },
      token
    );

    const anAlarm = f.mock.calls.some((c) =>
      String(c[1]?.body || '').includes('FEHLGESCHLAGEN')
    );
    expect(anAlarm).toBe(true);
  });
});

describe('buildStatus', () => {
  it('meldet unbekannte Token als not_found', async () => {
    expect((await buildStatus(env, 'gibtsnicht')).state).toBe('not_found');
  });

  it('meldet den echten Stand eines bestaetigten Leads', async () => {
    const token = await bestaetigterLead();
    const s = await buildStatus(env, token);
    expect(s.state).toBe('confirmed');
    expect(s.total).toBe(8);
    expect(s.done).toBe(0);
    expect(typeof s.step).toBe('string');
  });

  it('zaehlt done aus den TATSAECHLICH in R2 liegenden Bildern', async () => {
    const token = await bestaetigterLead();
    await env.IMAGES.put(`free/${token}/f-0-profil.jpg`, 'x');
    await env.IMAGES.put(`free/${token}/f-0-s1.jpg`, 'x');
    const s = await buildStatus(env, token);
    expect(s.done).toBe(2);   // echt gezaehlt, nicht geschaetzt
  });

  it('liefert bei ready die Bild-Keys mit', async () => {
    const token = await bestaetigterLead();
    await env.DB.prepare("UPDATE free_leads SET status='ready', generated_at=datetime('now')").run();
    await env.IMAGES.put(`free/${token}/f-0-profil.jpg`, 'x');
    const s = await buildStatus(env, token);
    expect(s.state).toBe('ready');
    expect(Array.isArray(s.images)).toBe(true);
    expect(s.images.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/generate.test.js
```

Erwartung: FAIL — `src/generate.js` fehlt.

- [ ] **Step 5: Implementierung** — `src/generate.js`

```js
/**
 * Orchestriert die Generierung. Kennt keine Interna — delegiert an
 * moderate/copy/palette/render.
 *
 * WIRFT NIE: sie hat gerade ihre Mail bestaetigt. Jeder Fehler landet in einem
 * ehrlichen Status, damit die Seite ihr sagen kann, was Sache ist (Spec §9).
 */

import { checkInput } from './moderate.js';
import { generateCopy } from './copy.js';
import { derivePalettes } from './palette.js';
import { renderAll } from './render.js';
import { findByToken } from './leads.js';
import { notifyFounders } from './mail.js';
import { FRAME_IDS } from './templates/frames.js';
import { RENDER_VERSUCHE, RENDER_BACKOFF_MS } from './constants.js';

/** Was sie waehrend des Bauens liest. Ehrlich, nicht dekorativ. */
const SCHRITTE = {
  marke:     'Wir lesen deine Marke …',
  texte:     'Deine Texte entstehen …',
  farben:    'Deine Farbwelten entstehen …',
  rendern:   'Wir setzen deinen Feed …',
  fertig:    'Fertig.',
};

/**
 * Retry mit Backoff (Spec §9). Browser Rendering hat eine Grenze fuer gleichzeitige
 * Sessions — bei einem Andrang scheitert der erste Versuch, der zweite klappt.
 * Ohne Retry verliert sie ihre Bilder, weil jemand anders zufaellig gleichzeitig da war.
 */
async function mitRetry(fn) {
  let letzter;
  for (let versuch = 1; versuch <= RENDER_VERSUCHE; versuch++) {
    try {
      return await fn();
    } catch (err) {
      letzter = err;
      console.error(`[generate] Render-Versuch ${versuch}/${RENDER_VERSUCHE} fehlgeschlagen:`, err);
      if (versuch < RENDER_VERSUCHE) {
        await new Promise((r) => setTimeout(r, RENDER_BACKOFF_MS * versuch));
      }
    }
  }
  throw letzter;
}

async function setzeSchritt(db, token, status, step) {
  try {
    await db
      .prepare('UPDATE free_leads SET status = ?, build_step = ? WHERE token = ?')
      .bind(status, step, token)
      .run();
  } catch (err) {
    console.error('[generate] Fortschritt konnte nicht geschrieben werden:', err);
  }
}

/**
 * @returns {Promise<{ok: boolean, grund?: string}>} wirft nie
 */
export async function generateFor(env, token) {
  let lead;
  try {
    lead = await findByToken(env.DB, token);
  } catch (err) {
    console.error('[generate] Lead nicht lesbar:', err);
    return { ok: false, grund: 'db' };
  }

  if (!lead) return { ok: false, grund: 'not_found' };
  if (!lead.confirmed_at) return { ok: false, grund: 'not_confirmed' };
  // Der Riegel: ein Doppelklick auf den Bestaetigungslink darf nicht zwei
  // Browser starten.
  if (lead.generated_at) return { ok: false, grund: 'bereits_erzeugt' };

  const clean = {
    name: lead.name, handle: lead.handle, branche: lead.branche,
    ziel: lead.ziel, stimmung: lead.stimmung, farbe: lead.farbe,
  };

  // Schicht 1 der Marken-Sicherung (Spec §5a): unser Logo, unsere Verantwortung.
  const moderation = checkInput(clean);
  if (!moderation.ok) {
    console.error('[generate] Thema abgelehnt:', moderation.grund, 'Lead', lead.id);
    await setzeSchritt(env.DB, token, 'failed', '');
    // Founder-Alarm (Spec §5a) — und er ist NICHT optional: der Filter ist bewusst
    // streng, weil eine Wortliste `Drogen-Praevention` nicht von `Drogen-Verkauf`
    // trennen kann. Diese Strenge ist nur vertretbar, WEIL ein Mensch jede Ablehnung
    // sieht und sich bei einer zu Unrecht Abgelehnten melden kann. Ohne den Alarm
    // ist der Filter kein strenger Filter, sondern eine stille Leadvernichtung.
    try {
      await notifyFounders(env, lead, `ABGELEHNT (${moderation.grund}) — bitte pruefen`);
    } catch (err) {
      console.error('[generate] Founder-Alarm zur Ablehnung ging nicht raus:', err);
    }
    return { ok: false, grund: 'moderation' };
  }

  try {
    await setzeSchritt(env.DB, token, 'building', SCHRITTE.marke);

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.texte);
    const copy = await generateCopy(env, clean);   // wirft nie, faellt zurueck

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.farben);
    const palettes = derivePalettes(lead.stimmung, lead.farbe);

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.rendern);
    await mitRetry(() => renderAll(env, token, clean, copy, palettes));

    await env.DB
      .prepare("UPDATE free_leads SET status='ready', build_step=?, generated_at=datetime('now'), r2_prefix=? WHERE token=?")
      .bind(SCHRITTE.fertig, `free/${token}/`, token)
      .run();

    return { ok: true };
  } catch (err) {
    // Nie still: ihre Stille verraet uns nichts, dieser Log schon.
    console.error('[generate] Generierung endgueltig fehlgeschlagen, Lead', lead.id, err);
    await setzeSchritt(env.DB, token, 'failed', '');
    // Founder-Alarm (Spec §9): sie hat bestaetigt und bekommt nichts. Wenn WIR das
    // nicht erfahren, erfaehrt es niemand — sie meldet sich nicht, sie hoert auf.
    try {
      await notifyFounders(env, lead, 'GENERIERUNG FEHLGESCHLAGEN');
    } catch (mailErr) {
      console.error('[generate] Founder-Alarm ging auch nicht raus:', mailErr);
    }
    return { ok: false, grund: 'render' };
  }
}

/**
 * Treibt den Build-Screen. `done` wird aus den TATSAECHLICH in R2 liegenden
 * Bildern gezaehlt — ein geschaetzter Balken ist ein geloger Balken.
 */
export async function buildStatus(env, token) {
  const lead = await findByToken(env.DB, token);
  if (!lead) return { state: 'not_found', step: '', done: 0, total: FRAME_IDS.length };

  let done = 0;
  let images = [];
  try {
    const liste = await env.IMAGES.list({ prefix: `free/${token}/`, limit: 20 });
    images = (liste.objects || []).map((o) => o.key).sort();
    done = images.length;
  } catch (err) {
    console.error('[generate] R2 nicht lesbar:', err);
  }

  const basis = { state: lead.status, step: lead.build_step || '', done, total: FRAME_IDS.length };
  return lead.status === 'ready' ? { ...basis, images } : basis;
}
```

- [ ] **Step 6: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/generate.test.js && npm test
```

Erwartung: PASS (9 neue Tests), bestehende grün.

- [ ] **Step 7: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/generate.js free-content/test/generate.test.js free-content/test/schema.sql
git commit -m "feat(free-content): Generierung orchestrieren, genau einmal, mit echtem Fortschritt"
```

**An Sebi melden:** `migrate-v12.sql` liegt ungesichert in `~/social2scale-clients/_portal/` (kein Git). Produktiv-Migration erst mit Task 9.

---

### Task 8: Verdrahten — Generierung, Status, Bilder

**Files:**
- Modify: `~/social2scale-site/free-content/src/index.js`
- Modify: `~/social2scale-site/free-content/test/api.test.js`

**Interfaces:**
- Consumes: `generateFor`, `buildStatus` (Task 7).
- Produces:
  - `GET /c/:token` — startet die Generierung via `ctx.waitUntil`, redirected **sofort** (bestehendes Verhalten aus Plan 1 bleibt).
  - `GET /api/status/:token` → JSON aus `buildStatus`.
  - `GET /img/:token/:name.jpg` → das Bild aus R2.

**Warum `waitUntil`:** Claude plus 8 Renderings dauern 20–40 s. Blockierend wäre das ein Timeout-Risiko. Als Live-Build ist die Zeit das Feature (Spec §6) — der Build-Screen aus Plan 3 hängt an `/api/status`.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/api.test.js` anhängen

`env`, `SELF`, `describe`, `it`, `expect`, `beforeEach` sind oben schon importiert — **nicht erneut importieren**, das ist ein SyntaxError.

```js
describe('GET /api/status/:token', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, TABELLEN);
  });

  it('meldet unbekannte Token, ohne zu kippen', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/status/gibtsnicht');
    expect(res.status).toBe(200);
    expect((await res.json()).state).toBe('not_found');
  });

  it('liefert den Stand mit echtem Zaehler', async () => {
    await post(GUELTIG);
    const { token } = await env.DB.prepare('SELECT token FROM free_leads').first();
    const s = await (await SELF.fetch(`https://start.social2scale.com/api/status/${token}`)).json();
    expect(s.total).toBe(8);
    expect(s.done).toBe(0);
    expect(s).toHaveProperty('step');
  });
});

describe('GET /img/:token/:name', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, TABELLEN);
  });

  it('liefert ein abgelegtes Bild aus', async () => {
    await env.IMAGES.put('free/abc123/f-0-profil.jpg', 'BILD');
    const res = await SELF.fetch('https://start.social2scale.com/img/abc123/f-0-profil.jpg');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('image/jpeg');
  });

  it('meldet fehlende Bilder als 404 statt zu kippen', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/img/abc123/gibtsnicht.jpg');
    expect(res.status).toBe(404);
  });

  it('laesst niemanden aus dem eigenen Ordner ausbrechen', async () => {
    await env.IMAGES.put('free/geheim/f-0-profil.jpg', 'FREMD');
    const res = await SELF.fetch('https://start.social2scale.com/img/abc/..%2F..%2Fgeheim%2Ff-0-profil.jpg');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: FAIL — die Routen liefern 404 bzw. es gibt keinen `state`.

- [ ] **Step 3: Implementierung** — in `src/index.js`

Import ergänzen:

```js
import { generateFor, buildStatus } from './generate.js';
import { r2Key } from './render.js';
```

`handleConfirm` bekommt `ctx` und startet die Generierung:

```js
async function handleConfirm(token, env, ctx) {
  let res;
  try {
    res = await confirmLead(env.DB, token);
  } catch (err) {
    console.error('[confirm] Bestaetigung fehlgeschlagen:', err);
    return htmlPage(CONFIRM_FEHLER.not_found.title, CONFIRM_FEHLER.not_found.body);
  }

  if (!res.ok) {
    const fehler = CONFIRM_FEHLER[res.reason] ?? CONFIRM_FEHLER.not_found;
    return htmlPage(fehler.title, fehler.body);
  }

  // Nicht blockieren: Claude + 8 Renderings dauern 20-40 s. Sie sieht sofort den
  // Build-Screen, der Fortschritt kommt ueber /api/status (Spec §6).
  ctx.waitUntil(
    generateFor(env, token).then((r) => {
      if (!r.ok) console.error('[confirm] Generierung nicht gelaufen:', r.grund, token);
    })
  );

  return new Response(null, { status: 302, headers: { Location: `/r/${token}` } });
}
```

Im Router den Aufruf anpassen und die zwei Routen ergänzen:

```js
    const confirmMatch = url.pathname.match(/^\/c\/([a-f0-9]{8,128})$/);
    if (confirmMatch) return handleConfirm(confirmMatch[1], env, ctx);
```

```js
    const statusMatch = url.pathname.match(/^\/api\/status\/([a-f0-9]{8,128})$/);
    if (statusMatch) {
      try {
        return json(await buildStatus(env, statusMatch[1]), 200, cors);
      } catch (err) {
        console.error('[status] Stand nicht lesbar:', err);
        return json({ ok: false, error: 'backend' }, 503, cors);
      }
    }

    // Bilder. r2Key saeubert Token und Namen — niemand bricht aus seinem Ordner aus.
    const imgMatch = url.pathname.match(/^\/img\/([a-f0-9]{8,128})\/([a-zA-Z0-9_-]+)\.jpg$/);
    if (imgMatch) {
      try {
        const obj = await env.IMAGES.get(r2Key(imgMatch[1], imgMatch[2]));
        if (!obj) return new Response('Nicht gefunden', { status: 404 });
        return new Response(obj.body, {
          headers: {
            'Content-Type': 'image/jpeg',
            // Bilder aendern sich nach dem Rendern nie — ein Jahr ist ehrlich.
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (err) {
        console.error('[img] Bild nicht lesbar:', err);
        return new Response('Nicht gefunden', { status: 404 });
      }
    }
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npm test
```

Erwartung: PASS (5 neue Tests), bestehende grün.

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/index.js free-content/test/api.test.js
git commit -m "feat(free-content): Generierung an /c/ haengen + Status- und Bild-Routen"
```

---

### Task 9: CRM-Spiegel + Founder-Mail

**Files:**
- Modify: `~/social2scale-site/free-content/src/generate.js`
- Modify: `~/social2scale-site/free-content/src/mail.js`
- Test: `~/social2scale-site/free-content/test/generate.test.js`

**Interfaces:**
- Consumes: `notifyFounders` (Plan 1, `mail.js`).
- Produces: `mirrorToCrm(db, lead) → Promise<void>` in `generate.js` — schreibt eine `submissions`-Zeile `type='free_content'`.

**Warum ohne neue UI:** Das CRM zeigt `submissions` bereits an. Eine Zeile dort → der Lead **taucht automatisch im Eingang auf**. Kein Verdrahten, kein Deploy des CRM.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/generate.test.js` anhängen

```js
import { mirrorToCrm } from '../src/generate.js';

describe('mirrorToCrm', () => {
  it('legt eine Zeile an, die im CRM-Eingang auftaucht', async () => {
    const token = await bestaetigterLead();
    const lead = await findByToken(env.DB, token);
    await mirrorToCrm(env.DB, lead);

    const row = await env.DB.prepare("SELECT * FROM submissions WHERE type='free_content'").first();
    expect(row).toBeTruthy();
    expect(row.email).toBe(lead.email);
    expect(row.name).toBe(lead.name);
    expect(row.payload).toContain(lead.branche);
    expect(row.payload).toContain(lead.handle);
    expect(row.status).toBe('new');   // sonst sieht es niemand
  });

  it('kippt die Generierung nicht, wenn der Spiegel scheitert', async () => {
    const token = await bestaetigterLead();
    const lead = await findByToken(env.DB, token);
    await env.DB.exec('DROP TABLE submissions');
    await expect(mirrorToCrm(env.DB, lead)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/generate.test.js
```

Erwartung: FAIL — `mirrorToCrm` ist keine Funktion.

- [ ] **Step 3: Implementierung** — an `src/generate.js` anhängen

```js
/**
 * Spiegelt den Lead als submissions-Zeile ins CRM.
 *
 * Kein neues UI noetig: das CRM zeigt submissions bereits an — die Zeile taucht
 * automatisch im Eingang auf. Non-fatal: ein kaputter Spiegel darf ihre fertigen
 * Bilder nicht kosten.
 */
export async function mirrorToCrm(db, lead) {
  const md =
    '# Free-Content-Lead\n\n' +
    `- **Instagram:** @${lead.handle}\n` +
    `- **Thema:** ${lead.branche}\n` +
    `- **Ziel:** ${lead.ziel}\n` +
    `- **Stimmung:** ${lead.stimmung}\n` +
    (lead.farbe ? `- **Wunschfarbe:** ${lead.farbe}\n` : '') +
    (lead.source ? `- **Kam über:** ${lead.source}\n` : '') +
    `- **Bilder:** ${lead.r2_prefix || '(noch keine)'}\n`;

  try {
    await db
      .prepare(
        "INSERT INTO submissions (type, name, email, payload, data, status) VALUES ('free_content', ?, ?, ?, ?, 'new')"
      )
      .bind(
        lead.name,
        lead.email,
        md,
        JSON.stringify({
          handle: lead.handle, branche: lead.branche, ziel: lead.ziel,
          stimmung: lead.stimmung, farbe: lead.farbe, source: lead.source,
          token: lead.token, r2_prefix: lead.r2_prefix,
        })
      )
      .run();
  } catch (err) {
    console.error('[generate] CRM-Spiegel fehlgeschlagen, Lead', lead.id, err);
  }
}
```

- [ ] **Step 4: In `generateFor` einhängen** — direkt vor `return { ok: true }`

```js
    const fertig = await findByToken(env.DB, token);
    await mirrorToCrm(env.DB, fertig);
    await notifyFounders(env, fertig, 'ready');

    return { ok: true };
```

`notifyFounders` ist bereits in Task 7 importiert (für den Fehler-Alarm) — **kein zweiter
Import**, das wäre eine doppelte Deklaration und damit ein SyntaxError.

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

```bash
npm test
```

Erwartung: PASS (2 neue Tests), bestehende grün.

- [ ] **Step 6: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/generate.js free-content/test/generate.test.js
git commit -m "feat(free-content): Lead ins CRM spiegeln + Founder-Mail"
```

---

### Task 10: Coverage + das Beweis-Gate

**Files:**
- Create: `~/social2scale-site/free-content/test/gate-plan2.sh`

**Kontext:** Bis hier ist alles lokal bewiesen — **außer dem einen, was nicht in Miniflare läuft: Browser Rendering.** Das ist der Kern von Plan 2 und braucht die echte Instanz.

- [ ] **Step 1: Coverage prüfen**

```bash
cd ~/social2scale-site/free-content && npm run coverage
```

Erwartung: alle Schwellen erreicht (80/70/80/80). Falls nicht — **Tests ergänzen, nicht Schwellen senken.**

- [ ] **Step 2: Produktiv-Migration (nach Sebis Go)**

```bash
cd ~/social2scale-clients/_portal
npx wrangler d1 execute s2s-crm --remote --file=./migrate-v12.sql
```

Erwartung: erfolgreich. Prüfen, dass die Spalte da ist und nichts verloren ging:

```bash
npx wrangler d1 execute s2s-crm --remote --command="SELECT COUNT(*) AS leads FROM free_leads"
```

- [ ] **Step 3: Secrets + Deploy**

```bash
cd ~/social2scale-site/free-content
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

- [ ] **Step 4: Gate-Skript anlegen** — `test/gate-plan2.sh`

```bash
#!/usr/bin/env bash
# Beweis-Gate Plan 2 gegen die LIVE-Instanz.
# Das Einzige, was lokal nicht beweisbar ist: Browser Rendering.
set -uo pipefail

BASE="${1:-https://start.social2scale.com}"
FAILED=0

pruefe() {
  if [ "$2" = "$3" ]; then echo "  OK   $1"; else echo "  FAIL $1 — erwartet $2, war $3"; FAILED=1; fi
}

echo "== Plan-2-Gate =="

HEALTH="$(curl -s "$BASE/api/health")"
case "$HEALTH" in
  *'"turnstile":true'*) echo "  OK   Turnstile scharf" ;;
  *) echo "  FAIL Turnstile-Secret fehlt"; FAILED=1 ;;
esac

pruefe "unbekannter Status-Token -> 200" "200" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/status/deadbeefdeadbeef")"

pruefe "fehlendes Bild -> 404" "404" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/img/deadbeefdeadbeef/f-0-profil.jpg")"

if [ "$FAILED" -eq 0 ]; then echo "== Gate GRUEN =="; else echo "== Gate ROT =="; exit 1; fi
```

- [ ] **Step 5: Gate laufen lassen**

```bash
cd ~/social2scale-site/free-content && bash test/gate-plan2.sh
```

Erwartung: `== Gate GRUEN ==`

- [ ] **Step 6: Der eigentliche Beweis — echte Bilder**

Einen echten Lead durchziehen (Formular mit Turnstile im Browser, Mail bestätigen), dann:

```bash
cd ~/social2scale-clients/_portal
npx wrangler d1 execute s2s-crm --remote --command="SELECT token, status, build_step, generated_at FROM free_leads ORDER BY id DESC LIMIT 1"
```

Erwartung: `status='ready'`, `generated_at` gesetzt.

```bash
cd ~/social2scale-site/free-content
npx wrangler r2 object get s2s-free/free/<TOKEN>/f-0-profil.jpg --file=/tmp/beweis.jpg
python3 -c "from PIL import Image; im=Image.open('/tmp/beweis.jpg'); print('Format:', im.size)"
```

Erwartung: `(1080, 1350)`.

**Und dann das Bild wirklich ansehen.** Prüfen: Steht ihr Handle drauf? Ist die Sperre da? Sieht es aus wie `design/pb-hell.png`? Ein Bild mit den richtigen Maßen kann trotzdem in der falschen Schrift gerendert sein — das sieht nur ein Mensch.

- [ ] **Step 7: Testdaten aufräumen**

```bash
npx wrangler d1 execute s2s-crm --remote --command="SELECT id, email, handle FROM free_leads WHERE email LIKE '%@example.%' OR source='test'"
```

**Erst ansehen, dann löschen** — die DB ist produktiv. (Lesson 02.07.: beim Cleanup wurde versehentlich eine echte Zeile mitgelöscht.)

- [ ] **Step 8: Commit + Push**

```bash
cd ~/social2scale-site
git add free-content/test/gate-plan2.sh
git commit -m "test(free-content): Live-Beweis-Gate Plan 2"
git push
```

---

## Definition of Done (Plan 2)

- [ ] `npm test` grün, Coverage ≥ 80 %
- [ ] `bash test/gate-plan2.sh` → `Gate GRUEN`
- [ ] Ein echter Lead erzeugt **8 Bilder** in R2, alle **1080×1350**
- [ ] Ein Bild **mit Augen geprüft**: ihr Handle drauf, Sperre da, Look B in der richtigen Schrift
- [ ] `generated_at` verhindert eine zweite Generierung (Doppelklick auf den Link)
- [ ] Moderation lehnt ein Heilversprechen ab und setzt `failed` statt zu hängen
- [ ] Claude-Ausfall → Fallback-Texte, keine kaputte Seite
- [ ] **Render-Fehler wird bis zu 3× wiederholt** (Spec §9) — ein Andrang darf ihr nicht die Bilder kosten
- [ ] **Endgültiger Fehlschlag alarmiert die Founder** — ihre Stille verrät uns nichts
- [ ] Lead taucht im CRM-Eingang auf (`submissions.type='free_content'`)
- [ ] Bestehende CRM-Tabellen unverändert (`submissions` wird NUR gelesen/beschrieben, nie geändert)

## Was NICHT in diesem Plan ist

Formular, Build-Screen, Reveal, Look-Switcher, CTAs, `/free`-Redirect, OG-Card, `/datenschutz/`-Erweiterung, E-Mail-Tippfehler-Vorschlag, „Nochmal schicken"-Knopf. **Das ist Plan 3.**

Ebenso: die Karussell-Dramaturgie über drei verschiedene Slides (Problem spiegeln → Reframe → CTA). Für den Vorgeschmack tragen alle drei denselben Text mit korrektem Zähler — Plan 3 entscheidet, ob es mehr braucht.
</content>
