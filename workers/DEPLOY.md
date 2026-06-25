# s2s-anfrage Worker — Deploy in 6 Schritten

Dieser Worker nimmt die `/anfrage/`-Form entgegen → legt einen **Brevo-Kontakt** an + schickt euch eine **Benachrichtigungs-Mail**. Kein Third-Party-Formanbieter, Daten laufen nur über euer Brevo.

## Voraussetzungen (parallel schon erledigbar)
- **Brevo-Liste** „social2scale Leads" angelegt → **Listen-ID** notiert.
- **Brevo-API-Key** erzeugt (Settings → SMTP & API → API Keys) → sicher abgelegt.
- Node installiert (`node -v`).

## Schritte

**1. Wrangler holen & einloggen**
```bash
cd workers
npm install -g wrangler        # falls noch nicht da
wrangler login                 # öffnet Browser → euren Cloudflare-Account wählen
```

**2. Listen-ID eintragen**
In `wrangler.toml` `BREVO_LIST_ID = "REPLACE_WITH_LIST_ID"` durch eure echte Zahl ersetzen.
(Optional `NOTIFY_TO` / `NOTIFY_FROM` anpassen — Default `info@social2scale.com`.)

**3. API-Key als Secret setzen** (kommt NICHT in den Code/ins Repo)
```bash
wrangler secret put BREVO_API_KEY      # Brevo-API-Key einfügen + Enter
wrangler secret put TURNSTILE_SECRET   # Turnstile Secret Key einfügen + Enter
```

**4. Deployen**
```bash
wrangler deploy
```
→ Wrangler gibt euch die Live-URL aus, z. B. `https://s2s-anfrage.<euer-subdomain>.workers.dev`
**Diese URL schickst du mir** — dann trage ich sie in `/anfrage/` (ENDPOINT) + die CSP ein.
(Alternativ selbst ersetzen: in `anfrage/index.html` `s2s-anfrage.PLACEHOLDER.workers.dev` → eure echte Subdomain, an 2 Stellen: `const ENDPOINT` im Script **und** in der `<meta … Content-Security-Policy>` bei `connect-src`.)

**5. Brevo-Attribute anlegen** (einmalig, damit die Felder in Brevo ankommen)
Brevo → Contacts → Settings → Contact attributes → diese Text-Attribute anlegen:
`VORNAME, BUSINESS, STATUS, ZIEL, BUDGET, QUELLE` (Typ Text). `SMS` existiert bei Brevo schon (= Telefon).

**6. Testen**
Auf `https://social2scale.com/anfrage/` das Formular absenden → Kontakt sollte in der Brevo-Liste auftauchen + Mail bei euch ankommen.

## Custom-Domain (optional, später)
Statt `*.workers.dev` könnt ihr eine Route `anfrage.social2scale.com` in Cloudflare binden — dann ist auch die CSP sauberer (`connect-src 'self'` reicht, wenn same-site). Sag Bescheid, wenn du das willst.

## Felder, die der Worker erwartet (Vertrag mit /anfrage/)
`name, email, phone, business, status, goal, budget` (+ Honeypot `website`, muss leer sein).
