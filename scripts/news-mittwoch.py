#!/usr/bin/env python3
"""Mittwochslauf: die Social-Media-News der Woche als Seite /news/ (DE) und /en/news/ (EN) auf social2scale.com.

    python3 scripts/news-mittwoch.py                ganze Woche: Texte, Seiten, Prüfkette, Commit, Push, live prüfen
    python3 scripts/news-mittwoch.py --nur-texte    nur data/news/<jahr>-kw<nn>.json schreiben (zum Ansehen), sonst nichts
    python3 scripts/news-mittwoch.py --kw 47        eine bestimmte Kalenderwoche (Standard: die laufende)

Warum (Sebi 18./19.11.2026): die Wochen-News aus Skool und CRM sollen jeden Mittwoch von selbst als Beitrag auf die
Website, kurz („macht noch kein bock zu lesen, viel text“), je Neuerung ein großer Satz, Details auf Antippen, unten eine
Frage, auf die man Sebi direkt antwortet. Gilt für alle Social-Media-Kanäle, nicht nur Instagram.

Quelle ist der geprüfte Beleg des Montagslaufs (~/s2s-skool/news/<jahr>-kw<nn>.json, bau/news-woche.py). Hier wird nichts
neu recherchiert: Quellen, Daten und Plattformen kommen aus dem Beleg, die KI schreibt nur kürzer. Abbruch beim ersten Rot,
dann Mitteilung; die Seite bleibt dann auf der letzten Ausgabe.

Läuft aus einem eigenen Worktree auf origin/main (~/.s2s-wachen/social2scale-site, kern.md), launchd com.s2s.news-mittwoch.
"""
import datetime
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
DATEN = SITE / "data" / "news"
BELEGE = Path.home() / "s2s-skool" / "news"
SPRACH_TOR = Path.home() / ".s2s-wachen" / "kit-build"
MODELL = "claude-opus-5-5"
SATZ_MAX = 95
DETAIL_MAX = 300
FRAGE_MAX = 110
KURZ_MAX = 90
# Ältere Belege (bis KW 46) haben noch kein quelle_name
QUELLEN_NAMEN = {"techcrunch.com": "TechCrunch", "www.socialmediatoday.com": "Social Media Today", "about.fb.com": "Meta Newsroom",
                 "about.instagram.com": "Instagram", "creators.instagram.com": "Instagram"}
SPERRE = Path(tempfile.gettempdir()) / "s2s-news-mittwoch.pid"


class Rot(Exception):
    pass


def melden(text):
    print(text)
    subprocess.run(["osascript", "-e", f'display notification {json.dumps(text[:200])} with title "News auf der Website"'],
                   capture_output=True)


def claude(prompt, system):
    """Schlanker Hintergrund-Agent aus leerem Ordner, ohne Werkzeuge (kern.md); Antwort muss JSON sein."""
    with tempfile.TemporaryDirectory() as leer:
        mcp = os.path.join(leer, "mcp.json")
        Path(mcp).write_text('{"mcpServers":{}}')
        befehl = ["claude", "-p", prompt, "--model", MODELL, "--tools", "", "--strict-mcp-config", "--mcp-config", mcp,
                  "--setting-sources", "", "--system-prompt", system, "--output-format", "json"]
        r = subprocess.run(befehl, capture_output=True, text=True, cwd=leer, timeout=900, stdin=subprocess.DEVNULL)
    if r.returncode:
        raise Rot("Claude-Lauf rot: " + (r.stdout + r.stderr)[-300:])
    text = json.loads(r.stdout).get("result", "")
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise Rot("Claude-Antwort ohne JSON: " + text[:200])
    return json.loads(m.group(0))


# ── Texte ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
SYSTEM = """Du schreibst für die Website von social2scale (Social-Media-Agentur für Selbständige, Coaches, Experten) die
Wochen-News, auf Deutsch und auf Englisch. Leserinnen sind Selbständige, die keine Zeit für langes Lesen haben.
Antworte nur mit JSON."""

