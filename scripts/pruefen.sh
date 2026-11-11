#!/usr/bin/env bash
# Alle Browser-Tore der Website in einem Befehl, VOR dem Commit (kern.md:
# "Ein Tor, das niemand aufruft, ist kein Tor"). Selbsttests laufen zuerst —
# ein Tor, dem man nicht glauben kann, macht jede gruene Meldung wertlos.
#
#   ./scripts/pruefen.sh            volle Kette (Nachtlauf, vor groesseren Umbauten)
#   ./scripts/pruefen.sh --schnell  vor dem Commit: alle Tore, aber
#       · Selbsttests nur fuer Tore, deren Skript (oder scripts/lib/) sich gegenueber
#         origin/main geaendert hat — ein unveraendertes Tor hat sein Eichmass von gestern Nacht
#       · Ruckeln (CPU x4) nur nachts: unter Tageslast meldete es Phantome auf
#         unberuehrten Seiten (02.11.: /ablauf/ 7 %, /danke/ 12 %, main allein bis 7,8 %)
#   Der Nachtlauf (scripts/nachtlauf.sh, 03:00) faehrt die volle Kette gegen origin/main.
set -uo pipefail
cd "$(dirname "$0")/.."
SCHNELL=0; [ "${1:-}" = "--schnell" ] && SCHNELL=1

# Nie zwei Ketten gleichzeitig (kern.md: Tore nie parallel) — PID-Sperre, nicht pgrep
SPERRE="${TMPDIR:-/tmp}/s2s-pruefen.pid"
if [ -f "$SPERRE" ] && kill -0 "$(cat "$SPERRE")" 2>/dev/null; then
  echo "✗ pruefen.sh laeuft schon (PID $(cat "$SPERRE")) — erst abwarten" >&2; exit 99
fi
echo $$ > "$SPERRE"; trap 'rm -f "$SPERRE"' EXIT

rot=0; ZEITEN=""; ROTE=""
lauf() {
  local name="$1"; shift; echo; echo "── $name"; local t0=$SECONDS
  "$@" || { rot=$((rot+1)); ROTE="$ROTE  ✗ $name"$'\n'; }
  ZEITEN="$ZEITEN$((SECONDS-t0))s  $name"$'\n'
}
# Selbsttest eines Tors: in --schnell nur, wenn sich das Tor geaendert hat
GEAENDERT="$( { git diff --name-only origin/main 2>/dev/null; git ls-files --others --exclude-standard; } | sort -u)"
selbst() {
  local name="$1" datei="$2"; shift 2
  if [ "$SCHNELL" = 1 ] && ! printf '%s\n' "$GEAENDERT" | grep -qxF "$datei" \
     && ! printf '%s\n' "$GEAENDERT" | grep -q '^scripts/lib/'; then
    echo; echo "── $name"; echo "⏭  Tor unveraendert gegenueber origin/main — Selbsttest im Nachtlauf"; return
  fi
  lauf "$name" "$@"
}
# Im Schnell-Modus misst kein Tor das Ruckeln (siehe oben); Selbsttests behalten es
[ "$SCHNELL" = 1 ] && RUCKELN=nachts || RUCKELN=voll

