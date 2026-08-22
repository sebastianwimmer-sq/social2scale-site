# Woher dieser Quelltext kommt

**Wiederhergestellt am 23.08.2026 aus einer Quelltext-Karte — er lag nicht mehr
auf der Platte.**

## Was passiert war

Der Worker `s2s-free-content` liefert `start.social2scale.com` aus (über die
Pages-Brücke in `../start-proxy/`). Am 23.08.2026 war sein Quelltext auf keinem
Rechner mehr auffindbar: `free-content/src/` war leer, und kein anderer Ordner
enthielt auch nur einen der Sätze der Live-Seite. Der Funnel lief — aber
**niemand hätte ihn ändern können.**

Gefunden wurde er im Zwischenspeicher von `wrangler dev`:
`.wrangler/tmp/dev-tk7YgH/index.js.map` (12.08.2026) enthielt die vollständigen
Originaldateien in `sourcesContent`. Die letzte Auslieferung des Workers stammt
vom 12.08.2026, 05:42 — die Karte ist zwei Stunden jünger.

## Gegenprüfung

Zehn Überschriften der **Live-Seite** gegen den wiederhergestellten Quelltext
gehalten: **10 von 10 gefunden**. Es ist der Stand, der läuft.

## ⚠️ Vor der nächsten Auslieferung

Die **Bau-Konfiguration ist nicht mit wiederhergestellt** — in der Karte stehen
nur die Quelldateien, keine `wrangler.toml`. Wer diesen Worker deployen will,
muss sie erst rekonstruieren (Name `s2s-free-content`, Bindings für D1, R2, KV
und die Secrets aus dem Cloudflare-Dashboard ablesen). **Nicht raten** — ein
Deploy mit falschen Bindings nimmt den laufenden Funnel vom Netz.

## Welche Bindings der Worker braucht

Aus dem Quelltext abgelesen (`env.…`) — das ist die Liste, gegen die eine
rekonstruierte `wrangler.toml` geprüft werden muss:

- `AI_MODEL`
- `ALLOW_ORIGIN`
- `ANTHROPIC_API_KEY`
- `BREVO_API_KEY`
- `BROWSER`
- `GEN_QUEUE`
- `IMAGES`
- `MODERATION_MODEL`
- `NOTIFY_FROM`
- `NOTIFY_TO`
- `PUBLIC_ORIGIN`
- `TURNSTILE_SECRET`

Secret-Scan des wiederhergestellten Codes am 23.08.: **sauber** — kein
Schlüssel im Klartext, alle Geheimnisse kommen aus der Umgebung.

## Bekannter offener Punkt

`start.social2scale.com` hat **kein `<h1>`** — elf Überschriften, alle ab `h2`.
Für Suchmaschinen und Vorleseprogramme ein Mangel. Die erste Überschrift
(„Schau zu, wie dein Feed entsteht.") gehört auf `h1`. Bewusst noch nicht
geändert: dieser Ordner ist erst wieder eine verlässliche Grundlage, wenn die
Bau-Konfiguration steht.
