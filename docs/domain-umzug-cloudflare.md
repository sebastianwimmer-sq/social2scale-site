# Domain-Umzug social2scale.com zu Cloudflare — Checkliste

**Warum überhaupt:** `start.social2scale.com` soll auf den Free-Content-Funnel zeigen.
Der Funnel ist ein **Cloudflare Worker** (er braucht Queue + Browser Rendering), und
eine eigene Domain für einen Worker geht bei Cloudflare **nur, wenn die Domain bei
Cloudflare liegt**. Aktuell liegt sie bei IONOS (`ns*.ui-dns.*`).

Die bestehenden Unterseiten (`mein.` / `closing.` / `hosting.`) funktionieren ohne
Umzug, weil das **Cloudflare Pages** ist — dafür reicht ein CNAME von IONOS aus.
Für Worker gilt das nicht.

---

## ⚠️ Das eine echte Risiko: die Firmen-Mail

`info@social2scale.com` läuft über IONOS. Wenn beim Umzug die Mail-Einträge nicht
exakt mitkommen, ist der **Mailempfang weg** — und das merkt man oft erst Tage
später, wenn jemand sagt „ich hab dir doch geschrieben".

Deshalb: **nach Schritt 2 anhalten** und die Liste gegen die Bestandsaufnahme unten
prüfen, bevor die Nameserver umgestellt werden.

---

## Ablauf

| # | Wer | Was |
|---|-----|-----|
| 1 | Sebi | Cloudflare → **Add a site** → `social2scale.com` → **Free**-Plan |
| 2 | Sebi | Cloudflare liest die IONOS-Einträge automatisch ein und zeigt sie als Liste |
| 3 | **Claude** | **STOPP.** Liste gegen die Bestandsaufnahme unten prüfen, Fehlendes nachtragen |
| 4 | Sebi | Erst jetzt: bei IONOS die Nameserver auf die zwei Cloudflare-Adressen ändern |
| 5 | — | Warten (meist Minuten, im Extremfall bis 24 h) |
| 6 | **Claude** | Worker `s2s-free-content` → Settings → **Custom Domain** → `start.social2scale.com`; danach `PUBLIC_ORIGIN` in `free-content/wrangler.toml` umstellen + deployen (sonst zeigt der QR-Code der Share-Karte weiter auf workers.dev) |

---

## Bestandsaufnahme (erhoben 27.07.2026)

Jede dieser Zeilen muss den Umzug überleben. Fehlt eine in Cloudflares Liste
→ **vor** Schritt 4 nachtragen.

### Mail — kritisch
```
MX    @      10  mx00.ionos.de
MX    @      10  mx01.ionos.de
TXT   @      "v=spf1 include:_spf-eu.ionos.com ~all"
TXT   @      "brevo-code:c8c774c16dc73361f76297cb33c7ca37"
TXT   _dmarc "v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com"
```
Der `brevo-code` ist die Domain-Verifizierung für den Mailversand des Funnels
(Bestätigungsmails). Fällt der weg, kommen die Mails nicht mehr an.

### Website (GitHub Pages)
```
A      @    185.199.108.153
A      @    185.199.109.153
A      @    185.199.110.153
A      @    185.199.111.153
CNAME  www  sebastianwimmer-sq.github.io
```
⚠️ Nach dem Umzug für `@` und `www` in Cloudflare **Proxy auf „DNS only" (graue
Wolke)** stellen — GitHub Pages stellt sein eigenes Zertifikat aus; der
Cloudflare-Proxy davor kann eine Zertifikats-Endlosschleife auslösen.

### Bestehende Unterseiten (Cloudflare Pages)
```
CNAME  mein     s2s-closing.pages.dev
CNAME  closing  s2s-closing.pages.dev
CNAME  hosting  s2s-hosting.pages.dev
```

### Neu, kommt erst in Schritt 6
```
start.social2scale.com  ->  Worker s2s-free-content (Custom Domain, kein manueller DNS-Eintrag nötig)
```

---

## Wenn der Umzug nicht stattfindet

Der Funnel läuft unverändert auf `https://s2s-free-content.peaking.workers.dev`.
Alles funktioniert; die Adresse sieht nur nicht nach social2scale aus, und der
QR-Code auf der Share-Karte führt dorthin. Für den ersten echten Lead (26./27.07.)
hat das gereicht — vor öffentlicher Bewerbung sollte die Domain aber stehen.
