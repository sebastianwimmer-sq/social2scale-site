#!/usr/bin/env bash
# Alle Browser-Tore der Website in einem Befehl, VOR dem Commit (kern.md:
# "Ein Tor, das niemand aufruft, ist kein Tor"). Selbsttests laufen zuerst —
# ein Tor, dem man nicht glauben kann, macht jede gruene Meldung wertlos.
set -uo pipefail
cd "$(dirname "$0")/.."
rot=0
lauf() { echo; echo "── $1"; shift; "$@" || rot=$((rot+1)); }

lauf "Selbsttest Seitenwechsel"  node scripts/uebergang-check.mjs --selbsttest
lauf "Selbsttest Bewegung"       node scripts/bewegung-check.mjs --selbsttest
lauf "CSP gehaertet"             node scripts/csp-haerten.mjs --pruefen
lauf "CSP im Browser"            node scripts/csp-pruefen-browser.mjs
lauf "Seitenwechsel"             node scripts/uebergang-check.mjs
lauf "Bewegung"                  node scripts/bewegung-check.mjs
lauf "Aussagen (Register s2s)"   env S2S_SITE="$PWD" python3 "$HOME/kit-build/aussagen-check.py" s2s

echo
if [ "$rot" -eq 0 ]; then echo "✓ pruefen.sh: alle Tore gruen"; else echo "✗ pruefen.sh: $rot Tor(e) rot"; fi
exit "$rot"
