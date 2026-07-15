# Design-Pass — Free-Content-Templates (15.07.2026)

`looks.html` rendert alle Varianten, `render.cjs` schießt sie als echte 1080×1350-PNGs.

```bash
node render.cjs     # braucht global installiertes playwright
```

## Was hier drin steckt

**Drei Look-Richtungen** (A „Ruhe" · B „Kante" · C „Klar"), je Profil-Vorschau + Post-Cover,
plus die zwei Wasserzeichen-Varianten am selben Bild.

**Die Farben sind Tokens, keine Konstanten.** Live werden `--paper/--ink/--accent/--rule`
pro Lead aus ihren Formularangaben (Stimmung + Lieblingsfarbe) abgeleitet. Dorotheas
Palette steht hier nur als Beispiel.

## Die Sperre (`.lock`) — der Kern

Unser Zeichen und IHR Handle sitzen in **einem** Element, das zugleich die Grundlinie der
Komposition trägt. Wer das Wasserzeichen wegradiert, nimmt ihren Namen und die Linie mit —
das Loch sieht man sofort. Das ist die Umsetzung von Spec §5a „integral, nicht größer".

⚠️ Das Wasserzeichen ist **kein Schloss** (Spec §5a). KI-Inpainting entfernt es in Sekunden.
Die Sperre macht die Entfernung *sichtbar*, nicht *unmöglich*. Wer hier ein Wettrüsten
anfängt, hat die Spec nicht gelesen.

## Gelernte Fallstricke

- **`document.fonts.ready` vor jedem Screenshot** — sonst rendert Chrome die Fallback-Schrift.
- **Kein Google-Fonts-Link im Artifact**: die CSP blockt Font-CDNs. Für die Auswahl-Seite
  deshalb gerenderte JPGs statt Live-HTML — sonst entscheidet Sebi über ein Design, das
  er gar nicht sieht.
- Headline **unten** verankern, Kicker oben: oben verankert klafft die Mitte leer.
- Phone-Mockup ~536px breit; breiter liest es sich als Tablet und der
  „das bin ja ICH"-Moment fällt flach.

## Offen — Sebi entscheidet
Look A/B/C · Wasserzeichen dezent/prominent · und die ehrliche Frage, ob A und B zu nah
an dem liegen, was gerade jede KI baut (warmes Papier + Serif · Anthrazit + Neongrün).