AUFGABE = """Hier ist der geprüfte Beleg der Woche (JSON). Schreib daraus die Web-Fassung.

Form, für "de" und "en" gleich:
{"de": {"punkte": [{"satz": "...", "detail": "..."}, ...], "frage": "...", "kurz": "..."}, "en": {...}}

- "punkte": genau {anzahl} Einträge in derselben Reihenfolge wie im Beleg: erst die Punkte, als letzter die Psychologie.
- "satz": EIN Satz, höchstens {satz_max} Zeichen, sagt, was die Leserin jetzt tun oder wissen kann (Du-Form, auf Englisch
  "you"). Kein Plattformname am Anfang, der steht schon darüber. Keine Zahl, die nicht im Beleg steht.
- "detail": ein oder zwei Sätze, höchstens {detail_max} Zeichen, nur Tatsachen aus dem Beleg (aussage, einschraenkung).
  Steht im Beleg eine Einschränkung (Test, nicht überall verfügbar), muss sie hier stehen. Keine neue Zahl, kein neues Datum.
- "frage": eine offene Frage an die Leserin zur Woche, höchstens {frage_max} Zeichen, auf die man gern antwortet
  (eigene Erfahrung oder Meinung, keine Ja/Nein-Prüfungsfrage). Bezug auf die Neuigkeiten, nicht nur auf eine Plattform,
  wenn die Woche mehrere hat.
- "kurz": die Ausgabe in höchstens {kurz_max} Zeichen, als Aufzählung der Themen (z. B. "WhatsApp-Events, KI-Kommentare
  auf LinkedIn, Threads-Suche"). Für den Link auf frühere Ausgaben.

Sprache: so, wie man es sagt. Deutsch ohne Übersetzungsdeutsch, Englisch eigen geschrieben, nicht übersetzt. Verboten:
Gedankenstrich (— oder –), "Nicht X, sondern Y", "kein X, aber ein Y", Merksätze, Werbefloskeln, Ausrufezeichen, Emojis,
"Game Changer", "revolutionär". Begriffe wie in der deutschen App (z. B. "professionelles Konto").

Beleg:
{beleg}
"""


def zahlen(text):
    return set(re.findall(r"\d+(?:[.,]\d+)?", text))


def beleg_punkte(beleg):
    """Punkte + Psychologie in Anzeigereihenfolge, nur Felder, die auf die Seite gehen (Quelle, Datum, Plattform)."""
    out = []
    for p in beleg["punkte"]:
        urls = [u.strip() for u in str(p.get("quelle", "")).split("·") if u.strip().startswith("https://")]
        if not urls:
            raise Rot(f"Punkt ohne https-Quelle: {p.get('titel')}")
        out.append({"wo": p.get("plattform") or "Instagram", "quelle": urls[0], "quelle_name": p.get("quelle_name") or QUELLEN_NAMEN.get(urllib.parse.urlparse(urls[0]).hostname, urllib.parse.urlparse(urls[0]).hostname),
                    "datum": str(p["datum"])[:10], "_text": " ".join(str(p.get(k, "")) for k in ("aussage", "fuer_dich", "einschraenkung", "titel"))})
    ps = beleg["psychologie"]
    out.append({"wo": "Psychologie", "quelle": "", "quelle_name": ps["quelle"], "datum": "",
                "_text": " ".join(str(ps.get(k, "")) for k in ("aussage", "fuer_dich", "titel", "quelle"))})
    return out


def sprach_befunde(text):
    sys.path.insert(0, str(SPRACH_TOR))
    try:
        import kundensprache
    except ImportError as e:
        raise Rot(f"Sprach-Tor nicht ladbar aus {SPRACH_TOR}: {e}")
    return kundensprache.befunde(text)


