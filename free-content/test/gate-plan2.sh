#!/usr/bin/env bash
# Beweis-Gate Plan 2 gegen die LIVE-Instanz.
# Das Einzige, was lokal nicht beweisbar ist: Browser Rendering + echte Secrets.
# Nutzung:  bash test/gate-plan2.sh [BASE-URL]
#   ohne Argument: https://start.social2scale.com
#   waehrend die Domain noch nicht steht, die *.workers.dev-URL uebergeben.
set -uo pipefail

BASE="${1:-https://start.social2scale.com}"
FAILED=0

pruefe() { # name erwartet tatsaechlich
  if [ "$2" = "$3" ]; then echo "  OK   $1"; else echo "  FAIL $1 — erwartet $2, war $3"; FAILED=1; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "== Plan-2-Live-Gate gegen $BASE =="

# 1. Health erreichbar
pruefe "health -> 200" "200" "$(code "$BASE/api/health")"

# 2. DIE WICHTIGSTEN ZWEI ZEILEN: ein vergessenes `wrangler secret put` schaltet
#    das Bot-Gate bzw. den Mailversand LAUTLOS aus. Das faellt sonst niemandem auf,
#    bis der erste Bot durch ist oder die erste Bestaetigungsmail nie ankommt.
HEALTH="$(curl -s "$BASE/api/health")"
case "$HEALTH" in
  *'"turnstile":true'*) echo "  OK   Turnstile-Secret gesetzt (Bot-Gate scharf)" ;;
  *) echo "  FAIL Turnstile-Secret FEHLT — Bot-Gate ist AUS! -> wrangler secret put TURNSTILE_SECRET"; FAILED=1 ;;
esac
case "$HEALTH" in
  *'"mail":true'*) echo "  OK   Brevo-Key gesetzt (Bestaetigungsmails gehen raus)" ;;
  *) echo "  FAIL Brevo-Key FEHLT — keine Mail, kein Lead! -> wrangler secret put BREVO_API_KEY"; FAILED=1 ;;
esac

# 3. Turnstile live scharf -> ohne gueltiges Token muss 403 kommen
pruefe "ohne Turnstile -> 403" "403" \
  "$(code -X POST "$BASE/api/free-content" -H 'Content-Type: application/json' \
     -d '{"name":"T","email":"t@gmail.com","handle":"@t.test","branche":"X","ziel":"Y","stimmung":"ruhig","consent":true,"elapsed":9000}')"

# 4. Methoden + unbekannte Routen
pruefe "GET auf POST-Route -> 405" "405" "$(code "$BASE/api/free-content")"
pruefe "unbekannter Status-Token -> 200 (not_found)" "200" "$(code "$BASE/api/status/deadbeefdeadbeef")"
pruefe "fehlendes Bild -> 404" "404" "$(code "$BASE/img/deadbeefdeadbeef/f-0-profil.jpg")"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "== Gate GRUEN — bereit fuer den ersten echten Lead-Test =="
else
  echo "== Gate ROT — siehe FAIL-Zeilen oben, NICHT die Domain draufzeigen =="
  exit 1
fi
