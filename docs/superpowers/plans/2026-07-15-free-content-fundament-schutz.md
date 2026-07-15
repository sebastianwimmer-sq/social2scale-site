# Free-Content-Funnel · Plan 1 — Fundament & Schutz-Stack

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein gehärteter, öffentlicher Lead-Eingang mit Double-Opt-in, der bewiesenermaßen keine Bots und keine Duplikate durchlässt — und dabei keinen echten Interessenten aussperrt.

**Architecture:** Neuer Cloudflare-Worker `s2s-free-content` in `~/social2scale-site/free-content/`, der sich die bestehende D1 `s2s-crm` mit dem CRM teilt. Reine Funktionen (Normalisierung, Validierung) sind bindings-frei und einzeln testbar; der Router kennt keine Interna. Am Ende dieses Plans kann jemand ein Formular absenden, bekommt eine Bestätigungsmail, klickt sie — und der Lead steht als `confirmed` in D1. **Bilder kommen in Plan 2.**

**Tech Stack:** Cloudflare Workers · D1 (SQLite) · Vitest + `@cloudflare/vitest-pool-workers` (echte lokale D1 im Test) · Brevo (Mail) · Cloudflare Turnstile

**Spec:** `~/social2scale-clients/docs/free-content-funnel-spec.md` — bei Widersprüchen gewinnt die Spec.

## Global Constraints

- **Sprache:** Alle nutzersichtbaren Texte auf **Deutsch**. Code, Kommentare und Commits auf Deutsch oder Englisch, aber konsistent pro Datei.
- **Dateigröße:** Jede Datei < 400 Zeilen. Keine Datei kennt die Interna einer anderen.
- **Immutability:** Niemals Objekte mutieren — immer neue erzeugen (`{...alt, feld: neu}`). Siehe `coding-style.md`.
- **Keine Secrets im Code.** `BREVO_API_KEY`, `TURNSTILE_SECRET` ausschließlich via `wrangler secret put`.
- **Fehler nie still schlucken.** Jeder `catch` loggt mindestens `console.error`. (Lesson 02.07.: ein geschluckter Catch hat das ganze CRM auf Demo-Daten geworfen.)
- **Keine Magic Numbers.** Schwellen als benannte Konstanten.
- **Coverage:** ≥ 80 % auf `src/`.
- **Test-Gate:** Ohne grüne Tests aus Task 12 startet Plan 2 nicht (Sebi: „muss alles geproved werden").
- **D1 ist PRODUKTIV.** Die geteilte `s2s-crm` enthält echte Kundinnendaten. Migrationen sind additiv und idempotent — **niemals** `DROP`, `ALTER ... DROP COLUMN` oder Änderungen an bestehenden Tabellen.
- **Zeitspalten:** TEXT im ISO-8601-Format, wie überall im bestehenden Schema.

### Feste Werte (verbatim aus der Spec / dem Bestand)

| Wert | Inhalt |
|---|---|
| D1 `database_name` | `s2s-crm` |
| D1 `database_id` | `ddb630bc-a9c8-48ba-95bd-9c3843d0846e` |
| Worker-Name | `s2s-free-content` |
| Hostname (Ziel) | `start.social2scale.com` |
| Erlaubter Origin | `https://social2scale.com` |
| Token-Gültigkeit | 24 Stunden |
| Resend-Deckel | max. 3 pro Lead und Stunde |
| TTL unbestätigter Leads | 30 Tage |
| Mindest-Ausfüllzeit | 1500 ms (wie `anfrage-worker.js`) |
| Brevo Founder-Mail | `NOTIFY_TO` = `info@social2scale.com` |

---

## File Structure

```
~/social2scale-site/free-content/
├── package.json              Vitest + wrangler (nur hier, Site bleibt unberührt)
├── vitest.config.js          vitest-pool-workers, echte lokale D1
├── wrangler.toml             Bindings + vars (KEINE Secrets)
├── src/
│   ├── index.js              Router — kennt keine Interna
│   ├── validate.js           normalizeEmail · normalizeHandle · validateSubmission
│   ├── disposable.js         Wegwerf-Domain-Liste (reine Daten)
│   ├── leads.js              D1: Wiedereintritt, Token, Status
│   ├── protect.js            Turnstile · Honeypot · elapsed · MX · Rate-Limit
│   ├── mail.js               Brevo
│   └── constants.js          Alle Schwellen/TTLs an einem Ort
└── test/
    ├── validate.test.js
    ├── leads.test.js
    └── api.test.js           Das Beweis-Gate (§10 der Spec)
```

**Verantwortungs-Schnitt:** `validate.js` ist rein (keine Bindings, keine I/O) → trivial testbar. `leads.js` ist der einzige Ort, der `free_leads` kennt. `protect.js` entscheidet nur ja/nein und kennt keine Leads. `index.js` verdrahtet, mehr nicht.

**Cross-Repo:** Die Migration gehört ins CRM-Repo (`~/social2scale-clients/_portal/`), weil dort der Schema-SSoT liegt — siehe Task 4.

---

### Task 0: Blocker-Check, Branch, Gerüst

Phase 0 der Spec. **Wenn das `BROWSER`-Binding fehlt, ist Plan 2 hinfällig** — das muss man vor dem Bauen wissen, nicht danach. Der Rest dieses Plans läuft auch ohne, aber der Befund gehört an Sebi gemeldet.

**Files:**
- Create: `~/social2scale-site/free-content/package.json`
- Create: `~/social2scale-site/free-content/wrangler.toml`
- Create: `~/social2scale-site/free-content/vitest.config.js`
- Create: `~/social2scale-site/free-content/src/index.js`
- Create: `~/social2scale-site/free-content/test/api.test.js`
- Create: `~/social2scale-site/free-content/.gitignore`

**Interfaces:**
- Produces: Worker mit `GET /api/health` → `{ok:true}`. Alle späteren Tasks hängen daran.

- [ ] **Step 1: Branch anlegen** (nie direkt auf `main`)

```bash
cd ~/social2scale-site
git checkout -b feat/free-content-funnel
```

- [ ] **Step 2: BROWSER-Binding-Verfügbarkeit prüfen (BLOCKER)**

```bash
npx wrangler browser-rendering --help 2>&1 | head -20
```

Erwartung: Hilfe-Text statt „unknown command". Zusätzlich im Dashboard prüfen, ob **Workers Paid** aktiv ist (Browser Rendering ist dort gebunden).

**Wenn nicht verfügbar:** Diesen Plan trotzdem komplett durchziehen (er braucht kein Browser Rendering), aber **Sebi vor Plan 2 informieren** — dann muss der Render-Weg neu entschieden werden.

- [ ] **Step 3: `package.json` anlegen**

```json
{
  "name": "s2s-free-content",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "vitest": "^2.1.0",
    "wrangler": "^4.90.0"
  }
}
```

- [ ] **Step 4: `.gitignore` anlegen**

```
node_modules/
.wrangler/
coverage/
```

- [ ] **Step 5: `wrangler.toml` anlegen** — Secrets stehen bewusst NICHT hier

```toml
name = "s2s-free-content"
main = "src/index.js"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ALLOW_ORIGIN  = "https://social2scale.com"
NOTIFY_TO     = "info@social2scale.com"
NOTIFY_FROM   = "info@social2scale.com"
PUBLIC_ORIGIN = "https://start.social2scale.com"

# Geteilt mit dem CRM — dieselbe DB, damit Leads in den CRM-Eingängen landen.
[[d1_databases]]
binding = "DB"
database_name = "s2s-crm"
database_id = "ddb630bc-a9c8-48ba-95bd-9c3843d0846e"

# Secrets via CLI (NICHT hier eintragen):
#   npx wrangler secret put BREVO_API_KEY
#   npx wrangler secret put TURNSTILE_SECRET
```

- [ ] **Step 6: `vitest.config.js` anlegen**

```js
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // Lokale D1 im Test — die produktive DB wird NIE angefasst.
          d1Databases: { DB: 'test-db' },
        },
      },
    },
  },
});
```

- [ ] **Step 7: Den fehlschlagenden Test schreiben** — `test/api.test.js`

> **WICHTIG für alle folgenden Tasks:** An diese Datei wird in Task 6–10 nur *angehängt*.
> Diese Import-Zeilen decken **alles** ab, was später gebraucht wird — spätere Tasks
> importieren aus `cloudflare:test` und `vitest` **nicht erneut**. Ein zweites
> `import { env } from 'cloudflare:test'` ist ein `SyntaxError` (doppelte Deklaration) und
> legt die ganze Datei lahm. Nur Importe aus `../src/*` kommen neu dazu.
>
> ⚠️ **Kein `node:fs`.** Der Test-Body läuft in **workerd**, nicht in Node —
> `readFileSync` ist dort hart gestubbt und wirft immer. Das Schema wird per Vite-`?raw`
> geladen (siehe Task 7). In Task 5 live aufgelaufen, hier korrigiert.

```js
import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';

describe('health', () => {
  it('antwortet mit ok', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 8: Test laufen lassen, Fehlschlag bestätigen**

```bash
cd ~/social2scale-site/free-content && npm install && npm test
```

Erwartung: FAIL — `src/index.js` existiert nicht bzw. exportiert keinen Handler.

- [ ] **Step 9: Minimale Implementierung** — `src/index.js`

```js
/**
 * s2s Free-Content-Funnel — Router.
 * Kennt keine Interna: delegiert an validate/protect/leads/mail.
 */

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return json({ ok: true });

    return json({ ok: false, error: 'not_found' }, 404);
  },
};
```

- [ ] **Step 10: Test laufen lassen, Erfolg bestätigen**

```bash
npm test
```

Erwartung: PASS (1 Test).

- [ ] **Step 11: Commit**

```bash
cd ~/social2scale-site
git add free-content/
git commit -m "feat(free-content): Worker-Geruest + Vitest mit lokaler D1"
```

---

### Task 1: `normalizeEmail` — der Duplikat-Schutz steht und fällt hiermit

`sebi@gmail.com`, `s.e.b.i@gmail.com`, `sebi+neu@gmail.com` und `sebi@googlemail.com` sind **dieselbe Adresse**. Ohne diese Funktion läuft der ganze Duplikat-Schutz ins Leere. Bei Nicht-Gmail-Providern sind Punkte dagegen **signifikant** — `a.b@firma.de` ≠ `ab@firma.de`. Wer das verwechselt, verschmilzt fremde Menschen zu einem Lead.

**Files:**
- Create: `~/social2scale-site/free-content/src/validate.js`
- Test: `~/social2scale-site/free-content/test/validate.test.js`

**Interfaces:**
- Produces: `normalizeEmail(raw: string) → string` — kleingeschriebener Schlüssel, oder `''` wenn syntaktisch ungültig. Wird von `leads.js` (Task 5) als `email_norm` genutzt.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — `test/validate.test.js`

```js
import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '../src/validate.js';