def pruefe_texte(t, punkte):
    """Hält an, wenn Form, Länge, Zahlen oder Sprache nicht stimmen. Gibt die Befunde zurück (leer = grün)."""
    befunde = []
    for sp in ("de", "en"):
        s = t.get(sp) or {}
        pk = s.get("punkte") or []
        if len(pk) != len(punkte):
            befunde.append(f"{sp}: {len(pk)} Punkte statt {len(punkte)}")
            continue
        for i, (p, b) in enumerate(zip(pk, punkte), 1):
            for feld, grenze in (("satz", SATZ_MAX), ("detail", DETAIL_MAX)):
                wert = str(p.get(feld, "")).strip()
                if not wert:
                    befunde.append(f"{sp} Punkt {i}: {feld} leer")
                elif len(wert) > grenze:
                    befunde.append(f"{sp} Punkt {i}: {feld} {len(wert)} Zeichen (höchstens {grenze})")
                neu = zahlen(wert) - zahlen(b["_text"])
                if neu:
                    befunde.append(f"{sp} Punkt {i}: Zahl nicht im Beleg: {', '.join(sorted(neu))}")
        for feld, grenze in (("frage", FRAGE_MAX), ("kurz", KURZ_MAX)):
            wert = str(s.get(feld, "")).strip()
            if not wert or len(wert) > grenze:
                befunde.append(f"{sp}: {feld} fehlt oder zu lang ({len(wert)})")
        alles = " ".join([str(s.get("frage", "")), str(s.get("kurz", ""))] + [p.get("satz", "") + " " + p.get("detail", "") for p in pk])
        if re.search(r"[—–!]", alles):
            befunde.append(f"{sp}: Gedankenstrich oder Ausrufezeichen")
        if sp == "de":
            for f in sprach_befunde(alles):
                befunde.append(f"de Sprache: {f.get('grund')} ({f.get('stelle')})")
    return befunde


def texte_bauen(beleg, jahr, kw):
    punkte = beleg_punkte(beleg)
    oeffentlich = {k: beleg[k] for k in ("punkte", "psychologie")}
    befunde = []
    for runde in range(1, 4):
        prompt = AUFGABE
        for k, v in (("anzahl", len(punkte)), ("satz_max", SATZ_MAX), ("detail_max", DETAIL_MAX), ("frage_max", FRAGE_MAX),
                     ("kurz_max", KURZ_MAX), ("beleg", json.dumps(oeffentlich, ensure_ascii=False, indent=1))):
            prompt = prompt.replace("{" + k + "}", str(v))
        if befunde:
            prompt += "\nDie letzte Fassung fiel durch, behebe genau das:\n- " + "\n- ".join(befunde)
        t = claude(prompt, SYSTEM)
        befunde = pruefe_texte(t, punkte)
        print(f"Texte Runde {runde}: {'grün' if not befunde else '; '.join(befunde)}")
        if not befunde:
            break
    if befunde:
        raise Rot("Texte nach drei Runden rot: " + "; ".join(befunde))
    ausgabe = {"jahr": jahr, "kw": kw, "datum": beleg.get("posten_am") or datetime.date.today().isoformat(),
               "quelle": f"s2s-skool/news/{jahr}-kw{kw}.json"}
    for sp in ("de", "en"):
        s = t[sp]
        ausgabe[sp] = {"frage": s["frage"].strip(), "kurz": s["kurz"].strip(),
                       "punkte": [{**{k: v for k, v in b.items() if not k.startswith("_")},
                                   "wo": b["wo"] if (sp == "de" or b["wo"] != "Psychologie") else "Psychology",
                                   "satz": p["satz"].strip(), "detail": p["detail"].strip()}
                                  for p, b in zip(s["punkte"], punkte)]}
    return ausgabe


# ── Bauen, prüfen, ausliefern ─────────────────────────────────────────────────────────────────────────────────────────
def lauf(befehl, frist=3600):
    r = subprocess.run(befehl, cwd=SITE, capture_output=True, text=True, timeout=frist)
    if r.returncode:
        raise Rot(f"{' '.join(befehl[:2])} rot: " + (r.stdout + r.stderr)[-700:])
    return r.stdout


def bauen():
    lauf(["node", "scripts/build-news.mjs"])
    lauf(["node", "scripts/build-pages.mjs"])
    lauf(["node", "scripts/sitemap-sprachen.mjs"])
    lauf(["node", "scripts/csp-haerten.mjs"])
    # EN und DE entstehen im selben Lauf aus derselben Quelle: Stempel „ist nachgezogen“ für jede englische News-Seite
    for datei in sorted((SITE / "en" / "news").rglob("index.html")):
        lauf(["node", "scripts/sprachen-stempel.mjs", "/" + str(datei.parent.relative_to(SITE)) + "/"])


