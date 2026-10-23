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
Q = HIER / 'quelle'
ASSETS = HIER.parent.parent / 'assets'
DATEN = HIER.parent / 'src' / 'pages' / 'film-daten.js'
GROESSE = 720
GRUND = '0x04100d'
VOR, NACH = 0.25, 0.45  # Luft um eine Szene, damit die Ueberblendung nicht ins Wort faellt

# Untertitel je Baustein: (Text wie im Skript, Index des ersten Worts im Whisper-Wortlauf).
# Der Text kommt aus dem Skript, nie aus Whisper ("Social to Scale").
# Erstgespraech etwa 45 Minuten (Calendly blockt 45, PR #62; Stimme am 23.10.2026 neu).
CUES = {
    's1': [('Hallo, schön, dass du da bist.', 0), ('Ich bin die KI-Assistenz von social2scale', 6),
           ('und erkläre dir kurz, was jetzt passiert.', 15)],
    's2a': [('Deine Gratis-Vorschau ist unterwegs.', 0), ('Bestätige kurz die Mail in deinem Postfach,', 5),
            ('dann baut sich dein Feed fertig.', 12)],
    's2b': [('Phil, einer unserer beiden Gründer,', 0), ('kennt deine Antworten schon.', 5),
            ('Im Erstgespräch nimmt er sich', 9), ('etwa 45 Minuten für dich.', 14)],
    's3a': [('Wenn du danach mehr willst:', 0), ('Im Erstgespräch nimmt sich Phil,', 5),
            ('einer unserer beiden Gründer,', 10), ('etwa 45 Minuten für dich.', 14)],
    's4': [('Ihr klärt dein Ziel, deine Zielgruppe', 0), ('und wo du heute stehst.', 6),
           ('Danach sagen wir dir,', 11), ('welcher Weg zu dir passt.', 15)],
    's5': [('Das Gespräch ist kostenlos.', 0), ('Such dir am besten gleich einen Termin aus.', 4),
           ('Bis bald.', 12)],
}
# Wortmarken, an denen die Szene etwas zeigt (Index im Wortlauf).
MARKEN = {
    # Runde 4 (Sebi 23.10.: Zwischenszenen „sehr flach“): mehr Marken, jede bewegt etwas Eigenes.
    's1': {'name': 0},
    's2a': {'titel': 0, 'unterwegs': 4, 'mail': 5, 'post': 11, 'feed': 13},
    's2b': {'phil': 0, 'beide': 3, 'antworten': 6, 'gespraech': 9, 'zeit': 14},
    's3a': {'mehr': 0, 'gespraech': 5, 'phil': 9, 'beide': 12, 'zeit': 14, 'dich': 17},
    's4': {'klaert': 0, 'ziel': 2, 'gruppe': 4, 'stand': 7, 'weg': 15},
    's5': {'kostenlos': 3, 'termin': 9},
}
# Pegel: Rohstimmen liegen bei ~-23 LUFS, am Handy zu leise -> +4,5 dB, Limiter faengt die Spitzen.
PEGEL = 'volume=4.5dB,alimiter=limit=0.89:level=disabled'
# Toene (Runde 3, Sebi 17.10.: „evtl. noch so paar sound effekte“): selbst erzeugt (quelle/sfx/HERKUNFT.md),
# an denselben Stellen, an denen die Szene sich bewegt. Pegel: Spitzen ~-20 dBFS unter der Stimme (-18 LUFS).
SFX = {'swish': -11, 'tick': 8, 'pop': 5, 'riser': -8}
# Kacheln des Feeds fuellen sich gestaffelt (film.js: .1s + i * .14s), je Kachel ein Pop.
FEED_KACHELN = 3


def sfx_ereignisse(abschnitte, dauer_gesamt):
    """(Zeit, Ton) je Bewegung: Szenenwechsel, Kacheln, Antworten, zweiter Gruender, Schluss."""
    ev = [(a['von'] - 0.18, 'swish') for a in abschnitte[1:]]
    for a in abschnitte:
        m = a['marken']
        if 'feed' in m:
            ev += [(m['feed'] + 0.1 + i * 0.14, 'pop') for i in range(FEED_KACHELN)]
        if 'antworten' in m:
            ev += [(m['antworten'] + i * 0.25, 'tick') for i in range(3)]
        ev += [(m[k], 'tick') for k in ('ziel', 'gruppe', 'stand') if k in m]
        if 'beide' in m:
            ev.append((m['beide'], 'swish'))
        ev += [(m[k], 'tick') for k in ('mail', 'zeit') if k in m]
        if 'weg' in m:
            ev += [(m['weg'] + 0.1 + i * 0.09, 'pop') for i in range(3)]  # drei Balken der Bildmarke
    ev.append((dauer_gesamt - 0.75, 'riser'))
    return sorted((round(max(0.0, z), 3), n) for z, n in ev)