describe('normalizeEmail', () => {
  it('trimmt und schreibt klein', () => {
    expect(normalizeEmail('  Sebi@Firma.DE ')).toBe('sebi@firma.de');
  });

  it('entfernt bei Gmail die Punkte im lokalen Teil', () => {
    expect(normalizeEmail('s.e.b.i@gmail.com')).toBe('sebi@gmail.com');
  });

  it('schneidet +Tags ab', () => {
    expect(normalizeEmail('sebi+neu@gmail.com')).toBe('sebi@gmail.com');
  });

  it('behandelt googlemail wie gmail', () => {
    expect(normalizeEmail('s.ebi+x@googlemail.com')).toBe('sebi@gmail.com');
  });

  it('laesst Punkte bei Nicht-Gmail signifikant', () => {
    expect(normalizeEmail('a.b@firma.de')).toBe('a.b@firma.de');
    expect(normalizeEmail('a.b@firma.de')).not.toBe(normalizeEmail('ab@firma.de'));
  });

  it('schneidet +Tags auch bei Nicht-Gmail ab', () => {
    expect(normalizeEmail('a.b+shop@firma.de')).toBe('a.b@firma.de');
  });

  it('gibt bei Unsinn einen leeren String zurueck', () => {
    for (const bad of ['', '   ', 'keinAt', '@firma.de', 'sebi@', null, undefined, 'a@b@c']) {
      expect(normalizeEmail(bad)).toBe('');
    }
  });

  it('alle vier Gmail-Schreibweisen ergeben denselben Schluessel', () => {
    const keys = new Set([
      normalizeEmail('sebi@gmail.com'),
      normalizeEmail('S.E.B.I@gmail.com'),
      normalizeEmail('sebi+neu@gmail.com'),
      normalizeEmail('se.bi+a+b@googlemail.com'),
    ]);
    expect(keys.size).toBe(1);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
cd ~/social2scale-site/free-content && npx vitest run test/validate.test.js
```

Erwartung: FAIL — `normalizeEmail is not a function` / Modul fehlt.

- [ ] **Step 3: Minimale Implementierung** — `src/validate.js`

```js
/**
 * Reine Validierungs- und Normalisierungsfunktionen.
 * Keine Bindings, kein I/O — damit trivial testbar.
 */

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Bildet alle Schreibweisen derselben Adresse auf EINEN Schluessel ab.
 * Gibt '' zurueck, wenn die Adresse syntaktisch unbrauchbar ist.
 */
export function normalizeEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email || (email.match(/@/g) || []).length !== 1) return '';

  const at = email.indexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain || !domain.includes('.')) return '';
  if (domain.startsWith('.') || domain.endsWith('.')) return '';

  const withoutTag = local.split('+')[0];
  if (!withoutTag) return '';

  const isGmail = GMAIL_DOMAINS.has(domain);
  // Punkte NUR bei Gmail entfernen — anderswo sind sie signifikant.
  const localNorm = isGmail ? withoutTag.replace(/\./g, '') : withoutTag;
  const domainNorm = isGmail ? 'gmail.com' : domain;
  if (!localNorm) return '';

  return `${localNorm}@${domainNorm}`;
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/validate.test.js
```

Erwartung: PASS (8 Tests).

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/validate.js free-content/test/validate.test.js
git commit -m "feat(free-content): normalizeEmail (Gmail-Punkte/+Tags) mit Tests"
```

---

### Task 2: `normalizeHandle`

Zweiter Duplikat-Schlüssel: Sonst holt sich derselbe Instagram-Account mit zwei Mailadressen zwei Pakete. Menschen tippen den Handle in jeder erdenklichen Form — `@Name`, `Name`, die halbe Profil-URL.

**Files:**
- Modify: `~/social2scale-site/free-content/src/validate.js`
- Test: `~/social2scale-site/free-content/test/validate.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `normalizeHandle(raw: string) → string` — Handle ohne `@`, kleingeschrieben, oder `''` wenn ungültig. Wird `handle_norm` in `leads.js` (Task 5).

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/validate.test.js` anhängen

```js
import { normalizeHandle } from '../src/validate.js';

describe('normalizeHandle', () => {
  it('entfernt das fuehrende @ und schreibt klein', () => {
    expect(normalizeHandle('@Sebi.Wimmer')).toBe('sebi.wimmer');
  });

  it('akzeptiert den nackten Handle', () => {
    expect(normalizeHandle('  sebi_wimmer  ')).toBe('sebi_wimmer');
  });

  it('zieht den Handle aus einer Profil-URL', () => {
    expect(normalizeHandle('https://www.instagram.com/sebi.wimmer/')).toBe('sebi.wimmer');
    expect(normalizeHandle('instagram.com/sebi.wimmer?igsh=abc')).toBe('sebi.wimmer');
  });

  it('alle Schreibweisen ergeben denselben Schluessel', () => {
    const keys = new Set([
      normalizeHandle('@Sebi.Wimmer'),
      normalizeHandle('sebi.wimmer'),
      normalizeHandle('https://instagram.com/Sebi.Wimmer/'),
    ]);
    expect(keys.size).toBe(1);
  });

  it('gibt bei ungueltigen Handles einen leeren String zurueck', () => {
    // IG erlaubt nur a-z 0-9 . _ und maximal 30 Zeichen.
    for (const bad of ['', '   ', 'hat leerzeichen', 'ümlaut', 'a'.repeat(31), '@@', null, undefined]) {
      expect(normalizeHandle(bad)).toBe('');
    }
  });

  it('akzeptiert genau 30 Zeichen', () => {
    expect(normalizeHandle('a'.repeat(30))).toBe('a'.repeat(30));
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/validate.test.js
```

Erwartung: FAIL — `normalizeHandle is not a function`.

- [ ] **Step 3: Minimale Implementierung** — an `src/validate.js` anhängen

```js
const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

/**
 * Bildet '@Name', 'name' und eine Profil-URL auf EINEN Schluessel ab.
 * Gibt '' zurueck, wenn kein gueltiger Instagram-Handle erkennbar ist.
 */
export function normalizeHandle(raw) {
  let handle = String(raw ?? '').trim().toLowerCase();
  if (!handle) return '';

  const fromUrl = handle.match(/instagram\.com\/([^/?#\s]+)/);
  if (fromUrl) handle = fromUrl[1];

  handle = handle.replace(/^@+/, '').replace(/[/?#].*$/, '').trim();
  if (!HANDLE_PATTERN.test(handle)) return '';

  return handle;
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/validate.test.js
```

Erwartung: PASS (14 Tests gesamt).

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/validate.js free-content/test/validate.test.js
git commit -m "feat(free-content): normalizeHandle (@/URL/Casing) mit Tests"
```

---

### Task 3: Wegwerf-Mail-Liste + Feld-Validierung

Schicht 5 der Spec. Der Duplikat-Schutz hängt an der E-Mail — wer beliebig viele Wegwerf-Adressen nutzt, umgeht ihn.

**Files:**
- Create: `~/social2scale-site/free-content/src/disposable.js`
- Create: `~/social2scale-site/free-content/src/constants.js`
- Modify: `~/social2scale-site/free-content/src/validate.js`
- Test: `~/social2scale-site/free-content/test/validate.test.js`

**Interfaces:**
- Consumes: `normalizeEmail`, `normalizeHandle` (Tasks 1–2).
- Produces:
  - `isDisposable(email: string) → boolean`
  - `validateSubmission(input: object) → { ok: boolean, error?: string, value?: CleanLead }`
  - `CleanLead = { name, email, emailNorm, handle, handleNorm, branche, ziel, stimmung, farbe, consent, source }` — alle Strings, `consent` ist `boolean`. Task 9 reicht `value` an `leads.js` weiter.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/validate.test.js` anhängen

```js
import { isDisposable, validateSubmission } from '../src/validate.js';

describe('isDisposable', () => {
  it('erkennt bekannte Wegwerf-Domains', () => {
    expect(isDisposable('a@mailinator.com')).toBe(true);
    expect(isDisposable('a@10minutemail.com')).toBe(true);
    expect(isDisposable('A@Mailinator.COM')).toBe(true);
  });

  it('laesst echte Provider durch', () => {
    expect(isDisposable('a@gmail.com')).toBe(false);
    expect(isDisposable('a@firma.de')).toBe(false);
  });
});

describe('validateSubmission', () => {
  const gut = {
    name: 'Sebi',
    email: 'Sebi+x@Gmail.com',
    handle: '@sebi.wimmer',
    branche: 'Fitness-Coaching',
    ziel: 'Mehr Anfragen ueber Instagram',
    stimmung: 'ruhig',
    farbe: '#124466',
    consent: true,
    source: 'ig-bio',
  };

  it('akzeptiert eine vollstaendige Eingabe und normalisiert mit', () => {
    const r = validateSubmission(gut);
    expect(r.ok).toBe(true);
    expect(r.value.emailNorm).toBe('sebi@gmail.com');
    expect(r.value.handleNorm).toBe('sebi.wimmer');
    expect(r.value.name).toBe('Sebi');
  });

  it('verlangt die Einwilligung (DSGVO)', () => {
    const r = validateSubmission({ ...gut, consent: false });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('consent');
  });

  it('lehnt ungueltige Mails ab', () => {
    expect(validateSubmission({ ...gut, email: 'keinAt' }).error).toBe('email');
  });

  it('lehnt Wegwerf-Mails ab', () => {
    expect(validateSubmission({ ...gut, email: 'x@mailinator.com' }).error).toBe('disposable');
  });

  it('lehnt ungueltige Handles ab', () => {
    expect(validateSubmission({ ...gut, handle: 'hat leerzeichen' }).error).toBe('handle');
  });

  it('verlangt Name, Branche und Ziel', () => {
    expect(validateSubmission({ ...gut, name: '  ' }).error).toBe('name');
    expect(validateSubmission({ ...gut, branche: '' }).error).toBe('branche');
    expect(validateSubmission({ ...gut, ziel: '' }).error).toBe('ziel');
  });

  it('kappt zu lange Eingaben statt sie abzulehnen', () => {
    const r = validateSubmission({ ...gut, ziel: 'x'.repeat(5000) });
    expect(r.ok).toBe(true);
    expect(r.value.ziel.length).toBe(2000);
  });

  it('akzeptiert eine fehlende Farbe (optionales Feld)', () => {
    const r = validateSubmission({ ...gut, farbe: undefined });
    expect(r.ok).toBe(true);
    expect(r.value.farbe).toBe('');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/validate.test.js
```

Erwartung: FAIL — `isDisposable is not a function`.

- [ ] **Step 3: `src/constants.js` anlegen** — alle Schwellen an einem Ort

```js
/** Alle Schwellen/Grenzen zentral — keine Magic Numbers im Code verteilt. */

export const TOKEN_TTL_HOURS = 24;
export const PENDING_TTL_DAYS = 30;
export const RESEND_MAX_PER_HOUR = 3;
export const MIN_ELAPSED_MS = 1500;
export const RATE_LIMIT_PER_IP_PER_HOUR = 5;
export const RATE_LIMIT_GLOBAL_PER_HOUR = 300;

export const FIELD_LIMITS = {
  name: 120,
  email: 160,
  handle: 60,
  branche: 200,
  ziel: 2000,
  stimmung: 40,
  farbe: 40,
  source: 40,
};
```

- [ ] **Step 4: `src/disposable.js` anlegen**

```js
/**
 * Kuratierte Wegwerf-Domain-Liste.
 * Bewusst klein und wartbar: eine vollstaendige Liste ist unmoeglich,
 * die haeufigsten abzudecken reicht — Schicht 5 von 9 (siehe Spec §7).
 */
export const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'sharklasers.com',
  'maildrop.cc',
  'dispostable.com',
  'fakeinbox.com',
  'mailnesia.com',
  'mintemail.com',
  'spamgourmet.com',
  'mohmal.com',
  'emailondeck.com',
  'moakt.com',
  'tempr.email',
  'wegwerfemail.de',
  'einrot.com',
  'discard.email',
]);
```

- [ ] **Step 5: Implementierung** — an `src/validate.js` anhängen

```js
import { DISPOSABLE_DOMAINS } from './disposable.js';
import { FIELD_LIMITS } from './constants.js';

/** true, wenn die Domain auf der Wegwerf-Liste steht. */
export function isDisposable(email) {
  const norm = normalizeEmail(email);
  if (!norm) return false;
  return DISPOSABLE_DOMAINS.has(norm.split('@')[1]);
}

function clip(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

/**
 * Validiert + normalisiert eine Formular-Eingabe.
 * Gibt { ok:true, value } oder { ok:false, error } zurueck.
 * error ist ein stabiler Schluessel (kein Text) — die UI uebersetzt ihn.
 */
export function validateSubmission(input) {
  const raw = input ?? {};

  const name = clip(raw.name, FIELD_LIMITS.name);
  if (!name) return { ok: false, error: 'name' };

  const email = clip(raw.email, FIELD_LIMITS.email);
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return { ok: false, error: 'email' };
  if (isDisposable(emailNorm)) return { ok: false, error: 'disposable' };

  const handle = clip(raw.handle, FIELD_LIMITS.handle);
  const handleNorm = normalizeHandle(handle);
  if (!handleNorm) return { ok: false, error: 'handle' };

  const branche = clip(raw.branche, FIELD_LIMITS.branche);
  if (!branche) return { ok: false, error: 'branche' };

  const ziel = clip(raw.ziel, FIELD_LIMITS.ziel);
  if (!ziel) return { ok: false, error: 'ziel' };

  const stimmung = clip(raw.stimmung, FIELD_LIMITS.stimmung);
  if (!stimmung) return { ok: false, error: 'stimmung' };

  if (raw.consent !== true) return { ok: false, error: 'consent' };

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      emailNorm,
      handle: handleNorm,
      handleNorm,
      branche,
      ziel,
      stimmung,
      farbe: clip(raw.farbe, FIELD_LIMITS.farbe),
      consent: true,
      source: clip(raw.source, FIELD_LIMITS.source),
    },
  };
}
```

- [ ] **Step 6: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/validate.test.js
```

Erwartung: PASS (25 Tests gesamt).

- [ ] **Step 7: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/ free-content/test/validate.test.js
git commit -m "feat(free-content): Wegwerf-Liste + validateSubmission mit Tests"
```

---

### Task 4: D1-Migration `free_leads`

**Achtung:** Die D1 ist **produktiv** und enthält echte Kundinnendaten. Migration additiv, idempotent, keine Änderung an Bestehendem.

**Files:**
- Create: `~/social2scale-clients/_portal/migrate-v10.sql`
- Modify: `~/social2scale-clients/_portal/schema.sql` (Tabelle anhängen — SSoT bleibt vollständig)

**Interfaces:**
- Produces: Tabelle `free_leads` + Indizes, wie in Spec §8. `leads.js` (Task 5) baut darauf.

- [ ] **Step 1: `migrate-v10.sql` anlegen**

```sql
-- v10 · Free-Content-Funnel: oeffentliche Leads (Spec docs/free-content-funnel-spec.md §8)
-- Additiv + idempotent. Ruehrt bestehende Tabellen NICHT an.

CREATE TABLE IF NOT EXISTS free_leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  email_norm    TEXT NOT NULL,
  handle        TEXT DEFAULT '',
  handle_norm   TEXT DEFAULT '',
  branche       TEXT DEFAULT '',
  ziel          TEXT DEFAULT '',
  stimmung      TEXT DEFAULT '',
  farbe         TEXT DEFAULT '',
  consent       INTEGER NOT NULL DEFAULT 0,
  source        TEXT DEFAULT '',
  token         TEXT NOT NULL,
  token_expires TEXT NOT NULL,
  token_used_at TEXT,
  resend_count  INTEGER NOT NULL DEFAULT 0,
  last_sent_at  TEXT,
  confirmed_at  TEXT,
  generated_at  TEXT,
  chosen_look   TEXT DEFAULT '',
  r2_prefix     TEXT DEFAULT '',
  ip            TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mail: hart unique ueber ALLE Zustaende -> erneutes Eintragen updated die Zeile
-- und schickt den Link neu, legt nie eine zweite an (Spec §7 "Wiedereintritt").
CREATE UNIQUE INDEX IF NOT EXISTS idx_free_email ON free_leads(email_norm);

-- Handle: erst ab confirmed sperren, sonst blockiert man fremde Handles mutwillig.
CREATE UNIQUE INDEX IF NOT EXISTS idx_free_handle ON free_leads(handle_norm)
  WHERE handle_norm != '' AND confirmed_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_free_token   ON free_leads(token);
CREATE INDEX        IF NOT EXISTS idx_free_cleanup ON free_leads(status, created_at);
```

- [ ] **Step 2: Denselben Block an `schema.sql` anhängen**

Ans Ende von `~/social2scale-clients/_portal/schema.sql` anfügen, mit Kommentarkopf:

```sql
-- ============================================================
-- free_leads — Free-Content-Funnel (v10)
-- Spec: ~/social2scale-clients/docs/free-content-funnel-spec.md §8
-- ============================================================
```
gefolgt vom identischen `CREATE TABLE` + Index-Block aus Step 1.

**Warum doppelt:** `schema.sql` ist der SSoT fürs Neuaufsetzen, `migrate-v10.sql` der Weg für die laufende DB. Wer nur eins pflegt, hat beim nächsten Aufsetzen eine Tabelle, die niemand kennt.

- [ ] **Step 3: Migration LOKAL gegen die Test-DB prüfen**

```bash
cd ~/social2scale-clients/_portal
npx wrangler d1 execute s2s-crm --local --file=./migrate-v10.sql
```

Erwartung: erfolgreich, keine Fehler.

- [ ] **Step 4: Idempotenz prüfen — zweimal laufen lassen**

```bash
npx wrangler d1 execute s2s-crm --local --file=./migrate-v10.sql
```

Erwartung: erneut erfolgreich (dank `IF NOT EXISTS`), keine Fehler.

- [ ] **Step 5: Migration in der Test-Fixture spiegeln**

Damit die Vitest-D1 dieselbe Tabelle hat, `free-content/test/schema.sql` anlegen — **identischer Inhalt** wie `migrate-v10.sql` aus Step 1. Task 5 lädt sie.

- [ ] **Step 6: Commit**

`~/social2scale-clients` ist kein Git-Repo — dort kann nichts committet werden. Nur die Test-Fixture wandert ins Repo:

```bash
cd ~/social2scale-site
git add free-content/test/schema.sql
git commit -m "feat(free-content): D1-Schema free_leads als Test-Fixture"
```

**An Sebi melden:** `migrate-v10.sql` + `schema.sql` liegen ungesichert in `~/social2scale-clients/_portal/` (kein Git). Produktiv-Migration erst nach seinem Go (Task 12).

---

### Task 5: `leads.js` — Wiedereintritt statt Aussperren

**Das Herzstück und die riskanteste Stelle.** Ein harter Unique-Index ohne diese Logik sperrt jeden aus, der die Bestätigungsmail nie anklickt (Tippfehler, Spam-Ordner) — der Funnel frisst still echte Leads. Regel: **Erneutes Eintragen legt nie eine zweite Zeile an, sondern schickt den Link neu.**

**Files:**
- Create: `~/social2scale-site/free-content/src/leads.js`
- Test: `~/social2scale-site/free-content/test/leads.test.js`

**Interfaces:**
- Consumes: `CleanLead` aus `validateSubmission` (Task 3); `TOKEN_TTL_HOURS`, `RESEND_MAX_PER_HOUR`, `PENDING_TTL_DAYS` aus `constants.js` (Task 3).
- Produces:
  - `upsertLead(db, clean: CleanLead, ip: string, now: Date) → { lead, action, mail }`
    - `action`: `'created' | 'resent' | 'renewed' | 'retry' | 'ready' | 'building' | 'throttled' | 'handle_taken'`
    - `mail`: `'confirm' | 'result' | 'none'` — sagt Task 9, welche Mail zu schicken ist
    - `lead`: die Zeile inkl. `token`
  - `findByToken(db, token: string) → lead | null`
  - `confirmLead(db, token: string, now: Date) → { ok: boolean, lead?, reason? }`
    - `reason`: `'not_found' | 'expired' | 'used'`
  - `cleanupExpired(db, now: Date) → number` (Anzahl gelöschter Zeilen)

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — `test/leads.test.js`

```js
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { upsertLead, findByToken, confirmLead, cleanupExpired } from '../src/leads.js';
import { validateSubmission } from '../src/validate.js';
// KEIN node:fs — der Test laeuft in workerd, readFileSync ist dort gestubbt und wirft.
import SCHEMA from './schema.sql?raw';

/**
 * Zerlegt das Schema in einzeln ausfuehrbare Statements.
 * Kommentarzeilen MUESSEN vor dem Whitespace-Collapse raus — sonst frisst ein
 * einzeiliger `--`-Kommentar das gesamte folgende Statement und D1 lehnt es ab.
 */
function splitSchema(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const BASE = {
  name: 'Sebi',
  email: 'sebi@gmail.com',
  handle: '@sebi.wimmer',
  branche: 'Fitness',
  ziel: 'Mehr Anfragen',
  stimmung: 'ruhig',
  farbe: '',
  consent: true,
  source: 'test',
};

function clean(over = {}) {
  const r = validateSubmission({ ...BASE, ...over });
  if (!r.ok) throw new Error('Fixture ungueltig: ' + r.error);
  return r.value;
}

const NOW = new Date('2026-07-15T12:00:00Z');

beforeEach(async () => {
  await env.DB.exec('DROP TABLE IF EXISTS free_leads');
  for (const stmt of splitSchema(SCHEMA)) await env.DB.exec(stmt);
});

describe('upsertLead', () => {
  it('legt einen neuen Lead an und will die Bestaetigungsmail', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(r.action).toBe('created');
    expect(r.mail).toBe('confirm');
    expect(r.lead.status).toBe('pending');
    expect(r.lead.token).toBeTruthy();
  });

  it('legt bei Gmail-Varianten KEINE zweite Zeile an', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean({ email: 'S.E.B.I@gmail.com' }), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean({ email: 'sebi+neu@gmail.com' }), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean({ email: 'se.bi+x@googlemail.com' }), '1.1.1.1', NOW);

    const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
    expect(results.length).toBe(1);
  });

  it('schickt bei gueltigem Token denselben Link erneut', async () => {
    const first = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', new Date('2026-07-15T12:05:00Z'));
    expect(again.action).toBe('resent');
    expect(again.mail).toBe('confirm');
    expect(again.lead.token).toBe(first.lead.token);
  });

  it('erneuert einen abgelaufenen Token statt auszusperren', async () => {
    const first = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const spaeter = new Date('2026-07-17T12:00:00Z'); // > 24 h
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', spaeter);
    expect(again.action).toBe('renewed');
    expect(again.mail).toBe('confirm');
    expect(again.lead.token).not.toBe(first.lead.token);
  });

  it('deckelt Resends bei 3 pro Stunde (Anti-Mailbombing)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);            // created  -> 1
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);            // resent   -> 2
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);            // resent   -> 3
    const vierter = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(vierter.action).toBe('throttled');
    expect(vierter.mail).toBe('none');
  });

  it('erlaubt Resends nach Ablauf der Stunde wieder', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const spaeter = new Date('2026-07-15T13:30:00Z'); // > 1 h
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', spaeter);
    expect(r.action).toBe('resent');
    expect(r.mail).toBe('confirm');
  });

  it('schickt bei fertigem Lead den Ergebnis-Link', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await env.DB.prepare("UPDATE free_leads SET status='ready' WHERE id=?").bind(r.lead.id).run();
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(again.action).toBe('ready');
    expect(again.mail).toBe('result');
  });

  it('erlaubt nach einem Fehlschlag einen neuen Versuch', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await env.DB.prepare("UPDATE free_leads SET status='failed' WHERE id=?").bind(r.lead.id).run();
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(again.action).toBe('retry');
    expect(again.lead.status).toBe('pending');
    expect(again.mail).toBe('confirm');
  });

  it('sperrt einen bereits bestaetigten Handle fuer andere Mails', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await confirmLead(env.DB, r.lead.token, NOW);
    const fremd = await upsertLead(env.DB, clean({ email: 'wer.anders@firma.de' }), '2.2.2.2', NOW);
    expect(fremd.action).toBe('handle_taken');
    expect(fremd.mail).toBe('none');
  });

  it('blockiert einen NICHT bestaetigten Handle nicht (kein Griefing)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);  // bleibt pending
    const fremd = await upsertLead(env.DB, clean({ email: 'wer.anders@firma.de' }), '2.2.2.2', NOW);
    expect(fremd.action).toBe('created');
    expect(fremd.mail).toBe('confirm');
  });

  it('aktualisiert die Angaben beim Wiedereintritt', async () => {
    await upsertLead(env.DB, clean({ branche: 'Alt' }), '1.1.1.1', NOW);
    const r = await upsertLead(env.DB, clean({ branche: 'Neu' }), '1.1.1.1', NOW);
    expect(r.lead.branche).toBe('Neu');
  });
});

describe('confirmLead', () => {
  it('bestaetigt einen gueltigen Token genau einmal', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const first = await confirmLead(env.DB, r.lead.token, NOW);
    expect(first.ok).toBe(true);
    expect(first.lead.status).toBe('confirmed');

    const second = await confirmLead(env.DB, r.lead.token, NOW);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('used');
  });

  it('lehnt einen abgelaufenen Token ab', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const zuSpaet = new Date('2026-07-17T12:00:00Z');
    const res = await confirmLead(env.DB, r.lead.token, zuSpaet);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('expired');
  });

  it('lehnt einen unbekannten Token ab', async () => {
    const res = await confirmLead(env.DB, 'gibtsnicht', NOW);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not_found');
  });
});

describe('cleanupExpired', () => {
  it('loescht unbestaetigte Leads nach 30 Tagen (DSGVO)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const weit = new Date('2026-08-20T12:00:00Z'); // > 30 Tage
    const geloescht = await cleanupExpired(env.DB, weit);
    expect(geloescht).toBe(1);
  });

  it('loescht bestaetigte Leads NICHT', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await confirmLead(env.DB, r.lead.token, NOW);
    const weit = new Date('2026-08-20T12:00:00Z');
    expect(await cleanupExpired(env.DB, weit)).toBe(0);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/leads.test.js
```

Erwartung: FAIL — `src/leads.js` fehlt.

- [ ] **Step 3: Implementierung** — `src/leads.js`

```js
/**
 * Einziger Ort, der die Tabelle free_leads kennt.
 *
 * Kernregel (Spec §7 "Wiedereintritt"): Erneutes Eintragen legt NIE eine zweite
 * Zeile an, sondern schickt den Link neu. Ein harter Unique-Index ohne diese
 * Logik sperrt jeden aus, der die Mail nie anklickt — der Funnel frisst still Leads.
 */

import { TOKEN_TTL_HOURS, RESEND_MAX_PER_HOUR, PENDING_TTL_DAYS } from './constants.js';

const HOUR_MS = 60 * 60 * 1000;

function iso(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function plusHours(date, hours) {
  return new Date(date.getTime() + hours * HOUR_MS);
}

async function byEmailNorm(db, emailNorm) {
  return db.prepare('SELECT * FROM free_leads WHERE email_norm = ?').bind(emailNorm).first();
}

async function byId(db, id) {
  return db.prepare('SELECT * FROM free_leads WHERE id = ?').bind(id).first();
}

/** true, wenn der Handle bereits von einem ANDEREN, bestaetigten Lead belegt ist. */
async function handleTakenByOther(db, handleNorm, emailNorm) {
  if (!handleNorm) return false;
  const row = await db
    .prepare(
      `SELECT id FROM free_leads
       WHERE handle_norm = ? AND email_norm != ? AND confirmed_at IS NOT NULL`
    )
    .bind(handleNorm, emailNorm)
    .first();
  return !!row;
}

/** Resend-Deckel: max. RESEND_MAX_PER_HOUR pro Lead und Stunde (Anti-Mailbombing). */
function isThrottled(lead, now) {
  if (!lead.last_sent_at) return false;
  const last = new Date(lead.last_sent_at.replace(' ', 'T') + 'Z');
  if (now.getTime() - last.getTime() >= HOUR_MS) return false;
  return lead.resend_count >= RESEND_MAX_PER_HOUR;
}

/** Zaehler zuruecksetzen, sobald das Stundenfenster vorbei ist. */
function nextResendCount(lead, now) {
  if (!lead.last_sent_at) return 1;
  const last = new Date(lead.last_sent_at.replace(' ', 'T') + 'Z');
  if (now.getTime() - last.getTime() >= HOUR_MS) return 1;
  return lead.resend_count + 1;
}

function isTokenExpired(lead, now) {
  return new Date(lead.token_expires.replace(' ', 'T') + 'Z').getTime() <= now.getTime();
}

/**
 * Legt an oder tritt wieder ein.
 * @returns {{lead: object, action: string, mail: 'confirm'|'result'|'none'}}
 */
export async function upsertLead(db, clean, ip, now = new Date()) {
  const existing = await byEmailNorm(db, clean.emailNorm);

  if (await handleTakenByOther(db, clean.handleNorm, clean.emailNorm)) {
    return { lead: existing ?? null, action: 'handle_taken', mail: 'none' };
  }

  if (!existing) {
    const token = newToken();
    await db
      .prepare(
        `INSERT INTO free_leads
           (name, email, email_norm, handle, handle_norm, branche, ziel, stimmung,
            farbe, consent, source, token, token_expires, resend_count, last_sent_at,
            ip, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?,1,?,?, 'pending', ?)`
      )
      .bind(
        clean.name, clean.email, clean.emailNorm, clean.handle, clean.handleNorm,
        clean.branche, clean.ziel, clean.stimmung, clean.farbe, clean.source,
        token, iso(plusHours(now, TOKEN_TTL_HOURS)), iso(now), ip, iso(now)
      )
      .run();

    const lead = await byEmailNorm(db, clean.emailNorm);
    return { lead, action: 'created', mail: 'confirm' };
  }

  // Fertig -> Ergebnis-Link, nicht neu bauen.
  if (existing.status === 'ready') {
    return { lead: existing, action: 'ready', mail: 'result' };
  }

  // Laeuft gerade -> Link zur Build-Seite.
  if (existing.status === 'confirmed' || existing.status === 'building') {
    return { lead: existing, action: 'building', mail: 'result' };
  }

  if (isThrottled(existing, now)) {
    return { lead: existing, action: 'throttled', mail: 'none' };
  }

  const retry = existing.status === 'failed';
  const expired = isTokenExpired(existing, now);
  const keepToken = !retry && !expired;

  const token = keepToken ? existing.token : newToken();
  const expires = keepToken ? existing.token_expires : iso(plusHours(now, TOKEN_TTL_HOURS));

  // Angaben mit aktualisieren — sie hat sie evtl. korrigiert.
  await db
    .prepare(
      `UPDATE free_leads SET
         name=?, email=?, handle=?, handle_norm=?, branche=?, ziel=?, stimmung=?,
         farbe=?, source=?, token=?, token_expires=?, token_used_at=NULL,
         resend_count=?, last_sent_at=?, ip=?, status='pending'
       WHERE id=?`
    )
    .bind(
      clean.name, clean.email, clean.handle, clean.handleNorm, clean.branche,
      clean.ziel, clean.stimmung, clean.farbe, clean.source, token, expires,
      nextResendCount(existing, now), iso(now), ip, existing.id
    )
    .run();

  const lead = await byId(db, existing.id);
  const action = retry ? 'retry' : expired ? 'renewed' : 'resent';
  return { lead, action, mail: 'confirm' };
}

export async function findByToken(db, token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM free_leads WHERE token = ?').bind(token).first();
}

/**
 * Entwertet den Token und setzt den Lead auf confirmed. Genau einmal moeglich.
 * @returns {{ok: boolean, lead?: object, reason?: 'not_found'|'expired'|'used'}}
 */
export async function confirmLead(db, token, now = new Date()) {
  const lead = await findByToken(db, token);
  if (!lead) return { ok: false, reason: 'not_found' };
  if (lead.token_used_at) return { ok: false, reason: 'used' };
  if (isTokenExpired(lead, now)) return { ok: false, reason: 'expired' };

  await db
    .prepare(
      `UPDATE free_leads
         SET token_used_at=?, confirmed_at=?, status='confirmed'
       WHERE id=? AND token_used_at IS NULL`
    )
    .bind(iso(now), iso(now), lead.id)
    .run();

  return { ok: true, lead: await byId(db, lead.id) };
}

/** DSGVO: unbestaetigte Leads nach PENDING_TTL_DAYS loeschen. */
export async function cleanupExpired(db, now = new Date()) {
  const cutoff = iso(new Date(now.getTime() - PENDING_TTL_DAYS * 24 * HOUR_MS));
  const res = await db
    .prepare(
      `DELETE FROM free_leads
        WHERE status = 'pending' AND confirmed_at IS NULL AND created_at < ?`
    )
    .bind(cutoff)
    .run();
  return res.meta?.changes ?? 0;
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/leads.test.js
```

Erwartung: PASS (16 Tests).

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/leads.js free-content/test/leads.test.js
git commit -m "feat(free-content): leads.js mit Wiedereintritt statt Aussperren"
```

---

### Task 6: `protect.js` — Bot-Schichten

Schichten 1–4 der Spec. Portiert aus dem erprobten `~/social2scale-site/workers/anfrage-worker.js:31-60` — **nicht neu erfinden**, das Muster läuft dort seit Wochen.

**Files:**
- Create: `~/social2scale-site/free-content/src/protect.js`
- Modify: `~/social2scale-site/free-content/test/api.test.js`

**Interfaces:**
- Consumes: `MIN_ELAPSED_MS` aus `constants.js` (Task 3).
- Produces:
  - `verifyTurnstile(token, ip, secret) → Promise<boolean>`
  - `isHoneypotTripped(body) → boolean`
  - `isTooFast(body) → boolean`
  - `hasMailServer(email) → Promise<boolean>` (fail-open bei Lookup-Fehler)

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/api.test.js` anhängen

```js
import { isHoneypotTripped, isTooFast } from '../src/protect.js';

describe('protect: Honeypot', () => {
  it('schlaegt an, wenn das versteckte Feld gefuellt ist', () => {
    expect(isHoneypotTripped({ website: 'http://spam.example' })).toBe(true);
  });

  it('schlaegt bei leerem/fehlendem Feld nicht an', () => {
    expect(isHoneypotTripped({ website: '' })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
  });
});

describe('protect: Mindest-Ausfuellzeit', () => {
  it('weist zu schnelle Eingaben ab', () => {
    expect(isTooFast({ elapsed: 200 })).toBe(true);
  });

  it('laesst menschliche Geschwindigkeit durch', () => {
    expect(isTooFast({ elapsed: 9000 })).toBe(false);
  });

  it('laesst eine fehlende Messung durch (fail-open)', () => {
    expect(isTooFast({})).toBe(false);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: FAIL — `src/protect.js` fehlt.

- [ ] **Step 3: Implementierung** — `src/protect.js`

```js
/**
 * Bot-Schichten 1-4 (Spec §7). Portiert aus workers/anfrage-worker.js —
 * dort erprobt, hier nicht neu erfunden.
 * Entscheidet nur ja/nein und kennt keine Leads.
 */

import { MIN_ELAPSED_MS } from './constants.js';

/** Schicht 1: Turnstile serverseitig verifizieren. */
export async function verifyTurnstile(token, ip, secret) {
  if (!token || !secret) return false;
  try {
    const body = new URLSearchParams();
    body.append('secret', secret);
    body.append('response', String(token));
    if (ip && ip !== 'anon') body.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('[protect] Turnstile-Verifikation fehlgeschlagen:', err);
    return false; // fail-closed: im Zweifel kein Durchlass
  }
}

/** Schicht 2: Bots fuellen das versteckte Feld aus. */
export function isHoneypotTripped(body) {
  return !!String(body?.website ?? '').trim();
}

/** Schicht 3: Menschen brauchen laenger als MIN_ELAPSED_MS. */
export function isTooFast(body) {
  const elapsed = body?.elapsed;
  if (elapsed == null) return false; // fail-open: keine Messung -> nicht blocken
  return Number(elapsed) < MIN_ELAPSED_MS;
}

/** Schicht 4: hat die Domain ueberhaupt einen Mailserver? */
export async function hasMailServer(email) {
  try {
    const domain = String(email).split('@')[1];
    if (!domain) return false;

    const lookup = async (type) => {
      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
        { headers: { accept: 'application/dns-json' } }
      );
      const data = await res.json();
      return Array.isArray(data.Answer) && data.Answer.length > 0;
    };

    if (await lookup('MX')) return true;
    if (await lookup('A')) return true;
    return false;
  } catch (err) {
    console.error('[protect] DNS-Lookup fehlgeschlagen:', err);
    return true; // fail-open: Lookup-Panne darf keine echten Leads killen
  }
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: PASS (7 Tests).

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/protect.js free-content/test/api.test.js
git commit -m "feat(free-content): Bot-Schichten (Turnstile/Honeypot/elapsed/MX)"
```

---

### Task 7: Rate-Limit über D1

Schicht 6 der Spec. Muster aus `_portal/_worker.js:388-413` (`intake_log`) — dieselbe Idee, eigene Tabelle.

**Files:**
- Modify: `~/social2scale-site/free-content/src/protect.js`
- Modify: `~/social2scale-clients/_portal/migrate-v10.sql` + `schema.sql` + `free-content/test/schema.sql`
- Modify: `~/social2scale-site/free-content/test/api.test.js`

**Interfaces:**
- Consumes: `RATE_LIMIT_PER_IP_PER_HOUR`, `RATE_LIMIT_GLOBAL_PER_HOUR` aus `constants.js`.
- Produces: `checkRateLimit(db, ip, now) → Promise<{ok: boolean, reason?: 'ip'|'global'}>` und `logAttempt(db, ip, now) → Promise<void>`.

- [ ] **Step 1: Tabelle an alle drei Schema-Dateien anhängen**

An `migrate-v10.sql`, `schema.sql` (unter demselben v10-Kommentarkopf) und `free-content/test/schema.sql`:

```sql
-- Rate-Limiting des oeffentlichen Free-Content-Eingangs (Muster: intake_log)
CREATE TABLE IF NOT EXISTS free_intake_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_free_log_created ON free_intake_log(created_at);
CREATE INDEX IF NOT EXISTS idx_free_log_ip      ON free_intake_log(ip);
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben** — an `test/api.test.js` anhängen

> `env` und `beforeEach` sind oben in der Datei bereits importiert (Task 0) —
> **nicht erneut importieren**, das wäre ein `SyntaxError`.
>
> ⚠️ **Schema-Laden — zwei Fallen, beide in Task 5 live aufgelaufen:**
> 1. **Kein `node:fs`.** Der Test läuft in workerd; `readFileSync` ist gestubbt und wirft
>    immer. Vite-`?raw`-Import stattdessen.
> 2. **Kommentarzeilen VOR dem Whitespace-Collapse strippen.** `.replace(/\s+/g,' ')`
>    macht aus den `--`-Zeilen des Schemas **einen einzigen Kommentar**, der das ganze
>    `CREATE TABLE` verschluckt → D1 lehnt ab. `splitSchema()` unten macht beides richtig;
>    Task 5 hat dieselbe Hilfsfunktion bereits in `test/leads.test.js`.

```js
import { checkRateLimit, logAttempt } from '../src/protect.js';
import SCHEMA_SQL from './schema.sql?raw';

const T0 = new Date('2026-07-15T12:00:00Z');

/**
 * Zerlegt das Schema in einzeln ausfuehrbare Statements.
 * Kommentarzeilen MUESSEN vor dem Whitespace-Collapse raus — sonst frisst ein
 * einzeiliger `--`-Kommentar das gesamte folgende Statement.
 */
function splitSchema(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

describe('protect: Rate-Limit', () => {
  beforeEach(async () => {
    await env.DB.exec('DROP TABLE IF EXISTS free_intake_log');
    for (const stmt of splitSchema(SCHEMA_SQL)) await env.DB.exec(stmt);
  });

  it('laesst die ersten Versuche einer IP durch', async () => {
    expect((await checkRateLimit(env.DB, '1.1.1.1', T0)).ok).toBe(true);
  });

  it('blockt ab dem 6. Versuch derselben IP innerhalb einer Stunde', async () => {
    for (let i = 0; i < 5; i++) await logAttempt(env.DB, '1.1.1.1', T0);
    const res = await checkRateLimit(env.DB, '1.1.1.1', T0);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('ip');
  });

  it('laesst eine andere IP unbehelligt', async () => {
    for (let i = 0; i < 5; i++) await logAttempt(env.DB, '1.1.1.1', T0);
    expect((await checkRateLimit(env.DB, '2.2.2.2', T0)).ok).toBe(true);
  });

  it('vergisst alte Versuche nach einer Stunde', async () => {
    for (let i = 0; i < 5; i++) await logAttempt(env.DB, '1.1.1.1', T0);
    const spaeter = new Date('2026-07-15T13:30:00Z');
    expect((await checkRateLimit(env.DB, '1.1.1.1', spaeter)).ok).toBe(true);
  });
});
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: FAIL — `checkRateLimit is not a function`.

- [ ] **Step 4: Implementierung** — an `src/protect.js` anhängen

```js
import { RATE_LIMIT_PER_IP_PER_HOUR, RATE_LIMIT_GLOBAL_PER_HOUR } from './constants.js';

function isoTs(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/** Schicht 6: Rate-Limit pro IP + globaler Deckel (Muster: intake_log). */
export async function checkRateLimit(db, ip, now = new Date()) {
  const since = isoTs(new Date(now.getTime() - 60 * 60 * 1000));

  const perIp = await db
    .prepare('SELECT COUNT(*) AS c FROM free_intake_log WHERE ip = ? AND created_at >= ?')
    .bind(ip, since)
    .first();
  if ((perIp?.c ?? 0) >= RATE_LIMIT_PER_IP_PER_HOUR) return { ok: false, reason: 'ip' };

  const global = await db
    .prepare('SELECT COUNT(*) AS c FROM free_intake_log WHERE created_at >= ?')
    .bind(since)
    .first();
  if ((global?.c ?? 0) >= RATE_LIMIT_GLOBAL_PER_HOUR) return { ok: false, reason: 'global' };

  return { ok: true };
}

/** Versuch protokollieren + opportunistisch aufraeumen (wie intake_log). */
export async function logAttempt(db, ip, now = new Date()) {
  const cutoff = isoTs(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  try {
    await db.prepare('DELETE FROM free_intake_log WHERE created_at < ?').bind(cutoff).run();
  } catch (err) {
    console.error('[protect] Aufraeumen des Rate-Limit-Logs fehlgeschlagen:', err);
  }
  await db
    .prepare('INSERT INTO free_intake_log (ip, created_at) VALUES (?, ?)')
    .bind(ip, isoTs(now))
    .run();
}
```

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: PASS (11 Tests).

- [ ] **Step 6: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/protect.js free-content/test/
git commit -m "feat(free-content): Rate-Limit pro IP + globaler Deckel"
```

---

### Task 8: `mail.js` — Brevo

Muster aus `workers/anfrage-worker.js:112-155`. Die Bestätigungsmail ist der Single Point of Failure des Funnels (Spec §11) — der Betreff trägt Sebis Framing: **„Nur noch ein Klick bis zu deinem ersten s2s Free Content"**.

**Files:**
- Create: `~/social2scale-site/free-content/src/mail.js`
- Modify: `~/social2scale-site/free-content/test/api.test.js`

**Interfaces:**
- Consumes: `lead` aus `leads.js` (Task 5).
- Produces:
  - `buildConfirmMail(lead, publicOrigin) → { subject, htmlContent }`
  - `sendConfirmMail(env, lead) → Promise<boolean>`
  - `sendResultMail(env, lead) → Promise<boolean>`
  - `notifyFounders(env, lead, action) → Promise<void>`

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/api.test.js` anhängen

```js
import { buildConfirmMail } from '../src/mail.js';

describe('mail: Bestaetigungsmail', () => {
  const lead = { name: 'Sebi', token: 'abc123', handle: 'sebi.wimmer' };

  it('traegt Sebis Framing im Betreff', () => {
    const mail = buildConfirmMail(lead, 'https://start.social2scale.com');
    expect(mail.subject).toContain('Nur noch ein Klick');
  });

  it('enthaelt den korrekten Bestaetigungslink', () => {
    const mail = buildConfirmMail(lead, 'https://start.social2scale.com');
    expect(mail.htmlContent).toContain('https://start.social2scale.com/c/abc123');
  });

  it('spricht sie mit Vornamen an', () => {
    expect(buildConfirmMail(lead, 'https://x.de').htmlContent).toContain('Sebi');
  });

  it('escaped HTML im Namen (XSS)', () => {
    const boese = { ...lead, name: '<script>alert(1)</script>' };
    const html = buildConfirmMail(boese, 'https://x.de').htmlContent;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: FAIL — `src/mail.js` fehlt.

- [ ] **Step 3: Implementierung** — `src/mail.js`

```js
/**
 * Brevo-Versand. Muster aus workers/anfrage-worker.js.
 * Die Bestaetigungsmail ist der Single Point of Failure des Funnels (Spec §11):
 * kommt sie nicht an, stirbt er lautlos.
 */

const BREVO_MAIL_URL = 'https://api.brevo.com/v3/smtp/email';

function esc(value) {
  return String(value ?? '').replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])
  );
}

function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] || 'du';
}

/** Reine Funktion — deshalb ohne Netzwerk testbar. */
export function buildConfirmMail(lead, publicOrigin) {
  const link = `${publicOrigin}/c/${encodeURIComponent(lead.token)}`;
  const vorname = esc(firstName(lead.name));

  return {
    subject: 'Nur noch ein Klick bis zu deinem ersten s2s Free Content',
    htmlContent: `
      <p>Hey ${vorname},</p>
      <p>dein Content wartet — <strong>ein Klick</strong> und wir bauen ihn live fuer dich:</p>
      <p><a href="${esc(link)}">Jetzt meinen Free Content ansehen</a></p>
      <p>Der Link gilt 24 Stunden. Falls du das nicht warst, ignorier diese Mail einfach.</p>
      <p>— social2scale</p>
    `.trim(),
  };
}

export function buildResultMail(lead, publicOrigin) {
  const link = `${publicOrigin}/r/${encodeURIComponent(lead.token)}`;
  return {
    subject: 'Dein s2s Free Content liegt bereit',
    htmlContent: `
      <p>Hey ${esc(firstName(lead.name))},</p>
      <p>hier geht's zu deinem Content:</p>
      <p><a href="${esc(link)}">Meinen Free Content oeffnen</a></p>
      <p>— social2scale</p>
    `.trim(),
  };
}

async function send(env, to, name, mail) {
  if (!env.BREVO_API_KEY) {
    console.error('[mail] BREVO_API_KEY fehlt — Mail nicht versendet');
    return false;
  }
  try {
    const res = await fetch(BREVO_MAIL_URL, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.NOTIFY_FROM, name: 'social2scale' },
        to: [{ email: to, name }],
        subject: mail.subject,
        htmlContent: mail.htmlContent,
      }),
    });
    if (!res.ok) {
      console.error('[mail] Brevo antwortete mit', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[mail] Versand fehlgeschlagen:', err);
    return false;
  }
}

export async function sendConfirmMail(env, lead) {
  return send(env, lead.email, lead.name, buildConfirmMail(lead, env.PUBLIC_ORIGIN));
}

export async function sendResultMail(env, lead) {
  return send(env, lead.email, lead.name, buildResultMail(lead, env.PUBLIC_ORIGIN));
}

/** Founder-Benachrichtigung — non-fatal, aber niemals still. */
export async function notifyFounders(env, lead, action) {
  const mail = {
    subject: `Free-Content-Lead: ${lead.name} (${action})`,
    htmlContent: `
      <h2>Neuer Free-Content-Lead</h2>
      <ul>
        <li><b>Name:</b> ${esc(lead.name)}</li>
        <li><b>E-Mail:</b> ${esc(lead.email)}</li>
        <li><b>Handle:</b> @${esc(lead.handle)}</li>
        <li><b>Branche:</b> ${esc(lead.branche)}</li>
        <li><b>Ziel:</b> ${esc(lead.ziel)}</li>
        <li><b>Stimmung:</b> ${esc(lead.stimmung)}</li>
        <li><b>Quelle:</b> ${esc(lead.source)}</li>
        <li><b>Aktion:</b> ${esc(action)}</li>
      </ul>
    `.trim(),
  };
  await send(env, env.NOTIFY_TO, 'social2scale', mail);
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: PASS (15 Tests).

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/mail.js free-content/test/api.test.js
git commit -m "feat(free-content): Brevo-Mails inkl. XSS-Escaping"
```

---

### Task 9: `POST /api/free-content` verdrahten

Alle Schichten zusammenführen. **Reihenfolge ist Absicht:** billige Prüfungen zuerst, teure (DNS, D1) zuletzt — ein Bot soll keine Datenbank-Arbeit auslösen.

**Files:**
- Modify: `~/social2scale-site/free-content/src/index.js`
- Modify: `~/social2scale-site/free-content/test/api.test.js`

**Interfaces:**
- Consumes: alles aus Tasks 3, 5, 6, 7, 8.
- Produces: `POST /api/free-content` → immer `{ok:true, message}` bei Erfolg **oder** neutraler Duplikat-Antwort; `{ok:false, error}` bei Ablehnung.

**Enumeration-Regel:** Bei `resent`, `renewed`, `retry`, `ready`, `throttled` und `created` geht **dieselbe** Antwort raus. Sonst verrät die API, welche Adressen registriert sind.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/api.test.js` anhängen

```js
const GUELTIG = {
  name: 'Sebi',
  email: 'sebi@gmail.com',
  handle: '@sebi.wimmer',
  branche: 'Fitness',
  ziel: 'Mehr Anfragen',
  stimmung: 'ruhig',
  consent: true,
  elapsed: 9000,
  website: '',
  turnstile: 'TESTTOKEN',
};

async function post(body) {
  return SELF.fetch('https://start.social2scale.com/api/free-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '9.9.9.9' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/free-content', () => {
  beforeEach(async () => {
    for (const t of ['free_leads', 'free_intake_log']) {
      await env.DB.exec(`DROP TABLE IF EXISTS ${t}`);
    }
    for (const stmt of splitSchema(SCHEMA_SQL)) await env.DB.exec(stmt);
  });

  it('nimmt eine gueltige Eingabe an', async () => {
    const res = await post(GUELTIG);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
    expect(results.length).toBe(1);
  });

  it('verwirft Honeypot-Treffer still und legt NICHTS an', async () => {
    const res = await post({ ...GUELTIG, website: 'http://spam.example' });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true); // Bot soll nichts merken
    const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
    expect(results.length).toBe(0);
  });

  it('verwirft zu schnelle Eingaben still', async () => {
    await post({ ...GUELTIG, elapsed: 200 });
    const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
    expect(results.length).toBe(0);
  });

  it('lehnt fehlende Einwilligung ab', async () => {
    const res = await post({ ...GUELTIG, consent: false });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('consent');
  });

  it('lehnt Wegwerf-Mails ab', async () => {
    const res = await post({ ...GUELTIG, email: 'x@mailinator.com' });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('disposable');
  });

  it('antwortet bei Duplikaten identisch (keine Enumeration)', async () => {
    const a = await post(GUELTIG);
    const b = await post({ ...GUELTIG, email: 'S.E.B.I+neu@googlemail.com' });
    expect(await a.clone().json()).toEqual(await b.clone().json());
    const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
    expect(results.length).toBe(1);
  });

  it('lehnt anderes als POST ab', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/free-content');
    expect(res.status).toBe(405);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: FAIL — Route liefert 404.

- [ ] **Step 3: Implementierung** — `src/index.js` ersetzen

```js
/**
 * s2s Free-Content-Funnel — Router.
 * Kennt keine Interna: delegiert an validate/protect/leads/mail.
 */

import { validateSubmission } from './validate.js';
import {
  verifyTurnstile, isHoneypotTripped, isTooFast, hasMailServer,
  checkRateLimit, logAttempt,
} from './protect.js';
import { upsertLead, cleanupExpired } from './leads.js';
import { sendConfirmMail, sendResultMail, notifyFounders } from './mail.js';

/** Identische Antwort fuer JEDEN Lead-Ausgang — sonst Enumeration (Spec §7). */
const NEUTRAL = {
  ok: true,
  message: 'Schau in dein Postfach — und wirf auch einen Blick in den Spam-Ordner.',
};

function corsHeaders(allow) {
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

async function handleSubmit(request, env, ctx, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400, cors);
  }

  // Billige Schichten zuerst: ein Bot soll keine DB-Arbeit ausloesen.
  // Honeypot + zu schnell -> still "ok", damit der Bot nichts lernt.
  if (isHoneypotTripped(body)) return json(NEUTRAL, 200, cors);
  if (isTooFast(body)) return json(NEUTRAL, 200, cors);

  if (env.TURNSTILE_SECRET) {
    const ip = request.headers.get('CF-Connecting-IP') || 'anon';
    const ok = await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET);
    if (!ok) return json({ ok: false, error: 'captcha' }, 403, cors);
  }

  const checked = validateSubmission(body);
  if (!checked.ok) return json({ ok: false, error: checked.error }, 422, cors);

  const ip = request.headers.get('CF-Connecting-IP') || 'anon';

  const limited = await checkRateLimit(env.DB, ip);
  if (!limited.ok) return json({ ok: false, error: 'rate_limited' }, 429, cors);

  if (!(await hasMailServer(checked.value.emailNorm))) {
    return json({ ok: false, error: 'email_domain' }, 422, cors);
  }

  const { lead, action, mail } = await upsertLead(env.DB, checked.value, ip);
  await logAttempt(env.DB, ip);

  // Mailversand + Aufraeumen blockieren die Antwort nicht.
  if (mail === 'confirm') {
    ctx.waitUntil(sendConfirmMail(env, lead).then((sent) => {
      if (!sent) console.error('[submit] Bestaetigungsmail nicht zugestellt, Lead', lead.id);
    }));
  } else if (mail === 'result') {
    ctx.waitUntil(sendResultMail(env, lead));
  }
  if (action === 'created') ctx.waitUntil(notifyFounders(env, lead, action));
  ctx.waitUntil(cleanupExpired(env.DB).catch((err) =>
    console.error('[submit] TTL-Aufraeumen fehlgeschlagen:', err)
  ));

  // Auch 'throttled' und 'handle_taken' antworten neutral (keine Enumeration).
  return json(NEUTRAL, 200, cors);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(env.ALLOW_ORIGIN || 'https://social2scale.com');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/api/health') return json({ ok: true }, 200, cors);

    if (url.pathname === '/api/free-content') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
      return handleSubmit(request, env, ctx, cors);
    }

    return json({ ok: false, error: 'not_found' }, 404, cors);
  },
};
```

- [ ] **Step 4: Turnstile im Test abschalten**

In `wrangler.toml` **nicht** anfassen — stattdessen sicherstellen, dass `TURNSTILE_SECRET` im Test nicht gesetzt ist (Secrets werden von `vitest-pool-workers` nicht geladen). Der Turnstile-Zweig wird in Task 12 gegen die deployte Instanz geprüft.

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run
```

Erwartung: PASS (alle Tests, 22 gesamt).

- [ ] **Step 6: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/index.js free-content/test/api.test.js
git commit -m "feat(free-content): POST /api/free-content mit allen Schutzschichten"
```

---

### Task 10: `GET /c/<token>` — Bestätigung

Schicht 8+9. In diesem Plan endet die Bestätigung bei `confirmed` und einer schlichten Seite. **Plan 2 hängt hier die Generierung ein.**

**Files:**
- Modify: `~/social2scale-site/free-content/src/index.js`
- Modify: `~/social2scale-site/free-content/test/api.test.js`

**Interfaces:**
- Consumes: `confirmLead` (Task 5).
- Produces: `GET /c/:token` → 302 auf `/r/:token` bei Erfolg; 200 mit deutscher Fehlerseite bei `expired`/`used`/`not_found`. Plan 2 ersetzt den Rumpf von `/r/:token`.

- [ ] **Step 1: Den fehlschlagenden Test schreiben** — an `test/api.test.js` anhängen

```js
import { findByToken } from '../src/leads.js';

describe('GET /c/:token', () => {
  beforeEach(async () => {
    for (const t of ['free_leads', 'free_intake_log']) {
      await env.DB.exec(`DROP TABLE IF EXISTS ${t}`);
    }
    for (const stmt of splitSchema(SCHEMA_SQL)) await env.DB.exec(stmt);
  });

  async function tokenAnlegen() {
    await post(GUELTIG);
    const row = await env.DB.prepare('SELECT token FROM free_leads').first();
    return row.token;
  }

  it('bestaetigt und leitet auf die Ergebnisseite weiter', async () => {
    const token = await tokenAnlegen();
    const res = await SELF.fetch(`https://start.social2scale.com/c/${token}`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(`/r/${token}`);

    const lead = await findByToken(env.DB, token);
    expect(lead.status).toBe('confirmed');
  });

  it('lehnt denselben Token beim zweiten Mal ab', async () => {
    const token = await tokenAnlegen();
    await SELF.fetch(`https://start.social2scale.com/c/${token}`, { redirect: 'manual' });
    const zweiter = await SELF.fetch(`https://start.social2scale.com/c/${token}`, { redirect: 'manual' });
    expect(zweiter.status).toBe(200);
    expect(await zweiter.text()).toContain('schon benutzt');
  });

  it('lehnt einen unbekannten Token ab', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/c/gibtsnicht');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nicht mehr g');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run test/api.test.js
```

Erwartung: FAIL — `/c/...` liefert 404.

- [ ] **Step 3: Implementierung** — in `src/index.js`

Import ergänzen:

```js
import { upsertLead, confirmLead, cleanupExpired } from './leads.js';
```

Vor `export default` einfügen:

```js
function htmlPage(title, body) {
  return new Response(
    `<!doctype html><html lang="de"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${title}</title></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// Sackgassen sind verboten (Spec §9): jeder Fehlerfall bietet einen Ausweg.
const CONFIRM_FEHLER = {
  used: {
    title: 'Diesen Link hast du schon benutzt',
    body: '<p>Kein Problem — trag dich einfach nochmal ein, dann schicken wir dir einen frischen Link.</p>' +
          '<p><a href="https://social2scale.com/free-content/">Nochmal eintragen</a></p>',
  },
  expired: {
    title: 'Dieser Link ist nicht mehr gültig',
    body: '<p>Links gelten 24 Stunden. Trag dich nochmal ein, dann bekommst du sofort einen neuen.</p>' +
          '<p><a href="https://social2scale.com/free-content/">Neuen Link holen</a></p>',
  },
  not_found: {
    title: 'Diesen Link kennen wir nicht mehr',
    body: '<p>Vielleicht ein Tippfehler beim Kopieren? Trag dich einfach nochmal ein.</p>' +
          '<p><a href="https://social2scale.com/free-content/">Nochmal eintragen</a></p>',
  },
};

async function handleConfirm(token, env) {
  const res = await confirmLead(env.DB, token);
  if (!res.ok) {
    const fehler = CONFIRM_FEHLER[res.reason] ?? CONFIRM_FEHLER.not_found;
    return htmlPage(fehler.title, fehler.body);
  }
  // Plan 2 haengt hier die Generierung ein (ctx.waitUntil(generate(...))).
  return new Response(null, { status: 302, headers: { Location: `/r/${token}` } });
}
```

Im Router vor dem 404 einfügen:

```js
    const confirmMatch = url.pathname.match(/^\/c\/([A-Za-z0-9]+)$/);
    if (confirmMatch) return handleConfirm(confirmMatch[1], env);

    // Platzhalter — Plan 2 ersetzt das durch Build-/Ergebnisseite.
    const resultMatch = url.pathname.match(/^\/r\/([A-Za-z0-9]+)$/);
    if (resultMatch) {
      return htmlPage('Dein Free Content', '<p>Wird gebaut (Plan 2).</p>');
    }
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run
```

Erwartung: PASS (25 gesamt).

- [ ] **Step 5: Commit**

```bash
cd ~/social2scale-site
git add free-content/src/index.js free-content/test/api.test.js
git commit -m "feat(free-content): Double-Opt-in-Bestaetigung mit Einmal-Token"
```

---

### Task 11: Coverage-Nachweis

Sebis Standard: 80 % Minimum.

**Files:**
- Modify: `~/social2scale-site/free-content/vitest.config.js`
- Modify: `~/social2scale-site/free-content/package.json`

- [ ] **Step 1: Coverage in `vitest.config.js` konfigurieren**

Im `test`-Block ergänzen:

```js
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.js'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
```

- [ ] **Step 2: Coverage-Abhängigkeit ergänzen**

In `package.json` unter `devDependencies`:

```json
    "@vitest/coverage-istanbul": "^2.1.0"
```

- [ ] **Step 3: Coverage messen**

```bash
cd ~/social2scale-site/free-content && npm install && npm run coverage
```

Erwartung: alle Schwellen erreicht. Falls nicht — **Tests ergänzen, nicht Schwellen senken.**

- [ ] **Step 4: Commit**

```bash
cd ~/social2scale-site
git add free-content/vitest.config.js free-content/package.json free-content/package-lock.json
git commit -m "test(free-content): Coverage-Schwelle 80%"
```

---

### Task 12: Das Beweis-Gate (live)

Spec §10. **Sebis Nicht-Verhandelbares:** „es dürfen halt nie Duplikate bzw. Bots funktionieren — das muss alles geproved werden". Bis hierher ist alles lokal bewiesen; jetzt gegen die echte Instanz.

**Files:**
- Create: `~/social2scale-site/free-content/test/live-gate.sh`

**Interfaces:**
- Consumes: den deployten Worker unter `start.social2scale.com`.

- [ ] **Step 1: Produktiv-Migration (nach Sebis Go)**

```bash
cd ~/social2scale-clients/_portal
npx wrangler d1 execute s2s-crm --remote --file=./migrate-v10.sql
```

Erwartung: erfolgreich. Prüfen, dass die bestehenden Tabellen unberührt sind:

```bash
npx wrangler d1 execute s2s-crm --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Erwartung: alle bisherigen Tabellen plus `free_leads` und `free_intake_log`.

- [ ] **Step 2: Secrets setzen**

```bash
cd ~/social2scale-site/free-content
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put TURNSTILE_SECRET
```

- [ ] **Step 3: Deployen + Custom Domain**

```bash
npx wrangler deploy
```

Danach im Cloudflare-Dashboard `start.social2scale.com` als Custom Domain auf den Worker legen.

- [ ] **Step 4: Live-Gate-Skript anlegen** — `test/live-gate.sh`

```bash
#!/usr/bin/env bash
# Beweis-Gate gegen die LIVE-Instanz (Spec §10).
# Nutzung: bash test/live-gate.sh
set -uo pipefail

BASE="https://start.social2scale.com"
FAILED=0

pruefe() { # name erwartet tatsaechlich
  if [ "$2" = "$3" ]; then
    echo "  OK   $1 ($3)"
  else
    echo "  FAIL $1 — erwartet $2, war $3"
    FAILED=1
  fi
}

code() { # json-body -> HTTP-Code
  curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/free-content" \
    -H 'Content-Type: application/json' -d "$1"
}

echo "== Free-Content Live-Gate =="

pruefe "health" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/health")"

# Turnstile ist live scharf -> ohne gueltiges Token muss 403 kommen.
pruefe "ohne Turnstile -> 403" "403" \
  "$(code '{"name":"T","email":"t@gmail.com","handle":"@t.test","branche":"X","ziel":"Y","stimmung":"ruhig","consent":true,"elapsed":9000}')"

pruefe "falsche Methode -> 405" "405" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/free-content")"

pruefe "unbekannter Token -> 200 Fehlerseite" "200" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/c/gibtsnicht")"

if [ "$FAILED" -eq 0 ]; then
  echo "== Gate GRUEN =="
else
  echo "== Gate ROT =="
  exit 1
fi
```

- [ ] **Step 5: Gate laufen lassen**

```bash
cd ~/social2scale-site/free-content && bash test/live-gate.sh
```

Erwartung: `== Gate GRUEN ==`

- [ ] **Step 6: Happy Path von Hand einmal durchspielen**

Da Turnstile live scharf ist, braucht der Happy Path einen Browser. Ein Minimal-Formular mit dem Turnstile-Widget lokal öffnen (`wrangler dev`) und einmal absenden. Prüfen:

```bash
npx wrangler d1 execute s2s-crm --remote --command="SELECT id, email_norm, handle_norm, status, resend_count FROM free_leads ORDER BY id DESC LIMIT 5"
```

Erwartung: genau **eine** Zeile, `status='pending'`. Dann Mail abwarten, Link klicken, erneut prüfen:

Erwartung: dieselbe Zeile, jetzt `status='confirmed'`, `token_used_at` gesetzt.

**Explizit mitprüfen:** Kam die Mail im Posteingang an oder im Spam? Das ist der Single Point of Failure aus Spec §11 — wenn sie im Spam landet, ist SPF/DKIM/DMARC zu klären, **bevor** Plan 3 live geht.

- [ ] **Step 7: Duplikat live beweisen**

Dasselbe Formular nochmal absenden, mit `+tag`-Variante derselben Gmail-Adresse.

```bash
npx wrangler d1 execute s2s-crm --remote --command="SELECT COUNT(*) AS c FROM free_leads WHERE email_norm LIKE '%@gmail.com'"
```

Erwartung: unverändert **1** — kein zweiter Eintrag.

- [ ] **Step 8: Testdaten aufräumen**

```bash
npx wrangler d1 execute s2s-crm --remote --command="DELETE FROM free_leads WHERE source='test' OR email LIKE '%@example.%'"
```

**Vor dem Löschen die betroffenen Zeilen einzeln ansehen** — die DB ist produktiv. (Lesson 02.07.: beim Testdaten-Cleanup wurde versehentlich eine echte Zeile mitgelöscht.)

- [ ] **Step 9: Commit + Push**

```bash
cd ~/social2scale-site
git add free-content/test/live-gate.sh
git commit -m "test(free-content): Live-Beweis-Gate"
git push -u origin feat/free-content-funnel
```

---

## Definition of Done (Plan 1)

- [ ] `BROWSER`-Binding-Verfügbarkeit geklärt und an Sebi gemeldet (Task 0)
- [ ] `npm test` grün, Coverage ≥ 80 %
- [ ] `bash test/live-gate.sh` → `Gate GRUEN`
- [ ] Vier Gmail-Schreibweisen erzeugen live **eine** Zeile
- [ ] Bestätigter Handle blockiert fremde Mails; unbestätigter blockiert nicht
- [ ] Token einmalig, 24 h, abgelaufener Token sperrt niemanden dauerhaft aus
- [ ] Resend-Deckel greift (3/Stunde)
- [ ] Zustellbarkeit der Bestätigungsmail geprüft (Posteingang vs. Spam)
- [ ] Bestehende CRM-Tabellen unverändert
- [ ] Testdaten aufgeräumt

## Was NICHT in diesem Plan ist

Bildgenerierung, Browser Rendering, Wasserzeichen, R2, Claude, Build-Screen, Ergebnisseite, Look-Switcher, CRM-Karte, Digistore-Button, `/free`-Redirect, OG-Card, Datenschutz-Text.

**Plan 2 (Generierung)** und **Plan 3 (Erlebnis — erst nach Sebis Look-Wahl aus dem Design-Pass)** folgen.
</content>
