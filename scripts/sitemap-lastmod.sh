#!/usr/bin/env bash
# Traegt in sitemap.xml je URL das <lastmod> aus dem letzten Commit der zugehoerigen
# Datei nach. Von Hand gepflegte Datumsangaben veralten still — dieses Skript liest
# sie stattdessen aus der Wahrheit, die ohnehin da ist: der Git-Historie.
#
# Aufruf (vor dem Push, wenn Seiten geaendert wurden):
#   bash scripts/sitemap-lastmod.sh
#
# Neue Seite? Eine Zeile in SEITEN ergaenzen — und den <url>-Block in sitemap.xml.
set -euo pipefail

cd "$(dirname "$0")/.."

# URL-Pfad : Datei
SEITEN=(
  "/:index.html"
  "/for-you/:for-you/index.html"
  "/results/:results/index.html"
  "/preise/:preise/index.html"
  "/about/:about/index.html"
  "/impressum/:impressum/index.html"
  "/datenschutz/:datenschutz/index.html"
)

for eintrag in "${SEITEN[@]}"; do
  pfad="${eintrag%%:*}"
  datei="${eintrag#*:}"

  if [ ! -f "$datei" ]; then
    echo "übersprungen (Datei fehlt): $datei" >&2
    continue
  fi

  datum="$(git log -1 --format=%cs -- "$datei" 2>/dev/null || true)"
  if [ -z "$datum" ]; then
    echo "übersprungen (nie committet): $datei" >&2
    continue
  fi

  url="https://social2scale.com${pfad}"

  # Im <url>-Block dieser loc das lastmod ersetzen bzw. direkt danach einfuegen.
  python3 - "$url" "$datum" <<'PY'
import re, sys, pathlib

url, datum = sys.argv[1], sys.argv[2]
p = pathlib.Path("sitemap.xml")
xml = p.read_text(encoding="utf-8")

loc = f"<loc>{url}</loc>"
if loc not in xml:
    sys.stderr.write(f"nicht in sitemap.xml: {url}\n")
    sys.exit(0)

# vorhandenes lastmod im selben Block ersetzen …
muster = re.compile(re.escape(loc) + r"(\s*)<lastmod>[^<]*</lastmod>")
if muster.search(xml):
    xml = muster.sub(lambda m: f"{loc}{m.group(1)}<lastmod>{datum}</lastmod>", xml)
else:
    # … sonst direkt hinter der loc einfuegen, Einrueckung uebernehmen
    xml = xml.replace(loc, f"{loc}\n    <lastmod>{datum}</lastmod>", 1)

p.write_text(xml, encoding="utf-8")
PY

  echo "$pfad → $datum"
done

echo "sitemap.xml aktualisiert."
