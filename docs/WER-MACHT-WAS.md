# Wer macht was — Koordination bei mehreren parallelen Sessions

> Angelegt 28.07.2026, nachdem sich zwei Claude-Sessions im selben Ordner
> überschnitten haben: eine hat `/gratis/` gebaut, die andere wollte dasselbe bauen,
> und eine hat dann per `git checkout` den Branch unter der anderen weggeschaltet.

## Warum das nötig ist

Die Trennung wurde nach **Thema** versucht („extern" vs. „intern"). Git kollidiert
aber nach **Ordner** — und die Themen liegen quer zu den Ordnern:

| Thema | Wo der Code liegt |
|---|---|
| Website (extern) | `social2scale-site/` |
| Funnel-Oberfläche (extern) | `social2scale-site/free-content/src/pages/` |
| Follow-up-Mails (intern) | `social2scale-site/free-content/src/mail.js` — **selber Ordner** |
| CRM / Portal (intern) | `~/social2scale-clients/_portal` (eigenes Repo) |

Der Funnel ist gleichzeitig extern (was die Kundin sieht) und intern (was ins CRM
schreibt). Zwei Sessions, die je „ihr" Thema bearbeiten, landen zwangsläufig in
derselben Datei.

## Die drei Regeln

1. **Ein Arbeitsordner = eine Session.** Immer. Themenüberschneidung ist harmlos,
   solange die Ordner verschieden sind. Ordnerüberschneidung ist tödlich, auch wenn
   die Themen verschieden sind.
2. **Nie `git checkout` in einem Ordner, den man nicht besitzt.** Das schaltet der
   anderen Session den Branch weg und gefährdet ihre nicht-committeten Änderungen.
3. **Nur eine Session merged nach `main`** — und sagt es vorher hier an.

## Wer hat gerade welchen Ordner

Diese Tabelle beim Start aktualisieren und committen. Leere Zeile = Ordner frei.

| Ordner | Branch | Session | Bereich | seit |
|---|---|---|---|---|
| `~/social2scale-site` | `feat/free-content-funnel` | intern | Funnel-Motor, CRM-Anbindung, Follow-up | 28.07. |
| `~/s2s-extern` | `feat/website-extern` | extern | Website, SEO, Nav, Funnel-Oberfläche | 28.07. |

## Am 28.07. bereits erledigt — NICHT nochmal bauen

Der eigentliche Ausloeser dieser Datei war doppelte Arbeit: beide Sessions haben
gleichzeitig `/gratis/` gebaut. Damit das nicht wieder passiert, steht hier, was
an der externen Flaeche fertig ist.

| ✅ Erledigt | Commit | Anmerkung |
|---|---|---|
| `/gratis/` Weiterleitung | `9082155` | von der internen Session gebaut |
| `HEAD /` liefert 200 statt 404 | `2d436c4` | intern |
| Nav-Eintrag „Gratis" auf allen 4 Seiten mit Menü | `f638499` | extern |
| `#gratis`-Knopf zeigt auf `/gratis/` | `f638499` | **Funnel-Adresse steht jetzt NUR in `gratis/index.html`** |
| Burger-Umschaltpunkt 819 → 959px | `f638499` | Menüleiste brach zwischen 820 und 959px um |
| SEO-Technik: llms.txt, Titel, Descriptions, sitemap-lastmod, robots | `4e6d4e7` | llms.txt nannte noch 3× PEAKING |
| `/results/` ohne Platzhalterzahlen, mit Definitionen + Messrhythmus | `e478301`, `4c511d7` | Messrhythmus von Sebi gegengelesen |

**Noch offen an der externen Fläche** (gehört der externen Session):
Inhaltsstrang für Google (die Seite rankt für nichts außer dem eigenen Namen) ·
Preistransparenz fehlt komplett · echte Referenzen der sechs Kundinnen statt der
entfernten Platzhalter-Stimmen · Schaufläche aus generierten Feeds.

**Nicht anfassen ohne Absprache:** die Funnel-Adresse. Sie steht an genau einer
Stelle (`gratis/index.html`, dort dreimal: meta-refresh, JS, Fallback-Knopf).
Beim Domain-Umzug ist das die einzige Datei, die geaendert werden muss.

## 🔗 Payload-Vertrag Formular ↔ Backend

Die einzige Stelle, an der sich die beiden Bereiche wirklich beruehren.
`free-content/src/pages/form.js` (**extern**) baut das Objekt,
`validate.js` / `leads.js` / `generate.js` (**intern**) lesen es.

