# Multi-Slide-Karussell-Posts — Design-Spec

**Datum:** 2026-07-23
**Kontext:** Free-Content-Funnel Reveal. Bisher zeigt der Reveal 3 Einzel-Posts
(je 1 Bild). Ziel: die 3 Posts werden echte, durchswipebare Instagram-Karussells
(je 3 Slides: Hook → Value → CTA) mit personalisierten Texten + Caption pro Post.

**Kunden-Entscheidungen (23.07.):** 3 Slides/Post (schlank), Spec-first.

---

## 1. Ziel & Nicht-Ziel

**Ziel:** Aus „3 Vorschau-Bilder" wird „3 fertige, postbare Karussell-Posts" —
sichtbar mehr Wert im Reveal, näher am echten Deliverable.

**Nicht-Ziel (jetzt):** Der KI-Lern-Loop aus vergangenen Anfragen (eigenes
Phase-2-Projekt). Keine Änderung an Formular, Mail, Bot-Schutz, Confirm-Flow.

## 2. Frame-Budget (die harte Grenze)

- **2 Profil** (1 pro Farbwelt) — der Hero bleibt.
- **3 Posts × 3 Slides × 2 Farbwelten = 18** Slide-Frames.
- **Total: 20 Frames** (bisher 8). Bauzeit-Erwartung ~45–60 s.

**FRAME_IDS (neu):**
```
f-<w>-profil                      (w = 0|1)
f-<w>-p<p>-s<s>                    (p = 1..3 Post, s = 1..3 Slide)
```
Reihenfolge = Render-Reihenfolge: pro Farbwelt zuerst Profil, dann p1(s1,s2,s3),
p2(...), p3(...). `total` im Build-Screen/Poller = FRAME_IDS.length (20).

## 3. Copy / Claude (copy.js)

Claude liefert zusätzlich zu `{eyebrow,head,headAccent,sub,bio,cells}` ein
`posts`-Array (GENAU 3):
```json
"posts": [
  {
    "slides": [
      {"kind":"hook","eyebrow":"…","head":"…","headAccent":"…","sub":"…"},
      {"kind":"value","eyebrow":"…","head":"…","headAccent":"…","sub":"…"},
      {"kind":"cta","eyebrow":"…","head":"…","headAccent":"…","sub":"…"}
    ],
    "caption":"… (fertige IG-Caption inkl. Hashtags) …"
  }, …3
]
```
- Slide 1 = Hook (Spannung), Slide 2 = Value (konkreter Nutzen), Slide 3 = CTA
  (sanfte Handlung, z. B. „Folge @handle für mehr" / „Speicher dir das").
- Dieselben HWG-Regeln wie bisher gelten für ALLE Slides + Captions.
- `captions` (Top-Level, aktuell 3) wird durch `posts[i].caption` ersetzt.
- **Fallback (`buildFallback`):** generische posts (3×3 Slides + Caption), HWG-sicher,
  ohne claim-trächtige branche verbatim — wie bei den bisherigen Captions.
- **`formStimmt`:** prüft `posts` = Array Länge 3, jede mit `slides` Länge 3
  (jede Slide mit nicht-leeren head/headAccent/sub) + nicht-leerer caption.
- `MAX_TOKENS` hoch (1200 → ~2500), da die Antwort deutlich größer wird.

## 4. Frames (frames.js + css.js)

Drei Slide-Layouts (ein Renderer, `kind` steuert die Variante), damit ein
Karussell nicht 3× identisch aussieht:
- **hook:** wie der heutige Cover-Slide (großes Headline-Statement).
- **value:** Nummer/Punkt-betont (z. B. große „01"/Kernaussage + Sub).
- **cta:** ruhiger Abschluss (Handle groß + „Folge für mehr" + Sub).

Gemeinsam: Farbwelt-Tokens, `.lock`-Watermark (echtes Logo, s. bestehende Regel)
auf JEDER Slide, Slide-Index „01 / 03" innerhalb des Posts. Profil-Frame bleibt
unverändert (zeigt weiter das 3×3-Feed-Raster).

## 5. Render (render.js / generate.js)

- Weiter EINE Browser-Session, alle 20 Frames auf einer Seite, sequenzielle
  `element.screenshot()` (Muster bleibt). `onProgress` zählt bis 20.
- **Risiko Browser-Rendering-Session-Dauer bei 20 Frames:** vor dem Bau mit einem
  Wegwerf-Lauf verifizieren. **Plan B**, falls es eng wird: Frames in 2 Batches
  über 2 `newPage()`-Durchläufe (selbe Session) rendern. Erst umsetzen, wenn der
  Verifikations-Lauf es fordert (YAGNI).
- `content.json` speichert weiterhin die Captions — jetzt aus `posts[i].caption`
  (3 Captions, Struktur unverändert → `/api/content/:token` bleibt gleich).

## 6. Reveal (reveal.js)

**Gesten-Regel gegen Konflikt:** außen **vertikal** (durch die 3 Posts scrollen),
innen **horizontal** (durch die 3 Slides eines Posts swipen). Kein
horizontal-in-horizontal.

Pro Post-Block:
- Horizontales Slide-Karussell (scroll-snap) der 3 Slides (`f-<w>-p<post>-s<1..3>`).
- Dots-Indikator „● ○ ○" (aktive Slide).
- Caption darunter + „Caption kopieren" (wie bisher, pro Post eine Caption).

Farbwelt-Switcher tauscht die Bild-Quellen ALLER Slides (world 0/1). Hero-Profil,
Offer-Block, CTAs, Share, Download bleiben wie sie sind (Download/Share weiter auf
`f-<w>-profil`).

## 7. Build-Screen (result.js)

- `total` = 20 (aus FRAME_IDS). Fortschrittsbalken/Kacheln skalieren automatisch.
- Die 3 echten Grid-Kacheln des Build-Screens ziehen ihre Bilder aus den ersten
  Slides der Posts (`f-0-p1-s1`, `f-0-p2-s1`, `f-0-p3-s1`) statt der alten s1..s3.

## 8. Kompatibilität

Kein Back-Compat nötig (pre-launch, nur Testleads). Alte 8-Frame-Leads werden
nicht migriert; neue Struktur ersetzt die alte vollständig.

## 9. Tests

- **copy:** neue `posts`-Struktur (Claude-Pfad + Fallback), `formStimmt`.
- **frames:** 20 FRAME_IDS, 3 Slide-Layouts rendern (Sicht-Check auf beiden Welten).
- **render/generate:** 20 Keys, `content.json` mit 3 Captions aus posts.
- **pages:** Reveal-Markup (3 Post-Blöcke, je 3 Slides, Dots, Caption+Kopieren).

## 10. Offene Risiken (bewusst)

1. Browser-Rendering-Session bei 20 Frames — Verifikations-Lauf vor dem Bau.
2. Größere Claude-Antwort (mehr JSON) — max_tokens + robuster Fallback.
3. Reveal wird deutlich länger (3 Karussells) — Scroll-Reveal/Perf im Blick behalten.
