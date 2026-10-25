#!/usr/bin/env bash
# indexnow.sh — meldet alle Sitemap-Seiten an IndexNow (Bing, Yandex, Seznam,
# Naver; darueber auch DuckDuckGo, Ecosia, Yahoo). Kostenlos, kein Konto.
#
#   bash scripts/indexnow.sh
#
# Erst NACH dem Deploy laufen lassen: IndexNow holt zur Bestaetigung die
# Schluesseldatei von der Live-Domain. Liegt sie dort nicht, antwortet es 403.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
HOST="social2scale.com"
SCHLUESSEL_DATEI=$(ls | grep -E '^[0-9a-f]{32}\.txt$' | head -1 || true)
[ -n "$SCHLUESSEL_DATEI" ] || { echo "🔴 keine IndexNow-Schluesseldatei im Wurzelordner"; exit 1; }
KEY="${SCHLUESSEL_DATEI%.txt}"

LIVE=$(curl -fsS "https://$HOST/$SCHLUESSEL_DATEI" || true)
[ "$LIVE" = "$KEY" ] || { echo "🔴 https://$HOST/$SCHLUESSEL_DATEI liefert nicht den Schluessel — erst deployen"; exit 1; }

URLS=$(grep -oE '<loc>[^<]+</loc>' sitemap.xml | sed -E 's#</?loc>##g' | python3 -c 'import json,sys;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "https://api.indexnow.org/indexnow" \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$SCHLUESSEL_DATEI\",\"urlList\":$URLS}")
ANZAHL=$(echo "$URLS" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))')
case "$CODE" in
  200|202) echo "✓ IndexNow: $ANZAHL Seiten gemeldet (HTTP $CODE)";;
  *) echo "🔴 IndexNow antwortet HTTP $CODE"; exit 1;;
esac