**Regel: Feldnamen aendern nur nach Absprache — auf beiden Seiten gleichzeitig.**
Ein umbenanntes Feld faellt nicht auf, es kommt einfach leer an. Genau die Sorte
Fehler, die still bleibt (siehe Learnings vom 27.07.: „wo ein Fallback existiert,
ist ‚laeuft durch' kein Beweis").

| Feld | Inhalt | Quelle im Formular |
|---|---|---|
| `name` | Name | `#f-name` |
| `email` | E-Mail | `#f-mail` |
| `handle` | Instagram-Handle, ohne `@` | `#f-handle` |
| `branche` | ⚠️ enthaelt das **Thema**, nicht die Branche | `#f-thema` |
| `ziel` | Ziel — **eigenes Feld**, nicht mit Thema zusammengelegt | `#f-ziel` |
| `stimmung` | Stimmungs-Chip | `#stimmung .chip[aria-pressed=true]` |
| `stand` | Wo die Interessentin heute steht | `#stand .chip[aria-pressed=true]` |
| `farbe` | derzeit immer leer | — |
| `consent` | Einwilligung Kontaktaufnahme (immer `true`) | Pflicht-Text |
| `testimonialConsent` | freiwillige Einwilligung „darf oeffentlich gezeigt werden" | `#f-testimonial` |
| `elapsed` | Millisekunden seit Formularstart (Bot-Erkennung) | — |
| `turnstile` | Turnstile-Token | — |
| `source` | fest `'formular'` | — |

⚠️ **`branche` traegt das Thema.** Kein Fehler, aber eine Namensfalle: wer spaeter
eine echte Branchenangabe erwartet, liegt daneben. Umbenennen waere sauberer,
geht aber nur abgestimmt auf beiden Seiten.

**Stand 28.07.2026 geprueft:** `form.js` sendet `ziel`, `stand` und
`testimonialConsent`; `validate.js` und `leads.js` lesen alle drei unter genau
diesen Namen. `generate.js` liest `testimonialConsent` bewusst nicht —
Einwilligung ist Speicher- und Rechtsthema, keine Inhaltserzeugung.

### Der Vertrag wird geprueft, nicht geglaubt

```bash
node scripts/payload-vertrag-pruefen.mjs
```

Liest den `payload`-Block aus `form.js` und gleicht ihn gegen `validate.js` und
`leads.js` ab. Exit 1, sobald ein Pflichtfeld fehlt — und es meldet zusaetzlich
neue, im Vertrag unbekannte Felder, was Umbenennungen direkt sichtbar macht
(`ziel` fehlt + `zielsetzung` neu = jemand hat umbenannt).

Das Skript liegt in `scripts/` (externe Session) und fasst keine fremden Dateien
an: solange `free-content/` nur auf `feat/free-content-funnel` liegt, liest es
per `git show` von dort; nach einem Merge findet es die Dateien direkt im
Arbeitsverzeichnis. Beide Wege sind eingebaut.

**Sinnvoll vor jedem Push**, der `form.js`, `validate.js` oder `leads.js`
beruehrt — von welcher Session auch immer.

## Besitz nach Bereich

Damit man nicht bei jeder Datei nachfragen muss:

| Bereich | Besitzer | Dateien |
|---|---|---|
| Website | **extern** | `index.html`, `about/`, `for-you/`, `results/`, `gratis/`, `anfrage/`, `danke/`, `404.html`, `assets/`, `fonts.css`, `sitemap.xml`, `robots.txt`, `llms.txt` |
| Funnel-Oberfläche | **extern** | `free-content/src/pages/`, `free-content/src/templates/`, `free-content/design/` |
| Funnel-Motor | **intern** | `free-content/src/generate.js`, `index.js`, `leads.js`, `mail.js`, `copy.js`, `render.js`, `moderate.js`, `disposable.js` |
| Infrastruktur | **intern** | `wrangler.toml`, `workers/`, `~/social2scale-clients/_portal` |
| Shell und Bauschritt | **extern** | `s2s.css`, `lib/shell.mjs`, `scripts/build-pages.mjs`, `tests/`, `playwright.config.mjs` — Ablauf: `docs/SEITEN-BAUEN.md` |
| Vorher ansagen | beide | `free-content/src/constants.js`, `package.json`, Testdateien |

⚠️ **Falle:** `free-content/src/copy.js` (Claude-Texterzeugung = Motor, **intern**) und
`free-content/src/pages/copy.js` (Seite = Oberfläche, **extern**) sind zwei
verschiedene Dateien mit demselben Namen. Genau hier knallt es sonst.

## Wie die Sessions miteinander reden

**Worktrees teilen dasselbe `.git`.** Ein Commit in einem Ordner ist im anderen
sofort sichtbar — ohne Push, ohne Umweg über GitHub.

```bash
# Was macht die andere Session gerade?
git log --all --oneline -10
git worktree list

# Diese Datei lesen, egal auf welchem Branch sie zuletzt aktualisiert wurde
git show feat/website-extern:docs/WER-MACHT-WAS.md
```

Zum Ansagen: Zeile in der Tabelle oben ändern, committen. Das ist die Nachricht.

## Worktree anlegen / entfernen

```bash
# Neuen Arbeitsordner mit eigenem Branch (Basis: aktueller main)
git -C ~/social2scale-site worktree add -b <branch> ~/<ordner> origin/main

# Wenn fertig: Branch mergen, dann aufräumen
git -C ~/social2scale-site worktree remove ~/<ordner>
```

## Wenn es trotzdem geknallt hat

1. `git worktree list` — wer sitzt wo.
2. `git reflog` — er zeigt Fremdeingriffe („checkout: moving from X to Y", das man
   selbst nicht ausgelöst hat) und rettet verlorene Commits.
3. Nicht-committete Änderungen zuerst sichern: `git stash` oder Datei kopieren.
