# Free-Content-Lead → CRM: Implementierungsplan (Abend 27.07.2026)

> **Für agentische Worker:** Umsetzung task-by-task via `superpowers:executing-plans`.
> Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Ein Free-Content-Lead landet nicht mehr als loser Zettel im Eingang, sondern
als verknüpfte Kundenkarte mit Link zum Feed — und Phil kann morgen früh bei Regina
mit voller Information einsteigen.

**Architektur:** Alles im Funnel-Worker (`free-content/`), den ich selbst ausrollen kann.
Das Portal bleibt unangetastet (kein Git, Deploy = Sebi). `mirrorToCrm()` wird von
„eine Zeile schreiben" zu „Karte anlegen, verknüpfen, nicht doppeln". Die Kartenanlage
kopiert exakt das Muster, das das Portal für Briefings schon benutzt
(`_portal/_worker.js:1084`), damit die Zeilen identisch aussehen.

**Tech-Stack:** Cloudflare Worker · D1 (SQLite) · Vitest · Brevo

## Globale Vorgaben

- Kartenstatus heute Abend: **`briefing`** — nicht `lead`. Die Portal-Oberfläche
  validiert Stufen beim Speichern (`_worker.js:2902`); eine unbekannte Stufe würde beim
  ersten Speichern durch Phil auf `briefing` zurückspringen. Saubere `lead`-Stufe später,
  braucht Portal-Deploy durch Sebi.
- Herkunft muss auf der Karte unmissverständlich sein (`notes` beginnt mit
  „Automatisch aus Free-Content-Funnel").
- Keine personenbezogenen Daten in Commit-Messages oder Memory-Dateien.
- `mirrorToCrm` darf **nie werfen** — es läuft nach committetem `status='ready'`.
  Ein Fehler dort darf ihren fertigen Feed nicht kippen (bestehender Test deckt das ab).
- Nach jedem Task: `npx vitest run` muss grün sein (aktuell 243 Tests).

---

### Task 1: Regina sofort arbeitsfähig (kein Code)

**Warum zuerst:** Wenn der Abend abbricht, hat Phil morgen trotzdem, was er braucht.

**Dateien:** keine — reiner D1-Schreibvorgang gegen `s2s-crm` (remote).

- [ ] **Schritt 1: Reginas Daten holen**

```bash
cd ~/social2scale-site/free-content
npx wrangler d1 execute s2s-crm --remote --json --command \
  "SELECT id, name, email, handle, branche, ziel, stimmung, token FROM free_leads WHERE id=7"
```

- [ ] **Schritt 2: Kundenkarte anlegen** (Spaltenreihenfolge exakt wie `_portal/_worker.js:1087`)

```sql
INSERT INTO clients (name, niche, status, accounts, password, deck_paths,
                     contact, notes, package, service, upsell, upsell_flag,
                     logo_key, updated_at)
VALUES ('Regina', '<branche>', 'briefing', '["@newspirit_consciousliving"]', '', '[]',
        '<email>', 'Automatisch aus Free-Content-Funnel · Ziel: <ziel> · Stimmung: <stimmung> · Feed: https://s2s-free-content.peaking.workers.dev/r/<token>',
        '', '', '', 0, '', datetime('now'));
```

- [ ] **Schritt 3: Eingangszeile #86 mit der neuen Karte verknüpfen**

```sql
UPDATE submissions SET client_id = (SELECT id FROM clients WHERE name='Regina') WHERE id=86;
```

- [ ] **Schritt 4: Kontrolle — genau eine Karte, Eingang verknüpft**

```bash
npx wrangler d1 execute s2s-crm --remote --json --command \
  "SELECT s.id, s.client_id, c.name, c.status FROM submissions s LEFT JOIN clients c ON c.id=s.client_id WHERE s.id=86"
```
Erwartet: `client_id` gesetzt, `status='briefing'`.

- [ ] **Schritt 5: Im CRM nachsehen** (`closing.social2scale.com`) — Karte erscheint,
  Eingangsnachricht hängt dran, KI-Knöpfe sind bedienbar.

---

### Task 2: Copy markiert zurückgefallene Posts

**Warum:** Reginas Fall (Profil gut, 2 von 3 Posts generisch) löste **keinen** Alarm aus.
Ohne Markierung kann `generate.js` gar nicht wissen, dass etwas fehlte.

**Dateien:**
- Modify: `free-content/src/copy.js` (Ende von `generateCopy`)
- Test: `free-content/test/copy.test.js`

**Interfaces:**
- Produces: `copy._backfilled` = Array der 1-basierten Post-Nummern, die aus dem
  Fallback stammen. Fehlt oder leer = alle Posts echt.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
it('markiert, welche Posts aus dem Fallback stammen (sonst faellt ein Teilausfall nie auf)', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // Post 1 und 3 kaputt, Post 2 gut — exakt Reginas Fall vom 27.07.
  vi.stubGlobal('fetch', claudeMock(kernOk, [
    { slides: [], caption: '' }, postFixture('b'), { slides: [], caption: '' },
  ]));
  const c = await generateCopy(envOk, clean);
  expect(c._backfilled).toEqual([1, 3]);
  pruefePosts(c.posts);              // trotzdem 3 vollstaendige Posts
});

