#!/usr/bin/env python3
"""Setting-Film nach dem Funnel: zwei Fassungen (A Vorschau, B Gespraech) aus Bausteinen.

Avatar-Clips (Higgsfield seedance, KI-generiert) nur fuer Begruessung und Abschluss; dazwischen
traegt das Video nur Petras Stimme auf dunklem Grund, die Szene zeichnet der Funnel live darueber
(Name, Steckbrief, Phil). Ausgabe:
  ../../assets/film-a.mp4, film-b.mp4, film-poster.jpg   (Website, social2scale.com/assets)
  ../src/pages/film-daten.js                             (Zeitleiste + Untertitel, erzeugt)
Aufruf: python3 film/bauen.py   (braucht ffmpeg; idempotent, gleicher Eingang -> gleiche Daten)
Quellen und ihre Herkunft: quelle/HERKUNFT.md. Zwischenstaende in film/.bau (nicht im Repo).
"""
import json
import subprocess
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
# Sprache (Sebi 25.10.: der Film soll auch im englischen Funnel laufen, #378): --sprache en baut aus
# quelle/en/ die Dateien film-<weg>-en.mp4, film-poster-en.jpg und film-daten-en.js. Ohne Angabe: deutsch.
SPRACHE = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--sprache=')), 'de')
if SPRACHE not in ('de', 'en'):
    sys.exit(f'unbekannte Sprache: {SPRACHE}')
ENDUNG = '' if SPRACHE == 'de' else '-' + SPRACHE
Q = HIER / 'quelle' / ('' if SPRACHE == 'de' else SPRACHE)
SFX_ORDNER = HIER / 'quelle' / 'sfx'
ASSETS = HIER.parent.parent / 'assets'
DATEN = HIER.parent / 'src' / 'pages' / f'film-daten{ENDUNG}.js'
GROESSE = 720
GRUND = '0x04100d'
VOR, NACH = 0.25, 0.45  # Luft um eine Szene, damit die Ueberblendung nicht ins Wort faellt