def toene_mischen(roh, ziel, ereignisse):
    eingaenge, graph = ['-i', str(roh)], []
    for k, (z, n) in enumerate(ereignisse, start=1):
        eingaenge += ['-i', str(Q / 'sfx' / f'{n}.wav')]
        ms = int(z * 1000)
        graph.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=mono,volume={SFX[n]}dB,adelay={ms}:all=1[e{k}]')
    alle = '[0:a]aformat=channel_layouts=mono[st];[st]' + ''.join(f'[e{k}]' for k in range(1, len(ereignisse) + 1))
    graph.append(f'{alle}amix=inputs={len(ereignisse) + 1}:normalize=0:duration=first,alimiter=limit=0.89:level=disabled[a]')
    lauf('ffmpeg', '-loglevel', 'error', '-y', *eingaenge, '-filter_complex', ';'.join(graph),
         '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
         '-movflags', '+faststart', '-map_metadata', '-1', str(ziel))


# (Baustein, Art, Szene) je Fassung. Art 'avatar' = Clip mit eigenem Bild, 'szene' = Grund + Stimme.
FASSUNGEN = {
    'a': [('s1', 'avatar', 'hallo'), ('s2a', 'szene', 'post'), ('s3a', 'szene', 'phil'),
          ('s4', 'szene', 'klaeren'), ('s5', 'avatar', 'termin')],
    'b': [('s1', 'avatar', 'hallo'), ('s2b', 'szene', 'kennt'), ('s4', 'szene', 'klaeren'),
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


def angleichen(b, ziel):
    """Stimme Wort fuer Wort auf die Lippen des Avatar-Clips legen (Sebi 23.10.: „mundbewegungen sind
    teils asynchron“; gemessen bis 0,38 s Versatz). Der Clip-Ton selbst verschluckt Woerter
    („kostenlos“), darum die saubere Stimme, zeitlich gedehnt/gestaucht zwischen den Wortanfaengen."""
    q, c = worte(b), worte('avatar-' + b)
    if len(q) != len(c):
        sys.exit(f'{b}: {len(q)} Woerter in der Stimme, {len(c)} im Clip')
    anker = [(q[0]['start'], c[0]['start'])]
    for a, z in zip(q[1:], c[1:]):
        if a['start'] - anker[-1][0] >= 0.12 and z['start'] - anker[-1][1] >= 0.12:
            anker.append((a['start'], z['start']))
    anker.append((q[-1]['end'], c[-1]['end']))
    teile, graph = [], []
    vor = anker[0][1] - anker[0][0]
    if vor > 0:
        graph.append(f'aevalsrc=0:d={vor:.3f}:s=48000[v0]'); teile.append('[v0]')
    start0 = max(0.0, -vor)
    for k in range(len(anker) - 1):
        (qa, ca), (qz, cz) = anker[k], anker[k + 1]
        qa = max(qa, start0) if k == 0 else qa
        tempo = min(2.0, max(0.5, (qz - qa) / (cz - ca)))
        graph.append(f'[0:a]atrim={qa:.3f}:{qz:.3f},asetpts=PTS-STARTPTS,aresample=48000,atempo={tempo:.4f},apad,atrim=0:{cz - ca:.4f}[s{k}]')  # exakte Laenge, sonst laeuft der Versatz auf
        teile.append(f'[s{k}]')
    graph.append(f'[0:a]atrim={anker[-1][0]:.3f},asetpts=PTS-STARTPTS,aresample=48000[rest]'); teile.append('[rest]')
    graph.append(''.join(teile) + f'concat=n={len(teile)}:v=0:a=1[o]')
    lauf('ffmpeg', '-loglevel', 'error', '-y', '-i', str(ton(b)), '-filter_complex', ';'.join(graph),
         '-map', '[o]', '-ar', '48000', str(ziel))
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
        out.append({'von': round(von, 2), 'bis': round(min(bis, ende), 2), 'text': text})
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
    ziel = ASSETS / f'film-{name}.mp4'
    toene_mischen(roh, ziel, sfx_ereignisse(abschnitte, dauer(roh)))
    return {'dauer': round(dauer(ziel), 2), 'abschnitte': abschnitte, 'untertitel': untertitel}


def main():
    tmp = HIER / '.bau'
    tmp.mkdir(exist_ok=True)
    daten = {n: fassung(n, tmp) for n in FASSUNGEN}
    lauf('ffmpeg', '-loglevel', 'error', '-y', '-ss', '0.4', '-i', str(Q / 'avatar-s1.mp4'), '-frames:v', '1',
         '-vf', f'scale={GROESSE}:{GROESSE}:flags=lanczos', '-q:v', '3', str(ASSETS / 'film-poster.jpg'))
    kopf = '// ERZEUGT von free-content/film/bauen.py, nicht von Hand aendern.\n'
    DATEN.write_text(kopf + 'export const FILM = ' + json.dumps(daten, ensure_ascii=False, indent=1) + ';\n')
    for n, d in daten.items():
        groesse = (ASSETS / f'film-{n}.mp4').stat().st_size / 1e6
        print(f'film-{n}.mp4  {d["dauer"]:.1f} s  {groesse:.2f} MB  {len(d["untertitel"])} Untertitel')


if __name__ == '__main__':
    main()
