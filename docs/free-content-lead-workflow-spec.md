# Spec: Was passiert mit einem Free-Content-Lead?

**Stand 27.07.2026 — noch nicht gebaut.** Ausgelöst durch Regina (@newspirit_consciousliving),
den ersten echten Lead durch den Funnel. Sie war im Eingang auffindbar, sonst nirgends.

---

## 1 · Woran wir uns orientieren: am eigenen System

Es braucht kein neues Konzept — die Teile existieren, sie sind nur nicht verbunden.

| Vorhanden | Wo | Zustand |
|---|---|---|
| Eingang (`submissions`) | CRM | ✅ Funnel schreibt rein |
| Kundenkarte (`clients`) | CRM | ❌ wird für Free-Leads nie angelegt |
| Auto-Anlage einer Karte aus einem Formular | `_portal/_worker.js:1084` | ✅ existiert — aber nur für `onboarding` + `briefing`, nicht für `free_content` |
| Pipeline-Stufen | `_portal/_worker.js:1916` | `briefing · arbeit · review · closing · booked` — **keine Stufe VOR briefing** |
| Closing-KI (`ai_assessment`) | `_portal/_worker.js:2758` | ✅ „Closing-Coach": Kurz-Einschätzung · Closing-Strategie · Einwände+Antworten · Upsell |
| Strategie-KI (`ai_strategy`) | `_portal/_worker.js:2846` | ✅ Account-Blueprint: Positionierung · Säulen · Bio · 10 Post-Ideen |
| Benachrichtigung an die Founder | `free-content/src/mail.js` | ✅ feuert bei jedem `ready` — aber nacktes HTML, ohne Link, an `info@` |

**Beide KIs brauchen als Input eine Kundenkarte.** Genau deshalb konnte bei Regina keine
laufen. Die fehlende Karte ist nicht nur ein Auffindbarkeitsproblem — sie blockiert die
gesamte nachgelagerte Automatik.

Und der Funnel liefert genau die Felder, die die Prompts wollen: Thema (`branche`),
Ziel, Stimmung, Handle. Ein Free-Lead ist für die Closing-KI **besser** dokumentiert als
mancher Kaltkontakt.

---

## 2 · Zielbild (Sebis Vorgabe: „automatisch anlegen, aber als offen — Phil closed")

```
Formular → Bestätigungsmail → Feed fertig
        ├─ Eingang (bleibt wie es ist)                    ✅ existiert
        ├─ Kundenkarte automatisch, Status "offen"        ← NEU
        ├─ Mail an Sebi + Phil, mit Link zum Feed         ← aufwerten
        └─ Closing-KI läuft auf die neue Karte            ← anstoßen
                    ↓
            Phil übernimmt und closed
```

Kernpunkt: **Die Automatik bereitet vor, sie entscheidet nicht.** Am Ende steht immer
ein Mensch, der das Gespräch führt. Die Karte kommt als *offen* rein, nicht als Kundin.

---

## 3 · Zu bauen

### 3.1 Kundenkarte automatisch anlegen + verknüpfen
`mirrorToCrm()` in `free-content/src/generate.js` legt heute nur die Eingangszeile an.
Ergänzen: Karte anlegen (Muster 1:1 aus `_portal/_worker.js:1084` übernehmen, damit die
Zeilen identisch aussehen), `submissions.client_id` setzen.

Vorbelegung:
- `name` = ihr Name · `contact` = E-Mail · `accounts` = `@handle`
- `niche` = ihr Thema (aus `branche`)
- `notes` = „Automatisch aus Free-Content-Funnel · Ziel: … · Stimmung: … · Feed: <Link>"
- `status` = siehe offene Frage A