# Untertitel je Baustein: (Text wie im Skript, Index des ersten Worts im Whisper-Wortlauf).
# Der Text kommt aus dem Skript, nie aus Whisper ("Social to Scale").
# Erstgespraech etwa 45 Minuten (Calendly blockt 45, PR #62; Stimme am 23.10.2026 neu).
CUES_DE = {
    's1': [('Hallo, schön, dass du da bist.', 0), ('Ich bin die KI-Assistenz von social2scale', 6),
           ('und erkläre dir kurz, was jetzt passiert.', 15)],
    # Satz 2 neu (Sebi 27.10., Abnahme Fassung 3: „Mail“ klang falsch betont)
    's2a': [('Deine Gratis-Vorschau ist unterwegs.', 0), ('Ein Klick auf den Link in deinem Postfach,', 5),
            ('dann baut sich dein Feed fertig.', 13)],
    's2b': [('Phil hat deine Antworten schon gelesen:', 0), ('dein Thema, dein Ziel', 6),
            ('und wo du heute stehst.', 10)],
    's3a': [('Die Vorschau zeigt dir,', 0), ('wie dein Auftritt aussehen kann.', 4),
            ('Was sie nicht zeigt:', 9), ('wie du damit dein Ziel erreichst.', 13)],
    's4': [('Genau das klärt Phil mit dir im Erstgespräch:', 0), ('wo du heute stehst, wo du hinwillst', 8),
           ('und welcher Weg dich dorthin bringt.', 16), ('Danach weißt du, was du als Nächstes tust.', 22)],
    's5': [('Das Gespräch ist kostenlos.', 0), ('Such dir am besten gleich einen Termin aus.', 4),
           ('Bis bald.', 12)],
}
# Wortmarken, an denen die Szene etwas zeigt (Index im Wortlauf).
MARKEN_DE = {
    # Runde 5 (Sebi/Phil 23.10.: Framing über ihr Ergebnis statt unseren Ablauf; „Kunde braucht
    # Klarheit, ein Ziel und Nachvollziehbarkeit seiner Situation“). Jede Marke bewegt etwas.
    's1': {'name': 0},
    's2a': {'titel': 0, 'unterwegs': 4, 'mail': 5, 'post': 12, 'feed': 14},
    's2b': {'phil': 0, 'antworten': 2, 'thema': 6, 'ziel': 8, 'stand': 10},
    's3a': {'vorschau': 0, 'auftritt': 6, 'nicht': 9, 'ziel': 16},
    's4': {'phil': 3, 'stand': 8, 'ziel': 12, 'weg': 16, 'plan': 22},
    's5': {'kostenlos': 3, 'termin': 9},
}
# Englisch: gleiche Aussagen, Wortindizes aus dem englischen Whisper-Lauf (quelle/en/w-*.json)
CUES_EN = {
    's1': [('Hi, great to have you here.', 0), ("I'm the AI assistant from social2scale,", 6),
           ("and I'll quickly walk you through what happens next.", 14)],
    's2a': [('Your free preview is on its way.', 0), ('Quickly confirm the email in your inbox,', 7),
            ('and your feed will finish building.', 14)],
    's2b': [('Phil has already read your answers:', 0), ('your topic, your goal', 6),
            ('and where you stand today.', 10)],
    's3a': [('The preview shows you', 0), ('what your profile could look like.', 4),
            ("What it doesn't show:", 10), ('how you get to your goal with it.', 14)],
    's4': [("That's exactly what Phil works out with you on the intro call:", 0), ('where you are today, where you want to go', 12),
           ('and which path gets you there.', 21), ("Afterwards, you'll know your next step.", 27)],
    's5': [('The call is free.', 0), ('Pick a time that works for you right away.', 4), ('See you soon.', 13)],
}
MARKEN_EN = {
    's1': {'name': 0},
    's2a': {'titel': 0, 'unterwegs': 3, 'mail': 7, 'post': 13, 'feed': 16},
    's2b': {'phil': 0, 'antworten': 3, 'thema': 6, 'ziel': 8, 'stand': 10},
    's3a': {'vorschau': 0, 'auftritt': 6, 'nicht': 10, 'ziel': 18},
    's4': {'phil': 3, 'stand': 12, 'ziel': 16, 'weg': 21, 'plan': 27},
    's5': {'kostenlos': 3, 'termin': 6},
}
CUES = CUES_DE if SPRACHE == 'de' else CUES_EN
MARKEN = MARKEN_DE if SPRACHE == 'de' else MARKEN_EN
# Pegel: Rohstimmen liegen bei ~-23 LUFS, am Handy zu leise. Runde 4b („kratzig“): vorher +4,5 dB in einen
# harten Begrenzer (bis 3 dB Spitzen abgeschnitten); jetzt weicher Kompressor, dann Verstaerkung, Spitzen < -1 dBFS.
PEGEL = 'acompressor=threshold=0.125:ratio=3:attack=10:release=150:knee=4,volume=6.5dB'
# Toene (Runde 3, Sebi 17.10.: „evtl. noch so paar sound effekte“): selbst erzeugt (quelle/sfx/HERKUNFT.md),
# an denselben Stellen, an denen die Szene sich bewegt. Pegel: Spitzen ~-20 dBFS unter der Stimme (-18 LUFS).
SFX = {'swish': -11, 'tick': 8, 'pop': 5, 'riser': -8,
       # eigene Töne (toene-bauen.py, Spitze -12 dBFS): Lautstärke je Rolle, alle deutlich unter der Stimme
       'ping-1': -10, 'ping-2': -10, 'ping-3': -10, 'ping-4': -10, 'ping-5': -9, 'glide': -17, 'chime': -9,
       'stroke': -13, 'whoosh-auf': -11, 'whoosh-zu': -11}
# Kacheln des Feeds fuellen sich gestaffelt (film.js: .1s + i * .14s), je Kachel ein Pop.
FEED_KACHELN = 3