it('markiert nichts, wenn alle Posts echt sind', async () => {
  vi.stubGlobal('fetch', claudeMock(kernOk, [postFixture('a'), postFixture('b'), postFixture('c')]));
  const c = await generateCopy(envOk, clean);
  expect(c._backfilled ?? []).toEqual([]);
});
```

- [ ] **Schritt 2: Rot sehen**

Run: `npx vitest run test/copy.test.js -t "markiert"`
Erwartet: FAIL — `expected undefined to deeply equal [ 1, 3 ]`

- [ ] **Schritt 3: Minimal implementieren**

```js
  const fbPosts = buildFallback(clean).posts;
  const backfilled = [];
  const posts = rohPosts.map((p, i) => {
    if (postOk(p)) return p;
    console.error(`[copy] post${i + 1} ungueltig — backfill. Keys:`, Object.keys(p || {}).join(','));
    backfilled.push(i + 1);
    return fbPosts[i];
  });

  return { ...prof, posts, _backfilled: backfilled };
```

- [ ] **Schritt 4: Grün sehen** — `npx vitest run test/copy.test.js`

- [ ] **Schritt 5: Committen**

```bash
git add free-content/src/copy.js free-content/test/copy.test.js
git commit -m "feat(free-content): Copy markiert zurueckgefallene Posts (_backfilled)"
```

---

### Task 3: Alarm bei Teilausfall

**Dateien:**
- Modify: `free-content/src/generate.js` (nach dem bestehenden `_fallback`-Block, ~Zeile 163)
- Test: `free-content/test/generate.test.js`

**Interfaces:**
- Consumes: `copy._backfilled` aus Task 2.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
it('alarmiert, wenn nur EINZELNE Posts auf den Fallback fielen (Reginas Fall)', async () => {
  const mails = [];
  const env = await testEnv({ onMail: (m) => mails.push(m) });
  await seedConfirmedLead(env, 'tok-teilausfall');
  vi.spyOn(copyModul, 'generateCopy').mockResolvedValue({ ...gueltigeCopy, _backfilled: [1, 3] });

  await generateFor(env, 'tok-teilausfall');

  const alarm = mails.find((m) => /TEIL-FALLBACK/.test(m.subject));
  expect(alarm, 'kein Alarm bei Teilausfall').toBeTruthy();
  expect(alarm.subject).toContain('1, 3');
});
```
> Hinweis: Die Helfer `testEnv` / `seedConfirmedLead` existieren in `test/helpers.js`;
> die exakten Namen dort vor dem Schreiben nachschlagen und übernehmen.

- [ ] **Schritt 2: Rot sehen** — `npx vitest run test/generate.test.js -t "Teilausfall"`

- [ ] **Schritt 3: Implementieren** (direkt unter dem bestehenden `_fallback`-Block)

```js
    // Teilausfall: Profil kam durch, aber einzelne Posts fielen zurueck. Der Alarm
    // oben feuert dafuer NICHT — genau so blieb am 27.07. unbemerkt, dass eine echte
    // Interessentin 2 von 3 Posts als Platzhalter bekam.
    if (Array.isArray(copy?._backfilled) && copy._backfilled.length) {
      console.error('[generate] Teil-Fallback bei Posts', copy._backfilled.join(','), 'Lead', lead.id);
      try {
        await notifyFounders(env, lead,
          `⚠️ TEIL-FALLBACK — Post ${copy._backfilled.join(', ')} generisch. Feed pruefen, ggf. neu erzeugen.`);
      } catch (mailErr) {
        console.error('[generate] Teil-Fallback-Alarm ging nicht raus:', mailErr);
      }
    }
```

