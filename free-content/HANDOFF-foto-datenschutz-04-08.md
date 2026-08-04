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
