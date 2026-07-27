# Domain-Umzug social2scale.com zu Cloudflare — Schritt für Schritt

**Ziel:** `start.social2scale.com` zeigt auf den Free-Content-Funnel.
**Stand der Anleitung:** 27.07.2026. Bestandsaufnahme unten am selben Tag erhoben.

---

## Warum es überhaupt sein muss (drei Gründe, keiner davon Optik)

1. **„peaking" steht in der URL.** Der Funnel läuft auf
   `s2s-free-content.peaking.workers.dev`. Am 20.07. wurde PEAKING bewusst aus allem
   Kundenseitigen entfernt — und ausgerechnet der Neukunden-Funnel trägt den alten
   Markennamen sichtbar in der Adresse.
2. **Zustellbarkeit der Bestätigungsmail.** Sie kommt von `social2scale.com` und
   verlinkt auf `peaking.workers.dev`. Absender ≠ Linkziel ist ein klassisches
   Spamfilter-Signal, und `workers.dev` ist eine geteilte Domain mit gemischtem Ruf.
   Diese Mail ist der Single Point of Failure des Funnels: Kommt sie nicht an,
   stirbt er lautlos.
3. **Der QR-Code auf der Share-Karte** zeigt dorthin — genau der virale Loop, für
   den er gebaut wurde.

## Warum ein CNAME bei IONOS NICHT reicht

Verifiziert an der Cloudflare-Doku (27.07.2026), Custom Domains für Worker:

> „An active Cloudflare zone." … „You cannot create a Custom Domain on a hostname
> with an existing CNAME DNS record or on a zone you do not own."

**Warum sich das widersprüchlich anfühlt:** `mein.` / `closing.` / `hosting.` laufen
bei euch tatsächlich per CNAME von IONOS aus. Die zeigen aber auf **Cloudflare
Pages** — und Pages darf das. Der Funnel ist ein **Worker** (er braucht Queue +
Browser Rendering), und für Worker gilt die Regel oben.

**Auch geprüft und verworfen:** nur die Subdomain `start.` an Cloudflare delegieren
und die Hauptdomain bei IONOS lassen. Das gibt es (Subdomain-Zonen), ist laut Doku
aber **Enterprise-only** (Free: nein · Pro: nein · Business: nein).

**Bleibt:** ganze Zone umziehen — oder auf workers.dev bleiben.
💡 Ungeprüfte Zwischenlösung, falls der Umzug sich zieht: Die Konto-Subdomain
„peaking" ist eine Account-Einstellung und lässt sich möglicherweise umbenennen.
Das würde wenigstens Grund 1 sofort beheben — ändert aber die URLs **aller** Worker
dieses Accounts. Vorher prüfen, was sonst noch darauf zeigt.

---

## ⚠️ Das eine echte Risiko: die Firmen-Mail

`info@social2scale.com` läuft über IONOS. Kommen die Mail-Einträge beim Umzug nicht
sauber mit, ist der Mailempfang weg — und das merkt man oft erst Tage später, wenn
jemand sagt „ich hab dir doch geschrieben".

Deshalb: **nach Schritt 2 anhalten.** Nicht durchklicken.

---

## Der Ablauf

| # | Wer | Was |
|---|-----|-----|
| 1 | Sebi | Cloudflare → **Add a site** → `social2scale.com` → **Free**-Plan |
| 2 | Sebi | Cloudflare liest die IONOS-Einträge ein und zeigt sie als Liste |
| 3 | **Claude** | **STOPP.** Liste gegen die Bestandsaufnahme unten prüfen, Fehlendes nachtragen |
| 4 | Sebi | Bei IONOS die Nameserver auf die zwei Cloudflare-Adressen ändern |
| 5 | — | Warten (meist Minuten, im Extremfall bis 24 h) |
| 6 | **Claude** | Sofort-Checks (unten), dann Worker-Custom-Domain + `PUBLIC_ORIGIN` umstellen |

**Du machst 1, 2 und 4. Alles andere mache ich.**

---

## Bestandsaufnahme — was den Umzug überleben MUSS

Erhoben am 27.07.2026. Fehlt eine Zeile in Cloudflares Liste → **vor Schritt 4**
nachtragen.