def warte_auf_auslieferungen():
    for _ in range(240):
        r = subprocess.run(["pgrep", "-f", "deploy-portal.sh|portal-liefern.sh"], capture_output=True, text=True)
        if not r.stdout.strip():
            return
        time.sleep(15)
    raise Rot("Eine andere Auslieferung läuft seit einer Stunde, ich warte nicht länger")


def ausliefern(jahr, kw):
    lauf(["bash", "scripts/pruefen.sh", "--schnell"], frist=5400)
    # Der Wachen-Worktree ist vor dem Lauf sauber auf origin/main: alles, was Bau und Kette schreiben, gehört in den Commit
    lauf(["git", "add", "-A", "--", ".", ":(exclude)node_modules"])
    status = lauf(["git", "status", "--porcelain"])
    if not status.strip():
        return "nichts zu tun"
    lauf(["git", "commit", "-q", "-m", f"news: KW {kw} auf der Website (Mittwochslauf)"])
    warte_auf_auslieferungen()
    lauf(["git", "fetch", "-q", "origin"])
    lauf(["git", "rebase", "-q", "origin/main"])
    lauf(["git", "push", "-q", "origin", "HEAD:refs/heads/main"])
    soll = (SITE / "news" / "index.html").read_bytes()
    for _ in range(60):
        time.sleep(15)
        try:
            with urllib.request.urlopen(f"https://social2scale.com/news/?v={time.time_ns()}", timeout=20) as r:
                if r.read() == soll:
                    return "live"
        except OSError:
            pass
    raise Rot("Gepusht, aber /news/ ist nach 15 Minuten nicht byte-gleich live")


def auf_main_stellen():
    """Als Wache (launchd) läuft der Lauf im eigenen Worktree auf origin/main, nie in einem Entwicklungs-Checkout (kern.md)."""
    if ".s2s-wachen" not in str(SITE):
        return
    subprocess.run(["git", "-C", str(SITE), "fetch", "-q", "origin"], check=True)
    subprocess.run(["git", "-C", str(SITE), "checkout", "-q", "--detach", "--force", "origin/main"], check=True)
    subprocess.run(["git", "-C", str(SITE), "clean", "-fdq", "--", "data/news", "news", "en/news"], check=True)


def main():
    nur_texte = "--nur-texte" in sys.argv
    if not nur_texte:
        auf_main_stellen()
    jahr, kw, _ = datetime.date.today().isocalendar()
    if "--kw" in sys.argv:
        kw = int(sys.argv[sys.argv.index("--kw") + 1])
    beleg_pfad = BELEGE / f"{jahr}-kw{kw}.json"
    ziel = DATEN / f"{jahr}-kw{kw}.json"
    if not beleg_pfad.exists():
        raise Rot(f"Kein Beleg für KW {kw} ({beleg_pfad}); der Montagslauf hat nichts abgelegt")
    if ziel.exists() and not nur_texte:
        print(f"KW {kw} liegt schon auf der Website ({ziel.name}), nichts zu tun")
        return
    beleg = json.loads(beleg_pfad.read_text(encoding="utf-8"))
    if str(beleg.get("posten_am", "")) > datetime.date.today().isoformat() and "--kw" not in sys.argv:
        print(f"KW {kw} ist erst ab {beleg['posten_am']} dran")
        return
    DATEN.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(texte_bauen(beleg, jahr, kw), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"geschrieben: {ziel.relative_to(SITE)}")
    if nur_texte:
        return
    bauen()
    stand = ausliefern(jahr, kw)
    melden(f"News KW {kw} stehen auf der Website ({stand}): https://social2scale.com/news/")


if __name__ == "__main__":
    if SPERRE.exists():
        try:
            os.kill(int(SPERRE.read_text()), 0)
            sys.exit("Es läuft schon ein Mittwochslauf")
        except (OSError, ValueError):
            pass
    SPERRE.write_text(str(os.getpid()))
    try:
        main()
    except Rot as e:
        melden(f"News auf der Website angehalten: {e}")
        sys.exit(1)
    finally:
        SPERRE.unlink(missing_ok=True)
