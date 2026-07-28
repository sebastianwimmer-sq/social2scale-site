# Übergabe: Funnel-Formular-Features — intern → extern (28.07.2026)

> Die interne Session hat am 28.07. auf Bitte von Sebi Features gebaut, die laut
> `docs/WER-MACHT-WAS.md` **extern-Revier** sind (`free-content/src/pages/`). Sie sind
> **live, getestet, verifiziert**. Hiermit gehen sie in extern-Besitz über.
> Lesen aus `~/s2s-extern`: `git show feat/free-content-funnel:free-content/HANDOFF-form-28-07-intern-zu-extern.md`

## Wo es liegt
- **Branch:** `feat/free-content-funnel` (Commits `2d436c4`, `bbef859`, `79d6949`)
- **Live:** Worker `s2s-free-content` Version `b8528ca6` · Migration auf D1 `s2s-crm` gelaufen · 261 Tests grün · 7-Step-Flow im Browser durchgespielt (0 Konsolenfehler)

## Was ich in EUREM Revier geändert habe
| Datei | Änderung |
|---|---|
| `src/pages/form.js` (+53/−11) | Wizard **5 → 7 Schritte**: eigener **Ziel**-Step (vorher schickte das Formular `ziel:thema` — nur EIN Feld, Regina gab denselben Satz 2×), neue **Passungsfrage** „Wo stehst du heute?" (3-Klick-Chips), **Testimonial-Häkchen** (eigene `consent-opt`-Zeile, nicht vorausgewählt). Counter `1/7`, `TOTAL=7`. |
| `src/pages/shell.js` (+23) | **CSP als Report-Only** in `SICHERHEITS_HEADER` (blockt nie). Erlaubt Turnstile/inline/Fonts/`social2scale.com`. |
| `src/constants.js` (+1) | `FIELD_LIMITS.stand = 60`. |
| `test/api.test.js`, `test/validate.test.js`, `test/schema.sql` | +8 Tests + 2 Spalten im Test-Schema. |

## 🔗 WICHTIGE Kopplung an MEIN Revier (Motor)
Das Formular (euer) und die Validierung/Speicherung (mein: `validate.js`, `leads.js`,
`generate.js`) hängen jetzt über den **Payload-Vertrag** zusammen. Wenn ihr `form.js`
umbaut, MÜSST ihr diese Feldnamen weiter senden (sonst brechen Backend/DB/CRM):
- `ziel` (eigenes Feld, **nicht** = `branche`)
- `stand` (Passung, Werte: `"Ganz am Anfang"` / `"Poste unregelmäßig"` / `"Aktiv, will mehr"`)
- `testimonialConsent` (bool, nur bei echtem `true` gespeichert — DSGVO-Kopplungsverbot)

DB-Spalten dazu: `free_leads.stand`, `free_leads.testimonial_consent` (Migration
`migrate-freeleads-stand-testimonial.sql`, schon gelaufen). `mirrorToCrm` zeigt beide
auf der CRM-Karte. **Feldnamen ändern = mit intern absprechen** (`constants.js` +
Tests stehen ohnehin auf „vorher ansagen").

## 🟡 Offen (für euch, Ticket #2 im CRM)
- **Nav-Link „Gratis" direkt auf `/gratis/`** (Parität mit Erstgespräch → `/anfrage/`); scrollt aktuell nur zur `#gratis`-Sektion.
- **CSP von Report-Only auf scharf flippen** — vorher Turnstile-iframe/`frame-src` an der echten Seite gegenprüfen (rendert im Skript-Walk verzögert).
- Kosmetik: Hinweis „In 60 Sekunden" ist bei 7 Steps evtl. optimistisch · auf kurzen Viewports rutscht der Weiter-Button bei Textarea-Steps (Thema/Ziel) unter den Fold.

## 🔽 Downstream: `/results/` (extern) — wo die Testimonials zurückkommen
Sebi 28.07.: Auf `/results/` sind die **Platzhalter-Stimmen ersatzlos entfernt**. Genau
diese Lücke füllen später die **echten** Testimonials — und die entstehen aus dem
`testimonial_consent`-Häkchen, das diese Session eingebaut hat. Damit spannt sich ein
Datenfluss über die Bereichsgrenze:

```
Funnel-Formular (extern, form.js) ──Häkchen──▶ free_leads.testimonial_consent (intern, D1)
                                                        │
                            (Pipeline noch NICHT gebaut)│
                                                        ▼
                                          /results/ (extern) zeigt die Vorschau
```

- **Erfassung + Speicherung = intern.** Datenquelle: `free_leads WHERE testimonial_consent=1
  AND status='ready'`. Die fertige Vorschau liegt in R2 unter `free_leads.r2_prefix`
  (Bilder via `/img/<token>/<name>.jpg`). Einwilligungstext = **anonym** („anonym als
  Beispiel zeigen") → auf `/results/` **keinen Namen/Handle** zeigen, nur die Vorschau.
- **Anzeige = extern.** `/results/` rendert.
- **Saubere Naht = die D1-Abfrage / ein kleiner Read-Endpunkt.** Wenn ihr `/results/`
  mit echten Stimmen füllen wollt: sagt Bescheid, dann baue ich (intern) die
  Datenseite (Query/Endpunkt für einwilligende, fertige Vorschauen); ihr rendert.
  **Noch keine Einwilligungen aufgelaufen** — erst spec'en, wenn welche da sind.

## Empfehlung
So stehen lassen (getestet + live). Nicht neu bauen — draufsetzen. Bei Konflikt:
Worktrees teilen `.git`, meine Commits sind aus `~/s2s-extern` sofort sichtbar.
