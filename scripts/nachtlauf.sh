#!/usr/bin/env bash
# Nachtlauf (02.11.2026): die volle Pruefkette gegen origin/main, wenn der Mac ruht.
#
# Warum: die volle Kette dauert ~28 min und belegt den Rechner; tagsueber blockierte sie
# die Arbeit, und unter Last meldete das Ruckeln-Tor Phantome. Tagsueber laeuft
# `pruefen.sh --schnell` vor dem Commit, nachts misst dieser Lauf alles: Selbsttests,
# Ruckeln, alle Seiten — auf einem frischen Stand von origin/main, nie im Arbeitsbaum.
#
#   scripts/nachtlauf.sh              Lauf (launchd com.s2s.nachtlauf, taeglich 03:00)
#   scripts/nachtlauf.sh --trocken    nur Stand holen und Last pruefen, keine Kette
#
# Rot → Mail (jobradar/versand.py) + Mitteilung. Gruen → nur Log. Log: ~/Library/Logs/s2s-nachtlauf/
set -uo pipefail

# launchd reicht S2S_REPO durch und startet das Skript frisch aus origin/main (nie ein Arbeitsstand)
REPO="${S2S_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
LOGS="$HOME/Library/Logs/s2s-nachtlauf"; mkdir -p "$LOGS"
LOG="$LOGS/$(date +%Y-%m-%d).log"
LAST_GRENZE=4          # Ruckeln braucht Ruhe (Learnings 28.10./02.11.)
WARTEN_MAX=7200        # hoechstens 2 h auf Ruhe warten, dann laufen und das sagen
TROCKEN=0; [ "${1:-}" = "--trocken" ] && TROCKEN=1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

exec >>"$LOG" 2>&1
echo "═══ Nachtlauf $(date '+%d.%m.%Y %H:%M')"

melden() {  # $1 Betreff, $2 Text
  python3 - "$1" "$2" <<'PY' || echo "Melden ging nicht"
import sys, html
from pathlib import Path
sys.path.insert(0, str(Path.home() / "jobradar"))
betreff, text = sys.argv[1], sys.argv[2]
try:
    import jobradar; jobradar.melden("s2s Nachtlauf", betreff)
except Exception as e:
    print(f"Mitteilung ging nicht: {e}")
try:
    import versand
    versand.senden(betreff, "<div style='font:15px/1.5 -apple-system,Helvetica,sans-serif'><h2>s2s Nachtlauf</h2><pre style='white-space:pre-wrap'>"
                   + html.escape(text) + "</pre><p>Sag Claude Bescheid: die Zeilen nennen Tor und Seite.</p></div>", text)
except Exception as e:
    print(f"Mail ging nicht: {e}")
PY
}

# Ruhe abwarten (Dezimalkomma der deutschen Ausgabe beachten)
last() { sysctl -n vm.loadavg | awk '{print $2}' | tr ',' '.'; }
gewartet=0
until awk -v l="$(last)" -v g="$LAST_GRENZE" 'BEGIN{exit !(l<g)}'; do
  [ "$gewartet" -ge "$WARTEN_MAX" ] && { echo "⚠️  Last nach 2 h noch $(last) — laufe trotzdem, Ruckeln-Befunde mit Vorsicht lesen"; break; }
  sleep 60; gewartet=$((gewartet+60))
done
echo "Last beim Start: $(last) (gewartet ${gewartet}s)"

# Frischer Stand von origin/main, nie der Arbeitsbaum
git -C "$REPO" fetch -q origin || { melden "s2s Nachtlauf: git fetch ging nicht" "$(tail -5 "$LOG")"; exit 1; }
BAUM="$(mktemp -d "${TMPDIR:-/tmp}/s2s-nachtlauf-XXXXXX")"
aufraeumen() { git -C "$REPO" worktree remove --force "$BAUM" 2>/dev/null; rm -rf "${BAUM:?}"; }
trap aufraeumen EXIT
git -C "$REPO" worktree add -q --detach "$BAUM" origin/main
[ -d "$REPO/node_modules" ] && ln -s "$REPO/node_modules" "$BAUM/node_modules"
echo "Stand: $(git -C "$BAUM" log --oneline -1)"
[ "$TROCKEN" = 1 ] && { echo "trocken: Kette nicht gestartet"; exit 0; }

RC=0; AUS="$("$BAUM/scripts/pruefen.sh" 2>&1)" || RC=$?
printf '%s\n' "$AUS"
if [ "$RC" -eq 0 ]; then
  echo "✓ Nachtlauf gruen"
else
  # Nur die Schlusszeilen: welche Tore rot sind (Selbsttest-Fixtures sind absichtlich rot)
  BEFUND="$(printf '%s\n' "$AUS" | sed -n '/^✗ pruefen.sh/,$p')"
  melden "s2s Nachtlauf ROT ($RC Tor(e)) – $(git -C "$BAUM" log --oneline -1)" \
         "$BEFUND"$'\n\n'"Ganzes Log: $LOG"
fi
exit "$RC"