- [ ] **Schritt 4: Grün sehen** — `npx vitest run`

- [ ] **Schritt 5: Committen**

```bash
git add free-content/src/generate.js free-content/test/generate.test.js
git commit -m "feat(free-content): Alarm auch bei Teilausfall der Copy"
```

---

### Task 4: Kundenkarte automatisch anlegen und verknüpfen

**Dateien:**
- Modify: `free-content/src/generate.js` (`mirrorToCrm`)
- Test: `free-content/test/generate.test.js`

**Interfaces:**
- Produces: `mirrorToCrm(db, lead)` legt zusätzlich eine `clients`-Zeile an und setzt
  `submissions.client_id`. Rückgabe bleibt `undefined`, wirft weiterhin nie.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
it('legt eine Kundenkarte an und haengt die Eingangszeile daran', async () => {
  await mirrorToCrm(env.DB, lead);

  const karte = await env.DB.prepare('SELECT * FROM clients WHERE contact=?').bind(lead.email).first();
  expect(karte, 'keine Kundenkarte angelegt').toBeTruthy();
  expect(karte.status).toBe('briefing');
  expect(karte.niche).toBe(lead.branche);
  expect(karte.notes).toContain('Automatisch aus Free-Content-Funnel');
  expect(karte.accounts).toContain(lead.handle);

  const eingang = await env.DB.prepare("SELECT * FROM submissions WHERE type='free_content'").first();
  expect(eingang.client_id).toBe(karte.id);
});
```

- [ ] **Schritt 2: Rot sehen** — `npx vitest run test/generate.test.js -t "Kundenkarte"`

- [ ] **Schritt 3: Implementieren** — `mirrorToCrm` umbauen

```js
export async function mirrorToCrm(db, lead, publicOrigin = '') {
  const feedUrl = publicOrigin ? `${publicOrigin}/r/${lead.token}` : '';
  const md =
    '# Free-Content-Lead\n\n' +
    `- **Instagram:** @${lead.handle}\n` +
    `- **Thema:** ${lead.branche}\n` +
    `- **Ziel:** ${lead.ziel}\n` +
    `- **Stimmung:** ${lead.stimmung}\n` +
    (lead.farbe ? `- **Wunschfarbe:** ${lead.farbe}\n` : '') +
    (lead.source ? `- **Kam über:** ${lead.source}\n` : '') +
    (feedUrl ? `- **Ihr Feed:** ${feedUrl}\n` : '') +
    `- **Bilder:** ${lead.r2_prefix || '(noch keine)'}\n`;

  // Kundenkarte: Muster 1:1 aus _portal/_worker.js:1084 (dort fuer briefing/onboarding),
  // damit die Zeile im CRM aussieht wie jede andere. Status bewusst 'briefing' —
  // die Oberflaeche kennt keine Stufe davor und wuerde Unbekanntes beim Speichern
  // zurueckwerfen. Nicht-fatal: ohne Karte bleibt wenigstens der Eingang.
  let clientId = null;
  try {
    const vorhanden = await db.prepare('SELECT id FROM clients WHERE contact=?').bind(lead.email).first();
    if (vorhanden) {
      clientId = vorhanden.id;
    } else {
      const notiz =
        'Automatisch aus Free-Content-Funnel' +
        (lead.ziel ? ` · Ziel: ${lead.ziel}` : '') +
        (lead.stimmung ? ` · Stimmung: ${lead.stimmung}` : '') +
        (feedUrl ? ` · Feed: ${feedUrl}` : '');
      const angelegt = await db
        .prepare(
          `INSERT INTO clients (name, niche, status, accounts, password, deck_paths, contact, notes,
                                package, service, upsell, upsell_flag, logo_key, updated_at)
           VALUES (?, ?, 'briefing', ?, '', '[]', ?, ?, '', '', '', 0, '', datetime('now'))`
        )
        .bind(lead.name, lead.branche || '', JSON.stringify([`@${lead.handle}`]), lead.email, notiz)
        .run();
      clientId = angelegt.meta?.last_row_id ?? null;
    }
  } catch (err) {
    console.error('[generate] Kundenkarte konnte nicht angelegt werden, Lead', lead.id, err);
  }

  try {
    await db
      .prepare(
        "INSERT INTO submissions (type, client_id, name, email, payload, data, status) VALUES ('free_content', ?, ?, ?, ?, ?, 'new')"
      )
      .bind(
        clientId,
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

Aufrufstelle in `generateFor` anpassen: `await mirrorToCrm(env.DB, fertig, env.PUBLIC_ORIGIN);`

- [ ] **Schritt 4: Grün sehen** — `npx vitest run`

- [ ] **Schritt 5: Committen**

```bash
git add free-content/src/generate.js free-content/test/generate.test.js
git commit -m "feat(free-content): Lead bekommt automatisch eine verknuepfte Kundenkarte"
```

---

### Task 5: Duplikat-Schutz

**Warum:** Am 27.07. live passiert — die Neu-Generierung für Regina legte eine zweite
Eingangszeile an (#88), musste von Hand gelöscht werden.

**Dateien:**
- Modify: `free-content/src/generate.js` (`mirrorToCrm`)
- Test: `free-content/test/generate.test.js`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
it('legt bei erneuter Generierung KEINE zweite Eingangszeile an', async () => {
  await mirrorToCrm(env.DB, lead, 'https://x.test');
  await mirrorToCrm(env.DB, lead, 'https://x.test');   // Neu-Generierung

  const { results } = await env.DB.prepare("SELECT id FROM submissions WHERE type='free_content'").all();
  expect(results).toHaveLength(1);

  const karten = await env.DB.prepare('SELECT id FROM clients WHERE contact=?').bind(lead.email).all();
  expect(karten.results).toHaveLength(1);
});
```

- [ ] **Schritt 2: Rot sehen** — erwartet `expected length 1, got 2`

- [ ] **Schritt 3: Implementieren** — vor dem `INSERT INTO submissions`

```js
  // Eine erneute Generierung (Retry, manueller Neu-Anstoss) darf den Eingang nicht
  // doppeln — am 27.07. genau so passiert, Dublette musste von Hand weg.
  // Der Token ist der stabile Schluessel und steckt im data-JSON.
  const schonDa = await db
    .prepare("SELECT id FROM submissions WHERE type='free_content' AND data LIKE ?")
    .bind(`%"token":"${lead.token}"%`)
    .first()
    .catch(() => null);
  if (schonDa) {
    await db
      .prepare('UPDATE submissions SET payload=?, data=?, client_id=COALESCE(client_id, ?) WHERE id=?')
      .bind(md, JSON.stringify({ /* wie oben */ }), clientId, schonDa.id)
      .run()
      .catch((err) => console.error('[generate] Eingang-Aktualisierung fehlgeschlagen:', err));
    return;
  }
```
> Das `data`-JSON-Objekt einmal in eine Konstante ziehen (DRY) und in beiden Zweigen
> verwenden, statt es zu wiederholen.

- [ ] **Schritt 4: Grün sehen** — `npx vitest run`

- [ ] **Schritt 5: Committen**

```bash
git add free-content/src/generate.js free-content/test/generate.test.js
git commit -m "fix(free-content): Neu-Generierung doppelt den CRM-Eingang nicht mehr"
```

---

### Task 6: Founder-Mail lesbar, mit Link, an mehrere Empfänger

**Dateien:**
- Modify: `free-content/src/mail.js` (`send`, `buildFounderMail`, `notifyFounders`)
- Test: `free-content/test/mail.test.js`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

```js
it('schickt die Founder-Mail an alle konfigurierten Empfaenger', async () => {
  const gesendet = [];
  vi.stubGlobal('fetch', vi.fn(async (_u, o) => { gesendet.push(JSON.parse(o.body)); return { ok: true, status: 201, json: async () => ({}) }; }));
  await notifyFounders({ ...envOk, NOTIFY_TO: 'a@x.test, b@x.test' }, lead, 'ready');
  expect(gesendet[0].to.map((t) => t.email)).toEqual(['a@x.test', 'b@x.test']);
});

it('haengt den Link zum fertigen Feed in die Founder-Mail', async () => {
  const gesendet = [];
  vi.stubGlobal('fetch', vi.fn(async (_u, o) => { gesendet.push(JSON.parse(o.body)); return { ok: true, status: 201, json: async () => ({}) }; }));
  await notifyFounders({ ...envOk, PUBLIC_ORIGIN: 'https://x.test' }, { ...lead, token: 'abc123' }, 'ready');
  expect(gesendet[0].htmlContent).toContain('https://x.test/r/abc123');
});
```

- [ ] **Schritt 2: Rot sehen** — `npx vitest run test/mail.test.js`

- [ ] **Schritt 3: Implementieren**

```js
// send(): Empfaenger duerfen eine Komma-Liste sein — die Benachrichtigung soll an
// Sebi UND Phil persoenlich gehen, nicht nur ans Sammelpostfach, wo sie untergeht.
const empfaenger = String(to).split(',').map((e) => e.trim()).filter(Boolean).map((email) => ({ email, name }));
// ... body: { ..., to: empfaenger, ... }
```

```js
// buildFounderMail(lead, action, publicOrigin): denselben dunklen Karten-Kopf/-Fuss
// nutzen wie die Kundinnen-Mails (mailHead/MAIL_SIG_FOOTER aus pages/confirm-email.js),
// plus einen Bulletproof-CTA "Ihren Feed ansehen" auf ${publicOrigin}/r/${lead.token}.
```
`notifyFounders` reicht `env.PUBLIC_ORIGIN` durch.

- [ ] **Schritt 4: Grün sehen** — `npx vitest run`

- [ ] **Schritt 5: Committen**

```bash
git add free-content/src/mail.js free-content/test/mail.test.js
git commit -m "feat(free-content): Founder-Mail mit Feed-Link, lesbar, an mehrere Empfaenger"
```

---

### Task 7: Ausrollen und am echten Lauf beweisen

- [ ] **Schritt 1: Empfänger setzen** (nur wenn Sebi die Adressen genannt hat)

`free-content/wrangler.toml`: `NOTIFY_TO = "<sebi>, <phil>"` — sonst bleibt `info@`.

- [ ] **Schritt 2: Ausrollen**

```bash
cd ~/social2scale-site/free-content && npx wrangler deploy
```

- [ ] **Schritt 3: Testlead durch die Live-Pipeline** (Muster vom 27.07.)

Lead per D1 einfügen → `GET /c/<token>` → `/api/status` pollen bis `ready`.

- [ ] **Schritt 4: Prüfen**
  - genau **eine** Zeile in `submissions`, `client_id` gesetzt
  - genau **eine** Karte in `clients`, Status `briefing`, Notiz mit Herkunft + Feed-Link
  - Founder-Mail kam an, ist lesbar, Link führt zum Feed
  - zweiter Anstoß desselben Tokens erzeugt **keine** Dublette

- [ ] **Schritt 5: Testdaten restlos entfernen** — Lead, Karte, Eingangszeile,
  `funnel_events`, 21 R2-Objekte. Danach Gegenprobe auf 0.

- [ ] **Schritt 6: Committen + pushen**

---

## Bewusst NICHT heute Abend

- **Portal-Änderungen** (Stufe `lead`, Auto-Anlage im Portal) — kann ich nicht ausrollen.
- **Closing-KI automatisch anstoßen** — der Knopf existiert im CRM, Phil klickt ihn.
  Automatik braucht eine Portal-Entscheidung.
- **Website-Tür (Plan 4)** und **Domain-Umzug** — eigene Vorhaben.
- **Einwilligungstext prüfen** — vor der *Automatik für alle* fällig, nicht für Reginas
  Einzelfall (sie hat sich aktiv bei euch gemeldet). Siehe `docs/free-content-lead-workflow-spec.md` §5.

## Selbstprüfung gegen die Spec

| Spec §3 | Task |
|---|---|
| 3.1 Kundenkarte anlegen + verknüpfen | Task 4 (+ Task 1 für Regina) |
| 3.2 Duplikat-Schutz | Task 5 |
| 3.3 Direktlink zum Feed | Task 4 (Eingang) + Task 6 (Mail) |
| 3.4 Alarm bei Teilausfall | Task 2 + 3 |
| 3.5 Founder-Mail aufwerten | Task 6 |
| 3.6 Closing-KI anstoßen | bewusst offen (Portal) |
