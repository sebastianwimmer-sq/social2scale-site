/**
 * Produktions-Templates fuer die Funnel-Mails (Double-Opt-In + Ergebnis).
 * Quelle: design/prototypes/confirm-email.html.
 *
 * DARK-MODE-HAERTUNG (Gmail iOS/Android, 23.07.2026):
 * Die Gmail-App ignoriert `<style>`/`color-scheme` oft und faerbt den SEITEN-
 * Hintergrund (body/table) auf ihre helle Leseflaeche um — behaelt aber
 * `<td bgcolor>`-INHALTSkarten dunkel (belegt: in Sebis Screenshot blieben die
 * Karten dunkel, nur der Rand + das Logo wurden weiss). Konsequenz: die GESAMTE
 * Mail ist EINE dunkle Inhaltskarte (`td.shell`, explizites bgcolor). So sitzt
 * nichts (Logo, Footer, Text) mehr auf dem angreifbaren Seiten-Hintergrund —
 * der einzige Bereich, den Gmail hell faerben kann, ist der aeussere Rand um die
 * Karte, und der ist bewusst leer. Zusaetzlich: `color-scheme: dark` (nur dark),
 * `[data-ogsb]/[data-ogsc]`-Lock fuer Outlook-Darkmode.
 *
 * Bilder GEHOSTET (social2scale.com/assets/sig-*.png), kein base64 — Gmail zeigt
 * Inline-base64 nicht an.
 */

import { TOKEN_TTL_HOURS } from '../constants.js';

const SHELL_BG = '#080C11';
const PAPER = '#F4F5F3';
const MUTED = '#B9BDBB';
const FAINT = '#6E7573';

/**
 * Kopf + Oeffnung der EINEN dunklen Inhaltskarte inkl. gehostetem Logo.
 * title/preheader variieren pro Mail. Die Karte wird in MAIL_SIG_FOOTER geschlossen.
 */
function mailHead(title, preheader) {
  return `<!DOCTYPE html>
<html lang="de" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    a { text-decoration: none; }
    /* Outlook.com-Darkmode: Karte hart dunkel halten. */
    [data-ogsb], [data-ogsc] { background-color: ${SHELL_BG} !important; }
    u + .body [data-ogsc] { background-color: ${SHELL_BG} !important; }
    @media (max-width:600px){ .shell{ padding:30px 22px !important; } .h1{ font-size:27px !important; } }
  </style>
</head>
<body class="body" style="margin:0;padding:0;background-color:#04070B;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#04070B" style="background-color:#04070B;">
    <tr><td align="center" bgcolor="#04070B" style="padding:26px 12px;background-color:#04070B;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <tr><td class="shell" bgcolor="${SHELL_BG}" style="background-color:${SHELL_BG};background-image:radial-gradient(120% 90% at 0% 0%,rgba(0,184,136,0.14),transparent 42%),linear-gradient(160deg,#0C1A15,${SHELL_BG} 55%,#06090D);border:1px solid rgba(255,255,255,0.09);border-radius:22px;padding:38px 34px;">
          <img src="https://social2scale.com/assets/sig-wordmark.png" alt="social2scale" width="150" height="22" style="display:block;height:22px;width:150px;border:0;margin:0 0 30px;">`;
}

/** Bulletproof-CTA (VML-Fallback fuer Outlook). label/url variieren. */
function mailCta(url, label) {
  return `
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:236px;" arcsize="50%" fillcolor="#00B888" stroke="f">
            <center style="color:#04201A;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label} &rarr;</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="#00B888" style="border-radius:100px;background-color:#00B888;background-image:linear-gradient(135deg,#1FC998,#00B888 52%,#1FA6E0);">
              <a href="${url}" style="display:inline-block;padding:16px 34px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#04201A;text-decoration:none;border-radius:100px;">${label}&nbsp;&nbsp;&rarr;</a>
            </td>
          </tr></table>
          <!--<![endif]-->`;
}

/**
 * Signatur + rechtlicher Footer INNERHALB der Karte + Karten-/Dokument-Abschluss.
 * Voll statisch → geteilt. Alles sitzt auf der dunklen Karte (kein angreifbarer
 * Seiten-Hintergrund mehr).
 */
