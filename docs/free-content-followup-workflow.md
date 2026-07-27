# Follow-up: Was passiert, nachdem jemand seine Gratis-Vorschau gesehen hat?

**Stand 27.07.2026 — Plan, nicht gebaut.** Anlass: Regina lief am 27.07. komplett
durch den Funnel und lag danach den ganzen Tag unangetastet auf `status='new'`.
Technik: [[project_s2s_free_content_backlog]] · Spec: `free-content-lead-workflow-spec.md`

---

## 1 · Was heute passiert

```
Formular → Bestätigungsmail → Feed fertig
        ├─ Eingang + Kundenkarte (automatisch, seit 27.07.)   ✅
        ├─ Mail an Sebi + Phil mit Feed-Link                  ✅
        └─ ENDE
```

Ab hier passiert nichts mehr, bis ein Mensch von sich aus hinschaut. Genau das ist
die Lücke.

## 2 · Das Problem hinter dem Problem: der Funnel qualifiziert nicht

Er fragt Name, Mail, Handle, Thema, Ziel, Stimmung. Das reicht, um **Content zu
bauen** — aber es sagt Phil nichts darüber, ob sich ein Gespräch lohnt. Es fehlt
alles, was Passung anzeigt: wo sie heute steht, wie dringend es ist, ob überhaupt
Budget im Spiel ist.

Dazu kommt: **die Fragen werden nicht sauber verstanden.** Regina hat bei „Thema"
und „Ziel" wörtlich denselben Satz eingetragen. Für sie war das eine Frage, nicht
zwei. Damit ist auch die Qualität dessen, was wir *haben*, schlechter als gedacht.

**Der stärkste Qualifikator ist heute schon da, wird aber nicht genutzt: Verhalten.**
- Hat sie die Mail bestätigt? → sie hat Aufwand investiert
- Hat sie einen CTA geklickt? → wird bereits gemessen (`cta_call`, `cta_save`, `cta_share`)
- Wie schnell kam sie zurück?

Ein Klick auf „Lass uns starten" sagt mehr als jedes Formularfeld.

## 3 · Vorschlag: drei Bahnen statt einer Warteschlange

| Signal | Bahn | Wer | Wann |
|---|---|---|---|
| **CTA „Lass uns starten" geklickt** | 🔥 heiß | Phil, persönlich | **innerhalb von 24 h** |
| Feed fertig, kein CTA | 🟡 warm | automatische Mail nach ~2 Tagen, danach Phil nach Gefühl | Tag 2 |
| Mail nie bestätigt | ⚪️ offen | eine automatische Erinnerung nach 24 h, dann Ruhe | Tag 1 |

**Grundsatz:** Automatik übernimmt das Nachfassen bei allem, was noch kein Signal
gezeigt hat. Der Mensch geht nur an die, die eins gezeigt haben. So skaliert es —
und Phil verbringt seine Zeit nicht mit Nachlaufen.

## 4 · Was dafür gebaut werden müsste

### 4.1 Erinnerung bei unbestätigter Mail (automatisch)
Nach 24 h ohne `confirmed_at`: eine kurze Mail („dein Link wartet noch"). Genau
**eine**, danach nie wieder. Technisch: Cron-Trigger im Worker, Feld `reminder_sent_at`.
🔑 Regina hat 15 Stunden bis zur Bestätigung gebraucht — die Erinnerung darf nicht
zu früh kommen, sonst nervt sie die Geduldigen.

### 4.2 Nachfassmail nach dem Reveal (automatisch)
Tag 2 nach `ready`, wenn **kein** CTA geklickt wurde: eine kurze, ehrliche Mail.
Kein Verkaufsdruck, eine Frage. Vorschlag:

> Betreff: Passt deine Vorschau, {Vorname}?
>
> deine Vorschau liegt noch für dich bereit: {Link}
>
> Eine ehrliche Frage: Hat sie getroffen, was du machst — oder daneben?
> Antworte einfach auf diese Mail, ein Satz reicht. Wir lesen mit.
>
> Falls du wissen willst, wie dein echter Auftritt aussehen würde: {Erstgespräch-Link}

Die Rückfrage ist wichtiger als der CTA. Eine Antwort öffnet ein Gespräch, ein
Klick nicht.

### 4.3 Triage-Regel für Phil (kein Code, eine Absprache)
Wenn die Founder-Mail eintrifft, in dieser Reihenfolge lesen:
1. Steht im Betreff ein **CTA-Signal**? → heute noch persönlich melden
2. Passt das Thema zur Nische (Coaches, Experten, B2B)? → auf die Liste
3. Sonst: liegen lassen, die Automatik fasst nach

### 4.4 Was die KI dazu beitragen kann
Die Closing-Einschätzung (`ai_assessment`) hängt an der Kundenkarte und kann ab
sofort laufen — sie liefert Kurz-Einschätzung, Closing-Strategie, mögliche Einwände
und Upsell-Ansatz. Offene Frage: automatisch bei Kartenanlage (liegt fertig da, wenn
Phil die Mail öffnet) oder auf Knopfdruck (spart Aufrufe bei denen, die nie antworten).
Empfehlung: **auf Knopfdruck**, solange das Volumen klein ist.

## 5 · Qualifizierung verbessern (kleiner Eingriff, große Wirkung)

**a) Thema und Ziel entwirren.** Zwei Fragen, die dasselbe zu sein scheinen, liefern
zweimal dieselbe Antwort. Vorschlag: die zweite Frage konkret machen —
„Was soll dein Account für dich tun?" mit Auswahl (Anfragen bekommen · Bekanntheit ·
Community · Verkäufe) statt eines zweiten Freitextfelds.

**b) Eine einzige Passungs-Frage ergänzen.** Am wirksamsten:
„Wo stehst du heute?" → *kein Account · Account, aber selten aktiv · poste regelmäßig,
aber es passiert nichts*. Drei Klicks, kein Tippen, und Phil weiß sofort, mit wem er
spricht. Als Nebeneffekt bekommt auch die KI besseren Input.

**c) Nicht mehr fragen als das.** Jedes zusätzliche Feld kostet Abschlüsse. Der
Funnel lebt davon, dass er in unter einer Minute durchläuft.

## 6 · Reihenfolge, wenn gebaut wird

1. Triage-Regel absprechen (§4.3) — kostet nichts, wirkt sofort
2. Formular-Fragen schärfen (§5a + 5b) — kleiner Eingriff, verbessert alles dahinter
3. Nachfassmail nach dem Reveal (§4.2) — der größte automatische Hebel
4. Erinnerung bei unbestätigter Mail (§4.1)
5. KI-Einschätzung automatisieren (§4.4) — erst wenn Volumen da ist

## 7 · Was zuerst geklärt gehört

**Reaktionszeit.** Die Tabelle in §3 nennt 24 h für heiße Leads. Das ist ein
Vorschlag, keine Messung — Sebi und Phil müssen sagen, was realistisch ist. Eine
Zusage, die nicht gehalten wird, ist schlechter als keine.

**Wer antwortet auf Antworten?** Die Nachfassmail lädt zum Antworten ein. Läuft das
auf `info@` und liest es niemand, ist der Schaden größer als der Nutzen.
