# HANDOFF an extern (Website-Strang): Datenschutz-Ergänzung Foto-Upload

Datum: 2026-08-04 · Von: Funnel-Strang (`feat/free-content-funnel`)

Der Free-Content-Funnel hat seit heute einen **optionalen Foto-Upload** im
Wizard („Zeig dich"): die Interessentin kann ihr Profilbild oder ein
Lieblingsfoto hochladen. Es wird clientseitig auf ~512px verkleinert, als
`free/<token>/avatar.bin` in R2 abgelegt und ausschließlich in ihre eigene,
tokengeschützte Vorschau eingebettet (Profil-Frame + Share-Card). Gleicher
Lebenszyklus wie die Vorschau-Bilder — Aufräumen löscht beides zusammen.

**Bewusst KEIN automatischer Abruf von Instagram:** unavatar verlangt dafür
einen Pro-Plan, Instagram blockt Cloudflare-Worker-IPs (Login-Redirect, am
04.08. live vom Edge verifiziert). Der Upload ist zugleich die DSGVO-sauberste
Variante: sie lädt selbst hoch, kein Scraping, kein Drittanbieter.

## Bitte in die Datenschutzerklärung (social2scale.com/datenschutz/) aufnehmen

Vorschlag (Abschnitt Gratis-Vorschau):

> Wenn du beim Erstellen deiner Gratis-Vorschau freiwillig ein Foto hochlädst,
> verwenden wir es ausschließlich, um es in deine eigene, nur über deinen
> persönlichen Link erreichbare Vorschau einzubetten. Das Foto wird zusammen
> mit deiner Vorschau gespeichert und mit ihr gelöscht; eine Weitergabe an
> Dritte findet nicht statt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
> (Erstellung der von dir angeforderten Vorschau).

## 🔴 Sebi liest den Satz fachlich gegen, BEVOR extern ihn einbaut.

## Payload-Vertrag (Info für alle Stränge, keine Aktion nötig)

Zwei Feld-Änderungen am Vertrag `form.js → validate.js`:

- `farbe`: wird jetzt vom Formular befüllt (`''` oder `#rrggbb`, Chips aus
  `FARB_CHIPS` in `constants.js` oder eigener Picker). Feldname unverändert —
  validate/leads/derivePalettes konnten das Feld schon immer.
- `foto` (NEU, optional): `''` oder `data:image/(jpeg|png|webp);base64,…`,
  Cap `FOTO_MAX_CHARS`. Server-Gates in `avatar.js` (`parseFotoDataUrl`).

Der Kunden-Strang kann `~/social2scale-clients/docs/WER-MACHT-WAS.md` bei
Gelegenheit um beide Felder ergänzen (sein Ordner, deshalb hier nur notiert).

## NACHTRAG 07.08. — Security-Review (2 HIGH, 1 MEDIUM; 2 davon gefixt)

- ✅ **GEFIXT: R2-Löschung existierte nicht.** Der ursprüngliche Satz oben („Aufräumen
  löscht beides zusammen") war eine Absichtserklärung, kein Code — `cleanupExpired`
  löschte nur D1-Zeilen. Jetzt löscht es die R2-Ablage (Foto + Frames) unbestätigter
  Leads nach 30 Tagen MIT (leads.js, getestet). Der Datenschutz-Satz stimmt damit für
  Unbestätigte. ⚠️ Für BESTÄTIGTE Leads gibt es (wie schon vor dem Foto-Feature)
  keine automatische Löschfrist — Vorschau + Foto bleiben, bis der Lead manuell
  entfernt wird. Wenn der Datenschutz-Satz live geht, entweder so formulieren
  („solange deine Vorschau verfügbar ist") oder eine Retention-Frist bauen.
- ✅ **GEFIXT: Body-Größen-Gate** — Riesen-Requests werden jetzt vor dem Parsen
  abgewiesen (413, `BODY_MAX_BYTES`).
- 🔴 **OFFENE PRODUKTENTSCHEIDUNG: Foto ohne Bildmoderation.** Das Foto wird beim
  Absenden gespeichert — VOR der Mail-Bestätigung. Wer eine fremde Mailadresse
  einträgt, kann der echten Besitzerin ein beliebiges Bild in „ihre" Vorschau legen
  (Text-Felder gehen durch moderate.js, Bilder durch nichts). Dämpfer heute:
  Vorschau nur hinter ihrem persönlichen Token, Founder-Mail bei jedem fertigen
  Feed (menschlicher Blick), unbestätigte Fotos werden nach 30 Tagen gelöscht.
  Optionen: (a) Risiko akzeptieren + Founder-Sichtung, (b) Bildmoderation via
  Claude-Vision-Call vor dem Render (~1 Call/Lead), (c) Foto erst im Reveal
  nachreichen lassen (nach Bestätigung). Sebi entscheidet.
- ✅ **GEBAUT (07.08., Sebis Vorschlag): Eskalations-Knopf.** Im Reveal-Footer
  steht jetzt leise „Stimmt hier etwas nicht? Missbrauch melden" — ein Klick
  sperrt den Feed sofort (`reported_at` + status=failed), löscht die R2-Bilder
  und schickt euch einen 🚨-Founder-Alarm. Idempotent, ohne Enumeration (jede
  Antwort 200). Da der Token nur an die Mail-Inhaberin geht, ist die Meldende
  immer die Betroffene. Migration `migrate-freeleads-reported.sql` ist auf
  s2s-crm gelaufen. Das entschärft die offene Produktentscheidung deutlich —
  (a) + Eskalations-Knopf ist jetzt eine vertretbare Grundabsicherung.
