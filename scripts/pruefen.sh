#!/usr/bin/env bash
# Alle Browser-Tore der Website in einem Befehl, VOR dem Commit (kern.md:
# "Ein Tor, das niemand aufruft, ist kein Tor"). Selbsttests laufen zuerst —
# ein Tor, dem man nicht glauben kann, macht jede gruene Meldung wertlos.
set -uo pipefail
cd "$(dirname "$0")/.."
rot=0
# Werkzeuge aus kit-build; KIT_BUILD zeigt bei Bedarf auf einen Arbeitsbaum von origin/main (kern.md: Register des Checkouts)
lauf() { echo; echo "── $1"; shift; "$@" || rot=$((rot+1)); }

lauf "Selbsttest Seitenwechsel"  node scripts/uebergang-check.mjs --selbsttest
lauf "Selbsttest Bewegung"       node scripts/bewegung-check.mjs --selbsttest
lauf "Selbsttest Raum"          node scripts/raum-check.mjs --selbsttest
lauf "Selbsttest Szenen"        node scripts/szenen-check.mjs --selbsttest
lauf "Selbsttest Startseite"    node scripts/start-check.mjs --selbsttest
lauf "Selbsttest Bedienung"      node scripts/bedienung-check.mjs --selbsttest
lauf "Selbsttest Bildschärfe"    node scripts/bild-schaerfe-check.mjs --selbsttest
lauf "Selbsttest Sprachen"      node scripts/sprachen-check.mjs --selbsttest
lauf "Selbsttest Zähler"        node scripts/zaehler-check.mjs --selbsttest
lauf "Selbsttest Sitemap"       node scripts/sitemap-check.mjs --selbsttest
lauf "Platzhalter (Fixtures)"   python3 "${KIT_BUILD:-$HOME/kit-build}/platzhalter-check.py" --selbsttest
lauf "Selbsttest Motion-Loop"   node "${KIT_BUILD:-$HOME/kit-build}/motion-loop/mess.mjs" --selbsttest
# Vor jedem Browser-Lauf: kein Testserver darf ins WLAN horchen oder aus dem Baum lesen (12.10.2026)
lauf "Funnel-Tests"              node --test free-content/test/alte-adresse.test.mjs tests/bewertungen.test.mjs
lauf "Server nur lokal"          node "${KIT_BUILD:-$HOME/kit-build}/server-lokal-check.mjs" "$PWD/scripts" "$PWD/free-content/src"
# Zweisprachig (17.10.2026): jede DE-Seite hat eine aktuelle EN-Schwester
lauf "Sprachen DE/EN"           node scripts/sprachen-check.mjs
lauf "Zähler kennt jede Seite"  node scripts/zaehler-check.mjs
lauf "Sitemap nur echte Seiten"  node scripts/sitemap-check.mjs
lauf "Keine Platzhalter-Werte"  python3 "${KIT_BUILD:-$HOME/kit-build}/platzhalter-check.py" .
lauf "CSP gehaertet"             node scripts/csp-haerten.mjs --pruefen
lauf "CSP im Browser"            node scripts/csp-pruefen-browser.mjs
lauf "Seitenwechsel"             node scripts/uebergang-check.mjs
lauf "Bewegung"                  node scripts/bewegung-check.mjs
lauf "Raum je Seite (Quelle)"   node scripts/raum-bauen.mjs --pruefen
lauf "Raum (Lichtstudio)"        node scripts/raum-check.mjs
lauf "Szenen je Abschnitt (Quelle)" node scripts/szenen-bauen.mjs --pruefen
lauf "Szenen je Abschnitt"      node scripts/szenen-check.mjs
lauf "Startseite (Lichtstudio)"  node scripts/start-check.mjs
lauf "Bedienung (Knöpfe)"        node scripts/bedienung-check.mjs
lauf "Bildschärfe"              node scripts/bild-schaerfe-check.mjs
lauf "Bewegung gegen Entscheidung" env MOTION_WURZEL="$PWD" node "${KIT_BUILD:-$HOME/kit-build}/motion-loop/mess.mjs" s2s
lauf "Bewegung im Funnel"        env FUNNEL_QUELLE="$PWD/free-content" node "${KIT_BUILD:-$HOME/kit-build}/motion-loop/mess.mjs" funnel
lauf "Selbsttest Besucher"       node scripts/besucher-sim.mjs --selbsttest
lauf "Besucher-Simulation"       node scripts/besucher-sim.mjs --wurzel="$PWD"
lauf "Aussagen (Register s2s)"   env S2S_SITE="$PWD" python3 "${KIT_BUILD:-$HOME/kit-build}/aussagen-check.py" s2s

echo
if [ "$rot" -eq 0 ]; then echo "✓ pruefen.sh: alle Tore gruen"; else echo "✗ pruefen.sh: $rot Tor(e) rot"; fi
exit "$rot"
