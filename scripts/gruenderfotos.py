#!/usr/bin/env python3
"""Erzeugt die Gruenderfotos fuer /about/ und die Duo-Signatur der uebrigen Seiten.

WARUM ES DIESES SKRIPT GIBT
───────────────────────────
Die beiden Aufnahmen kommen aus voellig verschiedenem Licht: Philipp nachts
unter warmem Kunstlicht vor schwarzem Grund, Sebastian im Studio vor kuehlem
Weiss. Nebeneinander lasen sie sich wie zwei Marken. Ohne dieses Skript ist
nach dem naechsten Neuschnitt niemand mehr in der Lage, denselben Look
herzustellen — die Bilder wuerden still wieder auseinanderdriften.

ENTSCHEIDUNGEN, DIE HIER DRINSTECKEN (01.09.2026)
─────────────────────────────────────────────────
  · Der Look wird IN die Datei gerechnet, nicht per CSS-`filter` gelegt: jeder
    Browser rechnet Filter anders, und die ausgelieferte Datei bliebe falsch.
  · Nur der Weissabgleich wird angeglichen, und auch nur zu 62 %. Eine erste
    Fassung zog die Saettigung auf 42 % — beide sahen leblos aus ("wie wenn wir
    beide gestorben waeren"). Saettigung liegt jetzt bewusst UEBER dem Original.
  · Verworfen: Sebastians Studio-Hintergrund per Helligkeitsmaske freistellen
    und wegdunkeln. Das erzeugte wolkige Flecken — schlechter als der ehrliche
    Helligkeitsunterschied. Der Rest wird im CSS mit einer Randabdunklung
    aufgefangen (`.ab-pic.is-hell` in about/index.html).
  · Nur die grosse Platte von Philipp wird gespiegelt: auf /about/ steht er in
    der LINKEN Karte und blickt sonst aus dem Layout heraus. Der runde Marker
    bleibt ungespiegelt — dort steht er rechts neben Sebastian und schaut so
    zur Gruppe hin. Achtung: durch die Spiegelung ist sein Unterarm-Tattoo
    seitenverkehrt (abstraktes Motiv, keine Schrift).

BENUTZUNG
─────────
    python3 scripts/gruenderfotos.py <phil.jpg> <sebi.jpg>

Die Originale liegen NICHT im Repo (privat). Sie stammen aus Sebis
Fotos-Mediathek; die Zuschnitt-Koordinaten unten beziehen sich auf genau diese
beiden Dateien (Philipp 1440x2159, Sebastian 768x1024).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ZIEL = Path(__file__).resolve().parent.parent / "assets"

# Zuschnitt: Kopf plus Oberkoerper, damit beide Gesichter gleich gross wirken.
# Philipps Aufnahme war eine Totale neben einem engen Portraet.
CROP  = {"phil": (346, 71, 1235, 1182), "sebi": (0, 24, 768, 984)}
AVATAR= {"phil": (477, 144, 1017, 684), "sebi": (133, 168, 613, 648)}
NAME  = {"phil": "founder-philipp", "sebi": "founder-sebastian"}
BREIT = {"phil": [560, 880], "sebi": [560, 768]}

KRAFT_WEISSABGLEICH = 0.62   # nur so weit, dass der Farbbruch verschwindet
SAETTIGUNG          = 1.06   # ueber Original — gegen den toten Eindruck
KONTRAST            = 0.20   # weiche S-Kurve, macht Brillanz statt Grau


# — sRGB <-> LAB (D65) ————————————————————————————————————————————————
M_RGB2XYZ = np.array([[.4124564, .3575761, .1804375],
                      [.2126729, .7151522, .0721750],
                      [.0193339, .1191920, .9503041]])
M_XYZ2RGB = np.linalg.inv(M_RGB2XYZ)
WP = np.array([.95047, 1.0, 1.08883])

def _lin(c):  return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def _srgb(c): return np.where(c <= .0031308, c * 12.92, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - .055)
def _f(t):    return np.where(t > .008856, np.cbrt(t), 7.787 * t + 16 / 116)
def _fi(t):   return np.where(t ** 3 > .008856, t ** 3, (t - 16 / 116) / 7.787)

def rgb2lab(a):
    xyz = _lin(a) @ M_RGB2XYZ.T / WP
    fx, fy, fz = (_f(xyz[..., i]) for i in range(3))
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], -1)

def lab2rgb(lab):
    fy = (lab[..., 0] + 16) / 116
    fx, fz = fy + lab[..., 1] / 500, fy - lab[..., 2] / 200
    xyz = np.stack([_fi(fx), _fi(fy), _fi(fz)], -1) * WP
    return np.clip(_srgb(xyz @ M_XYZ2RGB.T), 0, 1)


def motiv_maske(lab):
    """Grob das Motiv statt des Hintergrunds gewichten — sonst zieht die weisse
    Studiowand den Schnitt, an dem der Weissabgleich ausgerichtet wird."""
    L, chroma = lab[..., 0], np.hypot(lab[..., 1], lab[..., 2])
    return ((L > 12) & (L < 88) & (chroma > 6)).astype(np.float64)


def kennwerte(lab, w):
    s = w.sum()
    if s < 1000:
        w = np.ones_like(w); s = w.sum()
    mu = [(lab[..., i] * w).sum() / s for i in range(3)]
    sd = [np.sqrt(((lab[..., i] - mu[i]) ** 2 * w).sum() / s) for i in range(3)]
    return np.array(mu), np.array(sd)


def look(lab, mu, sd, zmu, zsd):
    out = lab.copy()
    for i in (1, 2):                                    # nur Farbe angleichen
        skal = np.clip(zsd[i] / max(sd[i], 1e-6), .85, 1.2)
        neu = (lab[..., i] - mu[i]) * skal + zmu[i]
        out[..., i] = lab[..., i] * (1 - KRAFT_WEISSABGLEICH) + neu * KRAFT_WEISSABGLEICH
    L, a, b = out[..., 0], out[..., 1], out[..., 2]
    t = np.clip(L / 100, 0, 1)
    schatten = np.clip(1 - t * 1.8, 0, 1)
    lichter = np.clip((t - .52) / .48, 0, 1)
    a = (a - 0.9 * schatten) * SAETTIGUNG                # Schatten einen Hauch kuehl
    b = (b - 1.4 * schatten + 2.4 * lichter) * SAETTIGUNG  # Lichter warm = lebendige Haut
    Ln = (t + KONTRAST * (t - .5) * (1 - np.abs(2 * t - 1))) * 100
    return np.stack([np.clip(Ln, 0, 100), a, b], -1)


def vignette(rgb, staerke=.14):
    h, w = rgb.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    return rgb * (1 - staerke * np.clip((r - .55) / .85, 0, 1) ** 1.6)[..., None]


def marker_vignette(im, staerke, dimmen=1.0):
    """Die runden Marker sind 46 px klein — dort traegt ein heller Hintergrund
    nichts bei, er reisst den Kreis nur auf."""
    a = np.asarray(im, np.float64) / 255
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    m = 1 - staerke * np.clip((r - .30) / .70, 0, 1) ** 1.4
    return Image.fromarray((np.clip(a * m[..., None] * dimmen, 0, 1) * 255).round().astype(np.uint8))


def bauen(quellen):
    labs = {n: rgb2lab(np.asarray(Image.open(p).convert("RGB"), np.float64) / 255)
            for n, p in quellen.items()}
    kw = {n: kennwerte(labs[n], motiv_maske(labs[n])) for n in labs}
    zmu = np.mean([kw[n][0] for n in kw], 0)
    zsd = np.mean([kw[n][1] for n in kw], 0)

    for n in labs:
        mu, sd = kw[n]
        im = Image.fromarray((vignette(lab2rgb(look(labs[n], mu, sd, zmu, zsd))) * 255)
                             .round().astype(np.uint8))

        platte = im.crop(CROP[n])
        if n == "phil":
            platte = platte.transpose(Image.FLIP_LEFT_RIGHT)   # Blick ins Layout
        for w in BREIT[n]:
            platte.resize((w, round(w * 5 / 4)), Image.LANCZOS).save(
                ZIEL / f"{NAME[n]}-{w}.webp", "WEBP", quality=82, method=6)
        w = min(BREIT[n])
        platte.resize((w, round(w * 5 / 4)), Image.LANCZOS).save(
            ZIEL / f"{NAME[n]}-{w}.jpg", "JPEG", quality=80, optimize=True, progressive=True)

        # Die helle Aufnahme braucht als Marker mehr Hand als die dunkle.
        vign, dim = (.62, .90) if n == "sebi" else (.42, 1.0)
        av = marker_vignette(im.crop(AVATAR[n]).resize((192, 192), Image.LANCZOS), vign, dim)
        av.save(ZIEL / f"{NAME[n]}-avatar-192.webp", "WEBP", quality=84, method=6)
        av.save(ZIEL / f"{NAME[n]}-avatar-192.jpg", "JPEG", quality=82, optimize=True)
        print("geschrieben:", NAME[n])


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__.split("BENUTZUNG")[1].strip())
    bauen({"phil": sys.argv[1], "sebi": sys.argv[2]})
