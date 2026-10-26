#!/usr/bin/env python3
"""Eigene Töne für den Setting-Film (Sebi 25.10.2026: „gerne mehr Kreativität bzw. angepasst an die Situationen“).

Alle Töne stehen in EINER Tonart (A-Dur pentatonisch), damit sie zusammen klingen, und erzählen mit,
was im Bild passiert:
  ping-1 … ping-5   Noten aufsteigend: „Heute“ tief (1), „Dein Ziel“ hoch (5), Feed-Kacheln Note für Note
  glide             steigender Ton, solange sich der Weg von heute zum Ziel zeichnet (1,9 s wie film.js)
  chime             Dreiklang Note für Note wie die drei Balken der Bildmarke (0 / 0,09 / 0,18 s)
  stroke            leiser Federstrich unter ihrer Mail-Adresse
  whoosh-auf / -zu  Luftzug der Kreisblende: hoch beim Öffnen, runter beim Schließen
Selbst erzeugt (eigene Arbeit, keine Lizenzfrage), deterministisch (fester Zufallskeim).
Aufruf: python3 film/toene-bauen.py  → film/quelle/sfx/*.wav (48 kHz mono, Spitze -12 dBFS)
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
ZIEL = Path(__file__).resolve().parent / 'quelle' / 'sfx'
SPITZE = 10 ** (-12 / 20)
A4 = 440.0
PENTA = [0, 2, 4, 7, 9]  # A-Dur pentatonisch: A H Cis E Fis
NOTEN = [A4 * 2 ** ((12 + s) / 12) for s in PENTA]  # A5 … Fis6, hell aber weich
rng = np.random.default_rng(25102026)


def t(sek):
    return np.arange(int(SR * sek)) / SR


def ton(f, sek=0.7, abkling=7.0, obertoene=((1, 1.0), (4.0, 0.12), (9.2, 0.04))):
    """Marimba-artig: Grundton + wenige Obertöne, schneller Anschlag, exponentielles Abklingen."""
    x = t(sek)
    s = sum(a * np.sin(2 * np.pi * f * k * x) * np.exp(-abkling * k ** 0.5 * x) for k, a in obertoene)
    an = np.minimum(1, x / 0.004)
    return s * an


def rauschen(sek, tief, hoch, start_rel, ende_rel):
    """Gefiltertes Rauschen, dessen Band über die Dauer von start_rel zu ende_rel wandert (FFT-Maske je Block)."""
    n = int(SR * sek); roh = rng.standard_normal(n); aus = np.zeros(n); blk = 2048
    for i in range(0, n, blk // 2):
        teil = roh[i:i + blk]
        if len(teil) < 32:
            break
        w = np.hanning(len(teil)); F = np.fft.rfft(teil * w); fr = np.fft.rfftfreq(len(teil), 1 / SR)
        p = i / n; mitte = tief * (hoch / tief) ** (start_rel + (ende_rel - start_rel) * p)
        F *= np.exp(-((np.log(fr + 1) - np.log(mitte)) ** 2) / (2 * 0.35 ** 2))
        aus[i:i + len(teil)] += np.fft.irfft(F, len(teil))
    return aus


def huelle(n, an, ab):
    x = np.linspace(0, 1, n)
    return np.minimum(1, x / an) * np.minimum(1, (1 - x) / ab)


def norm(s):
    return s / (np.abs(s).max() + 1e-9) * SPITZE


def schreiben(name, s):
    ZIEL.mkdir(parents=True, exist_ok=True)
    d = (np.clip(norm(s), -1, 1) * 32767).astype('<i2')
    with wave.open(str(ZIEL / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())


def main():
    for i, f in enumerate(NOTEN, start=1):
        schreiben(f'ping-{i}', ton(f))
    # steigender Ton über 1,9 s von Note 1 zu Note 5, weich ein- und ausgeblendet
    x = t(1.9); f = NOTEN[0] * (NOTEN[4] / NOTEN[0]) ** (x / 1.9); ph = 2 * np.pi * np.cumsum(f) / SR
    schreiben('glide', (np.sin(ph) + 0.15 * np.sin(2 * ph)) * huelle(len(x), 0.15, 0.25))
    # Dreiklang A–Cis–E nacheinander wie die drei Balken
    c = np.zeros(int(SR * 1.4))
    for k, (f0, vers) in enumerate(zip([NOTEN[0], NOTEN[2], NOTEN[3]], [0, 0.09, 0.18])):
        s = ton(f0, 1.2, abkling=3.2, obertoene=((1, 1.0), (2.0, 0.25), (3.01, 0.08)))
        a = int(vers * SR); c[a:a + len(s)] += s * (0.8 + 0.1 * k)
    schreiben('chime', c)
    # Federstrich: kurzes, helles Rauschen, das wie ein Stift über Papier zieht
    n = int(SR * 0.55); schreiben('stroke', rauschen(0.55, 2500, 9000, 0.2, 0.8) * huelle(n, 0.1, 0.5))
    # Kreisblende: Luftzug hoch (auf) und runter (zu)
    n = int(SR * 0.6)
    schreiben('whoosh-auf', rauschen(0.6, 300, 6000, 0.0, 1.0) * huelle(n, 0.55, 0.3))
    schreiben('whoosh-zu', rauschen(0.6, 300, 6000, 1.0, 0.0) * huelle(n, 0.2, 0.6))
    print('Töne:', ', '.join(sorted(p.stem for p in ZIEL.glob('*.wav'))))


if __name__ == '__main__':
    main()