selbst "Selbsttest Seitenwechsel" scripts/uebergang-check.mjs node scripts/uebergang-check.mjs --selbsttest
selbst "Selbsttest Bewegung" scripts/bewegung-check.mjs node scripts/bewegung-check.mjs --selbsttest
selbst "Selbsttest Raum" scripts/raum-check.mjs node scripts/raum-check.mjs --selbsttest
selbst "Selbsttest Szenen" scripts/szenen-check.mjs node scripts/szenen-check.mjs --selbsttest
selbst "Selbsttest Bedienung" scripts/bedienung-check.mjs node scripts/bedienung-check.mjs --selbsttest
selbst "Selbsttest Bildschärfe" scripts/bild-schaerfe-check.mjs node scripts/bild-schaerfe-check.mjs --selbsttest
selbst "Selbsttest Kollision" scripts/kollision-check.mjs node scripts/kollision-check.mjs --selbsttest
selbst "Selbsttest Sprachen" scripts/sprachen-check.mjs node scripts/sprachen-check.mjs --selbsttest
selbst "Selbsttest Zähler" scripts/zaehler-check.mjs node scripts/zaehler-check.mjs --selbsttest
selbst "Selbsttest Sitemap" scripts/sitemap-check.mjs node scripts/sitemap-check.mjs --selbsttest
selbst "Platzhalter (Fixtures)" kit-build/platzhalter-check.py   python3 "$HOME/kit-build/platzhalter-check.py" --selbsttest
selbst "Selbsttest Motion-Loop" kit-build/motion-loop/mess.mjs   node "$HOME/kit-build/motion-loop/mess.mjs" --selbsttest
# Vor jedem Browser-Lauf: kein Testserver darf ins WLAN horchen oder aus dem Baum lesen (12.10.2026)
lauf "Funnel-Tests"              node --test free-content/test/alte-adresse.test.mjs free-content/test/lead-loeschung.test.mjs free-content/test/anfrage-loeschen.test.mjs free-content/test/reel-bescheid.test.mjs free-content/test/workbook-bescheid.test.mjs tests/bewertungen.test.mjs
lauf "Server nur lokal"          node "$HOME/kit-build/server-lokal-check.mjs" "$PWD/scripts" "$PWD/free-content/src"
# Zweisprachig (17.10.2026): jede DE-Seite hat eine aktuelle EN-Schwester
lauf "Sprachen DE/EN"           node scripts/sprachen-check.mjs
lauf "Zähler kennt jede Seite"  node scripts/zaehler-check.mjs
lauf "Sitemap nur echte Seiten"  node scripts/sitemap-check.mjs
lauf "Keine Platzhalter-Werte"  python3 "$HOME/kit-build/platzhalter-check.py" .
lauf "CSP gehaertet"             node scripts/csp-haerten.mjs --pruefen
lauf "CSP im Browser"            node scripts/csp-pruefen-browser.mjs
lauf "Seitenwechsel"             node scripts/uebergang-check.mjs
lauf "Bewegung"                  node scripts/bewegung-check.mjs
lauf "Raum je Seite (Quelle)"   node scripts/raum-bauen.mjs --pruefen
lauf "Raum (Lichtstudio)"        env S2S_RUCKELN="$RUCKELN" node scripts/raum-check.mjs
lauf "Szenen je Abschnitt (Quelle)" node scripts/szenen-bauen.mjs --pruefen
lauf "Szenen je Abschnitt"      env S2S_RUCKELN="$RUCKELN" node scripts/szenen-check.mjs
lauf "Bedienung (Knöpfe)"        node scripts/bedienung-check.mjs
lauf "Bildschärfe"              node scripts/bild-schaerfe-check.mjs
lauf "Nichts liegt übereinander" env KOLLISION="$([ "$SCHNELL" = 1 ] && echo schnell || echo voll)" node scripts/kollision-check.mjs
lauf "Bewegung gegen Entscheidung" env MOTION_WURZEL="$PWD" node "$HOME/kit-build/motion-loop/mess.mjs" s2s
lauf "Bewegung im Funnel"        env FUNNEL_QUELLE="$PWD/free-content" node "$HOME/kit-build/motion-loop/mess.mjs" funnel
selbst "Selbsttest Besucher" scripts/besucher-sim.mjs node scripts/besucher-sim.mjs --selbsttest
lauf "Besucher-Simulation"       node scripts/besucher-sim.mjs --wurzel="$PWD"
lauf "Aussagen (Register s2s)"   env S2S_SITE="$PWD" python3 "$HOME/kit-build/aussagen-check.py" s2s

echo
echo "── Dauer je Tor (laengste zuerst)"; printf '%s' "$ZEITEN" | sort -rn | head -12
echo "   gesamt $((SECONDS/60)) min $((SECONDS%60)) s · Modus: $([ "$SCHNELL" = 1 ] && echo schnell || echo voll)"
echo
if [ "$rot" -eq 0 ]; then echo "✓ pruefen.sh: alle Tore gruen"; else echo "✗ pruefen.sh: $rot Tor(e) rot"; printf '%s' "$ROTE"; fi
exit "$rot"