# Töne erzählen mit (Sebi 25.10.: „mehr Kreativität bzw. angepasst an die Situationen“), eine Tonart:
# „Heute“ tief (ping-1), „Dein Ziel“ hoch (ping-5); der Weg steigt Note für Note; die drei Balken = Dreiklang.
WEG_KNOTEN = [0.25, 0.46, 0.69]  # Anteil am Linienzug (film.js WEG → --d), Zeichnen dauert 1,9 s
TOENE = {
    'mail': [('stroke', 0.35)],
    'feed': [(f'ping-{i + 1}', 0.45 + i * 0.14) for i in range(5)],
    'auftritt': [('swish', 0.0)],
    'nicht': [('ping-1', 0.2)],
    'thema': [('ping-3', 0.0)],
    'stand': [('ping-1', 0.0)],
    'ziel': [('ping-5', 0.0)],
    'weg': [('glide', 0.0)] + [(f'ping-{k + 2}', d * 1.9) for k, d in enumerate(WEG_KNOTEN)] + [('ping-5', 1.9)],
    'plan': [('chime', 0.1)],
}
IRIS = 0.6  # Sekunden, in denen die Szene vor/nach dem Avatar als Kreis auf- bzw. zugeht (film.js)


def sfx_ereignisse(abschnitte, dauer_gesamt):
    """(Zeit, Ton) je Bewegung: Kreisblende auf/zu am Avatar, weicher Wechsel zwischen Szenen, je Wortmarke ihr Ton."""
    ev = []
    for vor, a in zip(abschnitte, abschnitte[1:]):
        if vor['art'] == 'avatar':
            ev.append((a['von'] - IRIS + 0.05, 'whoosh-auf'))
        elif a['art'] == 'avatar':
            ev.append((a['von'] - 0.05, 'whoosh-zu'))
        else:
            ev.append((a['von'] - 0.18, 'swish'))
    for a in abschnitte:
        for m, z in a['marken'].items():
            ev += [(z + vers, n) for n, vers in TOENE.get(m, [])]
    ev.append((dauer_gesamt - 0.75, 'riser'))
    return sorted((round(max(0.0, z), 3), n) for z, n in ev)


def toene_mischen(roh, ziel, ereignisse):
    eingaenge, graph = ['-i', str(roh)], []
    for k, (z, n) in enumerate(ereignisse, start=1):
        eingaenge += ['-i', str(SFX_ORDNER / f'{n}.wav')]
        ms = int(z * 1000)
        graph.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=mono,volume={SFX[n]}dB,adelay={ms}:all=1[e{k}]')
    alle = '[0:a]aformat=channel_layouts=mono[st];[st]' + ''.join(f'[e{k}]' for k in range(1, len(ereignisse) + 1))
    graph.append(f'{alle}amix=inputs={len(ereignisse) + 1}:normalize=0:duration=first,alimiter=limit=0.89:attack=2:release=80:level=disabled[a]')
    lauf('ffmpeg', '-loglevel', 'error', '-y', *eingaenge, '-filter_complex', ';'.join(graph),
         '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
         '-movflags', '+faststart', '-map_metadata', '-1', str(ziel))


# (Baustein, Art, Szene) je Fassung. Art 'avatar' = Clip mit eigenem Bild, 'szene' = Grund + Stimme.
FASSUNGEN = {
    'a': [('s1', 'avatar', 'hallo'), ('s2a', 'szene', 'post'), ('s3a', 'szene', 'luecke'),
          ('s4', 'szene', 'plan'), ('s5', 'avatar', 'termin')],
    'b': [('s1', 'avatar', 'hallo'), ('s2b', 'szene', 'kennt'), ('s4', 'szene', 'plan'),
          ('s5', 'avatar', 'termin')],
}


def lauf(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'ffmpeg/ffprobe fehlgeschlagen: {" ".join(args[:6])}…\n{r.stderr[-600:]}')
    return r.stdout