### 3.2 Doppel-Schutz
Eine erneute Generierung legt heute eine **zweite** Eingangszeile an (am 27.07. live
passiert, Dublette #88 manuell gelöscht). Vor dem Insert auf vorhandenen Lead prüfen
(`data`-JSON enthält den Token) und stattdessen aktualisieren.

### 3.3 Direktlink zum fertigen Feed
Weder Eingang noch Founder-Mail enthalten die Adresse `/r/<token>`. Ohne sie muss man
die URL von Hand zusammenbauen, um zu sehen, was die Kundin bekommen hat. In beide rein.

### 3.4 Alarm auch bei Teilausfall
Heute alarmiert nur der **Total**ausfall (`no_key` / `claude_error` beim Profil-Call).
Reginas Fall — Profil gut, 2 von 3 Posts auf Fallback — löste **nichts** aus. Ergänzen:
Alarm, sobald *irgendein* Post backfilled wurde, mit Angabe welcher.
*(Der Copy-Retry vom 27.07. macht das seltener, aber nicht unmöglich.)*

### 3.5 Founder-Mail aufwerten
Nacktes `<h2>`+`<ul>` → dasselbe dunkle Karten-Layout wie die Kundinnen-Mails
(`pages/confirm-email.js` liefert Kopf + Fuß fertig). Plus: Empfänger von `info@` auf
Sebi + Phil persönlich, sonst geht sie im Sammelpostfach unter — bei Regina vermutlich
genau so passiert.

### 3.6 Closing-KI anstoßen
Sobald die Karte steht, kann `ai_assessment` laufen. Zwei Wege:
- **automatisch** direkt nach Kartenanlage (Founder-Mail enthält die Einschätzung schon)
- **auf Knopfdruck** im CRM, wie heute bei allen anderen Karten

⚠️ Der Auslöser sitzt im **Portal**, nicht im Funnel-Worker. Der Funnel kann die Karte
anlegen; das Anstoßen der KI braucht entweder eine Portal-Änderung (Sebi rollt aus)
oder einen zweiten Aufruf aus dem Funnel heraus mit eigenem API-Key.

---

## 4 · Offene Entscheidungen

**A · Welchen Status bekommt eine Free-Lead-Karte?**
Die Pipeline kennt `briefing · arbeit · review · closing · booked` — nichts davor.
Sebis Vorgabe war „als offen". Drei Möglichkeiten:
1. **Neue erste Stufe `lead`** ergänzen (eine Zeile im Portal, Sebi rollt aus). Sauberste
   Trennung: Free-Leads mischen sich nicht unter zahlende Kundinnen. **Empfehlung.**
2. `briefing` mit Marker in den Notizen — kein Portal-Eingriff, aber Vermischung.
3. Eigene Liste „Leads" im CRM — größter Eingriff, größte Klarheit.

**B · Karte für jede, oder erst bei Signal?**
Für jede fertige Vorschau (nichts geht unter, CRM füllt sich) — oder erst, wenn ein CTA
geklickt wurde (sauber, aber: **Regina hätte keine bekommen**, obwohl sie fünfmal
zurückkam). Empfehlung: für jede, solange das Volumen klein ist; Schwelle einziehen,
wenn es kippt.

**C · Läuft die Closing-KI automatisch?**
Automatisch = die Einschätzung liegt fertig da, wenn Phil die Mail öffnet. Kostet einen
Claude-Aufruf pro Lead, auch bei denen, die nie antworten.

**D · Wer meldet sich, wann, womit?**
Das ist der eigentliche Workflow, und er ist noch gar nicht definiert. Regina lag von
07:20 bis abends unangetastet auf „new". Offen: Reaktionszeit-Ziel, wer zuständig ist,
und ob es eine Textvorlage gibt („du hast dir deine Vorschau angeschaut …").

---

## 5 · Risiko, das vor dem Bau geklärt gehört

Eine Free-Content-Anmeldung ist eine Anfrage nach einer **Gratis-Vorschau** — noch kein
Kundenverhältnis. Wenn daraus automatisch eine Kundenkarte wird **und** eine KI eine
Verkaufs-Einschätzung über die Person erstellt, ist das eine Verarbeitung zu einem
weiteren Zweck (Vertrieb/Profiling).

Vor dem Bau prüfen: Deckt der Einwilligungstext im Formular und die Datenschutzerklärung
**Kontaktaufnahme und Bewertung** ab — oder nur „wir erstellen dir Content"? Das ist kein
Grund, es nicht zu bauen; es ist ein Grund, vorher zwei Sätze im Formular anzupassen.
Nachträglich ist das teurer.

---

## 6 · Reihenfolge, wenn gebaut wird

1. Entscheidungen A–C klären (5 Minuten Gespräch Sebi/Phil)
2. Einwilligungstext prüfen (Risiko oben)
3. 3.1 + 3.2 + 3.3 im Funnel-Worker — das macht Leads auffindbar, das ist der Hebel
4. 3.4 + 3.5 — Wahrnehmbarkeit, damit nichts mehr still danebengeht
5. 3.6 + Entscheidung D — der eigentliche Closing-Workflow

Verwandt: `docs/domain-umzug-cloudflare.md` · Funnel-Spec in `~/social2scale-clients/docs/free-content-funnel-spec.md`