const MAIL_SIG_FOOTER = `
          <div style="height:1px;line-height:1px;font-size:1px;background:rgba(255,255,255,0.09);margin:30px 0 22px;">&nbsp;</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:top;width:52px;padding-right:15px;"><img src="https://social2scale.com/assets/sig-avatar.png" width="52" height="52" alt="social2scale" style="display:block;width:52px;height:52px;border:0;"></td>
            <td style="vertical-align:top;">
              <img src="https://social2scale.com/assets/sig-wordmark.png" width="128" height="19" alt="social2scale" style="display:block;width:128px;height:19px;margin:1px 0 8px;border:0;">
              <div style="font-family:-apple-system,Arial,sans-serif;font-size:14px;font-weight:700;color:${PAPER};margin-bottom:9px;">Das social2scale-Team</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;">
                <tr><td style="padding:0 9px 4px 0;font-size:8px;font-weight:700;color:#00C896;text-transform:uppercase;letter-spacing:1.4px;">Web</td><td style="padding:0 0 4px;font-size:13px;"><a href="https://social2scale.com" style="color:${PAPER};text-decoration:none;">social2scale.com</a></td></tr>
                <tr><td style="padding:0 9px 0 0;font-size:8px;font-weight:700;color:#00C896;text-transform:uppercase;letter-spacing:1.4px;">Mail</td><td style="padding:0;font-size:13px;"><a href="mailto:info@social2scale.com" style="color:${PAPER};text-decoration:none;">info@social2scale.com</a></td></tr>
              </table>
            </td>
          </tr></table>

          <p style="margin:24px 0 0;font-size:11.5px;line-height:1.7;color:${FAINT};">
            Diese Mail ging an dich, weil deine Adresse bei social2scale für die Content-Vorschau eingetragen wurde. Erst mit Bestätigung werden Daten verarbeitet.<br>
            social2scale &mdash; Philipp Libowicz · Johannes-Hess-Straße 1, 84489 Burghausen &middot; <a href="https://social2scale.com/impressum/" style="color:${FAINT};">Impressum</a> &middot; <a href="https://social2scale.com/datenschutz/" style="color:${FAINT};">Datenschutz</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * @param {string} vorname - bereits escaped (esc()).
 * @param {string} confirmUrl - bereits escaped (esc()).
 * @returns {string} vollstaendiges HTML-Dokument fuer den Mailversand.
 */
export function confirmMailHtml(vorname, confirmUrl) {
  return mailHead('Bestätige deine Vorschau — social2scale', `Ein Klick, ${vorname} — dann entsteht deine Vorschau, live.`) + `
          <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:31px;line-height:1.12;color:${PAPER};">Fast geschafft, ${vorname}.</h1>
          <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:${MUTED};">Ein Klick bestätigt deine Adresse — <strong style="color:${PAPER};">dann entsteht deine persönliche Instagram-Vorschau, live.</strong></p>
          ${mailCta(confirmUrl, 'Meinen Feed bauen')}
          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:${FAINT};">Gültig ${TOKEN_TTL_HOURS} Stunden. Nicht du? Ignorier diese Mail einfach.</p>` + MAIL_SIG_FOOTER;
}

/**
 * Ergebnismail: wird geschickt, wenn eine Besucherin mit bereits fertiger
 * Vorschau erneut eintraegt (leads.js: mail:'result'). Fuehrt zurueck auf /r/:token.
 * @param {string} vorname - bereits escaped (esc()).
 * @param {string} resultUrl - bereits escaped (esc()).
 * @returns {string} vollstaendiges HTML-Dokument fuer den Mailversand.
 */
export function resultMailHtml(vorname, resultUrl) {
  return mailHead('Schön, dass du wieder da bist — social2scale', `Schön, dass du wieder da bist, ${vorname}. Deine Vorschau liegt bereit.`) + `
          <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:31px;line-height:1.12;color:${PAPER};">Schön, dass du wieder da bist, ${vorname}.</h1>
          <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:${MUTED};">Deine Vorschau liegt bereit — schau sie dir in Ruhe an. Und wenn du loslegen willst oder Fragen hast: <strong style="color:${PAPER};">wir helfen dir gern weiter.</strong></p>
          ${mailCta(resultUrl, 'Meine Vorschau ansehen')}
          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:${FAINT};">Antworte einfach auf diese Mail — wir lesen mit und helfen dir persönlich.</p>` + MAIL_SIG_FOOTER;
}