def dauer(p):
    return float(lauf('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)))


def worte(b):
    d = json.loads((Q / f'w-{b}.json').read_text())
    w = [x for s in d['segments'] for x in s['words']]
    if not w:
        sys.exit(f'{b}: keine Wortzeiten')
    return w


def ton(b):
    for endung in ('wav', 'mp3'):
        if (Q / f'{b}.{endung}').exists():
            return Q / f'{b}.{endung}'
    sys.exit(f'{b}: Ton fehlt in {Q}')


DEHNEN_MAX = 0.12   # je Satzteil hoechstens 12 % schneller/langsamer: darueber klingt atempo kratzig
PAUSE_MIN = 0.06   # Schnitt nur, wo die Stimme mindestens so lange schweigt
LIPPEN_MAX = 0.09   # Rest-Versatz je Wort, ab dem ein Satzteil an seinem schlechtesten Wort geteilt wird
# Sebi 27.10. (Abnahme Runde 2): DE-Begrüßung „hängt“ bei „social2scale“ und „kurz“; genau dort liegt ein
# Satzteil (13 Wörter), den atempo um 12 % langsamer zieht. Rubber Band (R3, --fine) dehnt ohne Leiern.
# EN ist mit atempo abgenommen (27.10.) und bleibt byte-gleich, bis dort jemand etwas hört.
WEICH_DEHNEN = {'de'}


def lippen_plan(q, c):
    """Satzteile (Wortindizes von..bis) mit Startzeit im Clip und Dehnfaktor. Runde 4b (Sebi 23.10.:
    „ton is kratzig“): nicht mehr je Wort dehnen (0,58-1,31x), sondern je Satzteil, geschnitten in
    Sprechpausen; nur wo der Rest-Versatz zu gross bleibt, an einem Wortanfang mit Ueberblendung."""
    gruppen = [[0]]
    for i in range(1, len(q)):
        (gruppen.append([i]) if q[i]['start'] - q[i - 1]['end'] >= 0.02 else gruppen[-1].append(i))

    def lage(g, ab):
        a, z = g[0], g[-1]
        qs, qe, cs, ce = q[a]['start'], q[z]['end'], c[a]['start'], c[z]['end']
        f = min(1 + DEHNEN_MAX, max(1 - DEHNEN_MAX, (ce - cs) / (qe - qs) if qe > qs else 1.0))
        roh = [cs + (q[i]['start'] - qs) * f - c[i]['start'] for i in g]
        # Satzteil auf die Mitte seiner Abweichungen legen statt aufs erste Wort (halbiert den groessten Versatz)
        s = max(cs - (max(roh) + min(roh)) / 2, ab)
        return s, f, [s + (q[i]['start'] - qs) * f - c[i]['start'] for i in g], s + (qe - qs) * f

    plan, ab, offen = [], 0.0, list(gruppen)
    while offen:
        g = offen.pop(0)
        s, f, fehl, ende = lage(g, ab)
        # Teilen nur an einer echten Sprechpause (Sebi 25.10.: „und erkläre dir kurz“ klang zerschnitten —
        # dort lagen drei Schnitte ohne Pause). Ohne Pause bleibt der Satzteil ganz, auch mit etwas mehr Versatz.
        pause = [j for j in range(1, len(g)) if q[g[j]]['start'] - q[g[j] - 1]['end'] >= PAUSE_MIN]
        k = max(pause, key=lambda j: abs(fehl[j]), default=0)
        if abs(max(fehl, key=abs)) > LIPPEN_MAX and k:
            offen[:0] = [g[:k], g[k:]]
            continue
        plan.append({'von': g[0], 'bis': g[-1], 'start': s, 'faktor': f, 'fehler': max(map(abs, fehl))})
        ab = ende
    return plan


def weich_dehnen(quelle, von, bis, faktor, ziel):
    """Ausschnitt von..bis auf faktor-fache Länge, Tonhöhe bleibt (rubberband R3; brew install rubberband)."""
    roh = ziel.with_suffix('.roh.wav')
    lauf('ffmpeg', '-loglevel', 'error', '-y', '-i', str(quelle), '-af', f'atrim={von:.3f}:{bis:.3f},asetpts=PTS-STARTPTS',
         '-ar', '48000', '-ac', '1', str(roh))
    lauf('rubberband', '--fine', '-q', '-t', f'{faktor:.4f}', str(roh), str(ziel))
    return ziel


def angleichen(b, ziel):
    """Stimme auf die Lippen des Avatar-Clips legen (Sebi 23.10.: „mundbewegungen sind teils asynchron“,
    gemessen bis 0,38 s). Der Clip-Ton selbst verschluckt Woerter („kostenlos“), darum die saubere
    Stimme: jeder Satzteil ungeschnitten, sanft gedehnt, an seine Stelle im Clip gelegt, 8 ms Blende."""
    q, c = worte(b), worte('avatar-' + b)
    if len(q) != len(c):
        sys.exit(f'{b}: {len(q)} Woerter in der Stimme, {len(c)} im Clip')
    plan = lippen_plan(q, c)
    graph, n, eingaenge = [], len(plan), ['-i', str(ton(b))]
    for k, s in enumerate(plan):
        # Schnitt in der Pause (Mitte zum Nachbarwort), bei einer Teilung am Wortanfang
        qa = q[s['von']]['start'] - (min(0.12, (q[s['von']]['start'] - q[s['von'] - 1]['end']) / 2) if s['von'] else 0.12)
        qz = q[s['bis']]['end'] + (min(0.12, (q[s['bis'] + 1]['start'] - q[s['bis']]['end']) / 2) if s['bis'] + 1 < len(q) else 0.4)
        qa, vorlauf = max(0.0, qa), q[s['von']]['start'] - max(0.0, qa)
        beginn = max(0.0, s['start'] - vorlauf * s['faktor'])
        if SPRACHE in WEICH_DEHNEN:
            teil = weich_dehnen(ton(b), qa, qz, s['faktor'], ziel.with_name(f'{ziel.stem}-teil{k}.wav'))
            eingaenge += ['-i', str(teil)]
            kette = f'[{len(eingaenge) // 2 - 1}:a]aresample=48000,'
        else:
            kette = f'[0:a]atrim={qa:.3f}:{qz:.3f},asetpts=PTS-STARTPTS,aresample=48000,atempo={1 / s["faktor"]:.4f},'
        graph.append(kette + f'afade=t=in:d=0.008,areverse,afade=t=in:d=0.008,areverse,adelay={int(beginn * 1000)}:all=1[s{k}]')
    graph.append(''.join(f'[s{k}]' for k in range(n)) + f'amix=inputs={n}:normalize=0:duration=longest[o]')
    lauf('ffmpeg', '-loglevel', 'error', '-y', *eingaenge, '-filter_complex', ';'.join(graph),
         '-map', '[o]', '-ar', '48000', str(ziel))
    print(f'  {b}: {n} Satzteile, Dehnung {min(s["faktor"] for s in plan):.2f}-{max(s["faktor"] for s in plan):.2f}, '
          f'Rest-Versatz <= {max(s["fehler"] for s in plan):.2f} s')
    return ziel


def stueck(b, art, ziel):
    """Ein Abschnitt als einheitliches MP4 (720², 30 fps, AAC 48 kHz), Laenge zurueck."""
    if art == 'avatar':
        clip = Q / f'avatar-{b}.mp4'
        if not clip.exists():
            sys.exit(f'{clip.name} fehlt')
        d = dauer(clip)
        stimme = angleichen(b, ziel.with_suffix('.stimme.wav'))
        lauf('ffmpeg', '-loglevel', 'error', '-y', '-i', str(clip), '-i', str(stimme),
             '-filter_complex', f'[0:v]scale={GROESSE}:{GROESSE}:flags=lanczos,fps=30,format=yuv420p[v];'
             f'[1:a]aresample=48000,{PEGEL},apad,atrim=0:{d:.3f}[a]',
             '-map', '[v]', '-map', '[a]', '-t', f'{d:.3f}', '-c:v', 'libx264', '-crf', '23', '-preset', 'slow',
             '-c:a', 'aac', '-b:a', '128k', str(ziel))
        return d, 0.0
    d = VOR + dauer(ton(b)) + NACH
    lauf('ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'color=c={GRUND}:s={GROESSE}x{GROESSE}:r=30:d={d:.3f}',
         '-i', str(ton(b)), '-filter_complex', f'[1:a]aresample=48000,{PEGEL},adelay={int(VOR*1000)}:all=1,apad,atrim=0:{d:.3f}[a]',
         '-map', '0:v', '-map', '[a]', '-t', f'{d:.3f}', '-c:v', 'libx264', '-crf', '23', '-preset', 'slow',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', str(ziel))
    return d, VOR


def cues(b, start, versatz, ende, art='szene'):
    w = worte('avatar-' + b) if art == 'avatar' else worte(b)
    liste = CUES[b]
    out = []
    for i, (text, idx) in enumerate(liste):
        if idx >= len(w):
            sys.exit(f'{b}: Wortindex {idx} fehlt')
        von = start + versatz + w[idx]['start']
        bis = start + versatz + (w[liste[i + 1][1]]['start'] - 0.05 if i + 1 < len(liste) else w[-1]['end'] + 0.35)
        if i + 1 == len(liste):
            bis = ende - 0.05  # Sebi 23.10.: Untertitel in jedem Bereich, auch in der Sprechpause bis zum Schnitt
        # Wortzeiten: Skriptwoerter auf die Whisper-Woerter dieses Untertitels verteilen (Anzahl kann
        # abweichen: „social2scale“ vs. „Social to Scale“, „hinwillst“ vs. „hin willst“)
        ww = w[idx:liste[i + 1][1] if i + 1 < len(liste) else len(w)]
        sw = text.split(' ')
        if len(sw) == len(ww):
            zeiten = [x['start'] for x in ww]
        else:
            a0, a1 = ww[0]['start'], ww[-1]['end']
            zeiten = [a0 + (a1 - a0) * k / len(sw) for k in range(len(sw))]
        out.append({'von': round(von, 2), 'bis': round(min(bis, ende), 2), 'text': text,
                    'worte': [round(start + versatz + z, 2) for z in zeiten]})
    return out


def fassung(name, tmp):
    teile, abschnitte, untertitel, t = [], [], [], 0.0
    for b, art, szene in FASSUNGEN[name]:
        datei = tmp / f'{name}-{b}.mp4'
        d, versatz = stueck(b, art, datei)
        teile.append(datei)
        w = worte('avatar-' + b) if art == 'avatar' else worte(b)
        marken = {k: round(t + versatz + w[i]['start'], 2) for k, i in MARKEN.get(b, {}).items()}
        abschnitte.append({'von': round(t, 2), 'bis': round(t + d, 2), 'art': art, 'szene': szene, 'marken': marken})
        untertitel += cues(b, t, versatz, t + d, art)
        t += d
    liste = tmp / f'{name}.txt'
    liste.write_text(''.join(f"file '{p}'\n" for p in teile))
    roh = tmp / f'{name}-roh.mp4'
    lauf('ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(liste),
         '-c', 'copy', str(roh))
    ziel = ASSETS / f'film-{name}{ENDUNG}.mp4'
    toene_mischen(roh, ziel, sfx_ereignisse(abschnitte, dauer(roh)))
    return {'dauer': round(dauer(ziel), 2), 'abschnitte': abschnitte, 'untertitel': untertitel}


def main():
    tmp = HIER / '.bau' / SPRACHE
    tmp.mkdir(parents=True, exist_ok=True)
    daten = {n: fassung(n, tmp) for n in FASSUNGEN}
    lauf('ffmpeg', '-loglevel', 'error', '-y', '-ss', '0.4', '-i', str(Q / 'avatar-s1.mp4'), '-frames:v', '1',
         '-vf', f'scale={GROESSE}:{GROESSE}:flags=lanczos', '-q:v', '3', str(ASSETS / f'film-poster{ENDUNG}.jpg'))
    kopf = '// ERZEUGT von free-content/film/bauen.py, nicht von Hand aendern.\n'
    DATEN.write_text(kopf + 'export const FILM = ' + json.dumps(daten, ensure_ascii=False, indent=1) + ';\n')
    for n, d in daten.items():
        groesse = (ASSETS / f'film-{n}{ENDUNG}.mp4').stat().st_size / 1e6
        print(f'film-{n}{ENDUNG}.mp4  {d["dauer"]:.1f} s  {groesse:.2f} MB  {len(d["untertitel"])} Untertitel')


if __name__ == '__main__':
    main()