### Mail — kritisch
```
MX    @        10  mx00.ionos.de
MX    @        10  mx01.ionos.de
TXT   @        "v=spf1 include:_spf-eu.ionos.com ~all"
TXT   @        "brevo-code:c8c774c16dc73361f76297cb33c7ca37"
TXT   _dmarc   "v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com"
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

### Bestehende Unterseiten (Cloudflare Pages)
```
CNAME  mein     s2s-closing.pages.dev
CNAME  closing  s2s-closing.pages.dev
CNAME  hosting  s2s-hosting.pages.dev
```

---

## Die Fallen — was erfahrungsgemäß schiefgeht

**1 · Die orange Wolke auf der Hauptdomain.**
Cloudflare stellt neue Einträge standardmäßig auf „Proxied" (orange Wolke). Für `@`
und `www` (GitHub Pages) muss auf **„DNS only" (graue Wolke)** gestellt werden —
GitHub stellt sein eigenes Zertifikat aus, und der Proxy davor kann eine
Zertifikats-Endlosschleife auslösen. Symptom: Seite nicht erreichbar oder
Zertifikatswarnung.

**2 · Die Pages-Unterseiten hängen kurz.**
`mein.` / `closing.` / `hosting.` zeigen auf `*.pages.dev`. Sobald die Zone bei
Cloudflare liegt, sieht Pages diese Domains als „eigene" — es kann sein, dass sie im
Pages-Dashboard **einmal neu bestätigt** werden müssen. **Das trifft das
Kundenportal**, also direkt nach dem Umschalten prüfen, nicht erst am nächsten Tag.

**3 · Die Auto-Übernahme ist nicht vollständig.**
Cloudflare liest, was es per DNS-Abfrage findet. Einträge, die IONOS nicht ausliefert
oder die exotisch sind, fehlen still. Deshalb Schritt 3 — Vergleich gegen die Liste
oben, nicht gegen das Gefühl.

**4 · Mail „sieht ok aus" ist kein Beweis.**
Nach dem Umschalten von einer **externen** Adresse (Gmail o. ä.) eine Testmail an
`info@social2scale.com` schicken und den Empfang bestätigen. Records anschauen reicht
nicht — SPF/DMARC-Fehler zeigen sich erst beim echten Zustellversuch.

**5 · IONOS-Einträge nicht sofort löschen.**
Die alte Zone bei IONOS stehen lassen, bis alles läuft. Sie ist das Rückfallnetz.

**6 · Rollback.**
Geht etwas schief: bei IONOS die alten Nameserver wieder eintragen. Wirkt nicht
sofort (DNS-Caches), aber zuverlässig. Deshalb Punkt 5.

**7 · Das Zertifikat braucht ein paar Minuten.**
Direkt nach dem Umschalten kann `https://` kurz meckern. Vor dem Panikanruf zehn
Minuten warten.

---

## Sofort-Checks nach dem Umschalten (Schritt 6, Claude)

```bash
dig +short NS social2scale.com          # zeigt Cloudflare-Nameserver?
dig +short MX social2scale.com          # mx00/mx01.ionos.de noch da?
dig +short TXT social2scale.com         # SPF + brevo-code noch da?
curl -sI https://social2scale.com | head -1        # 200?
curl -sI https://mein.social2scale.com | head -1   # Kundenportal noch erreichbar?
```
Dazu: echte Testmail von extern an `info@` (Falle 4).

Danach:
1. Worker `s2s-free-content` → Settings → **Custom Domain** → `start.social2scale.com`
2. `free-content/wrangler.toml`: `PUBLIC_ORIGIN` auf `https://start.social2scale.com`
3. `npx wrangler deploy`
4. `index.html` auf der Startseite: die **eine** markierte Funnel-Adresse in der
   Sektion `#gratis` austauschen (steht dort genau einmal, ist als solche kommentiert)
5. Gegenprobe: Formular → Bestätigungsmail → Link zeigt auf `start.` → Share-Karte
   neu erzeugen, QR prüfen

---

## Wenn der Umzug nicht stattfindet

Der Funnel läuft unverändert auf `https://s2s-free-content.peaking.workers.dev`.
Alles funktioniert; die drei Gründe ganz oben bleiben bestehen.
