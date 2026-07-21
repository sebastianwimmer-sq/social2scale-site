/**
 * Produktions-Template fuer die Bestaetigungsmail (Double-Opt-In).
 * Quelle: design/prototypes/confirm-email.html — dort liegt der volle,
 * per Litmus/Outlook getestete Prototyp inkl. Kommentaren; diese Datei
 * haelt exakt dasselbe Markup als Template-Funktion fuer mail.js.
 *
 * Bilder sind GEHOSTET (social2scale.com/assets/sig-*.png), kein base64 —
 * Gmail zeigt Inline-base64-Bilder nicht an. `color-scheme`-Meta + bgcolor-
 * Fallbacks halten Outlook/Dark-Mode-Invert im Zaum.
 */

import { TOKEN_TTL_HOURS } from '../constants.js';

/**
 * @param {string} vorname - bereits escaped (esc()), Platzhalter fuer {{VORNAME}}.
 * @param {string} confirmUrl - bereits escaped (esc()), Platzhalter fuer {{CONFIRM_URL}}.
 * @returns {string} vollstaendiges HTML-Dokument fuer den Mailversand.
 */
export function confirmMailHtml(vorname, confirmUrl) {
  return `<!DOCTYPE html>
<html lang="de" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <meta name="x-apple-disable-message-reformatting">
  <title>Bestätige deine Vorschau — social2scale</title>
  <!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
  <style>
    :root { color-scheme: dark light; supported-color-schemes: dark light; }
    a { text-decoration: none; }
    @media (max-width:600px){ .card{ padding:32px 22px !important; } .h1{ font-size:27px !important; } }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#04070B;">
  <!-- versteckter Preheader (Inbox-Vorschau) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">Ein Klick, ${vorname} — dann entsteht deine Vorschau, live.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#04070B" style="background-color:#04070B;">
    <tr><td align="center" style="padding:32px 14px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

        <!-- Logo (gehostet) -->
        <tr><td style="padding:0 4px 26px;">
          <img src="https://social2scale.com/assets/sig-wordmark.png" alt="social2scale" width="150" height="22" style="display:block;height:22px;width:150px;border:0;">
        </td></tr>

        <!-- Botschaft -->
        <tr><td class="card" bgcolor="#0A0D12" style="background-color:#0A0D12;background-image:radial-gradient(120% 140% at 0% 0%,rgba(0,184,136,0.16),transparent 44%),linear-gradient(150deg,#0C1C15,#0A0E14 55%,#06090D);border:1px solid rgba(255,255,255,0.08);border-left:4px solid #00B888;border-radius:20px;padding:40px 34px;">
          <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:31px;line-height:1.12;color:#F4F5F3;">Fast geschafft, ${vorname}.</h1>
          <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:#B9BDBB;">Ein Klick bestätigt deine Adresse — <strong style="color:#F4F5F3;">dann entsteht deine persönliche Instagram-Vorschau, live.</strong></p>

          <!-- Bulletproof-CTA (VML-Fallback für Outlook) -->
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${confirmUrl}" style="height:52px;v-text-anchor:middle;width:230px;" arcsize="50%" fillcolor="#00B888" stroke="f">
            <center style="color:#04201A;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Meinen Feed bauen →</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="#00B888" style="border-radius:100px;background-color:#00B888;background-image:linear-gradient(135deg,#1FC998,#00B888 52%,#1FA6E0);">
              <a href="${confirmUrl}" style="display:inline-block;padding:16px 34px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#04201A;text-decoration:none;border-radius:100px;">Meinen Feed bauen&nbsp;&nbsp;&rarr;</a>
            </td>
          </tr></table>
          <!--<![endif]-->

          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:#6E7573;">Gültig ${TOKEN_TTL_HOURS} Stunden. Nicht du? Ignorier diese Mail einfach.</p>
        </td></tr>

        <!-- Team-Signatur-Abbinder -->
        <tr><td style="padding:22px 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0D12" style="background-color:#0A0D12;background-image:radial-gradient(120% 140% at 0% 0%,rgba(0,184,136,0.16),transparent 44%),linear-gradient(150deg,#0C1C15,#0A0E14 55%,#06090D);border-left:4px solid #00B888;border-radius:14px;">
            <tr><td style="padding:20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="vertical-align:top;width:54px;padding-right:16px;"><img src="https://social2scale.com/assets/sig-avatar.png" width="54" height="54" alt="social2scale" style="display:block;width:54px;height:54px;border:0;"></td>
                <td style="vertical-align:top;">
                  <img src="https://social2scale.com/assets/sig-wordmark.png" width="134" height="20" alt="social2scale" style="display:block;width:134px;height:20px;margin:2px 0 9px;border:0;">
                  <div style="font-family:-apple-system,Arial,sans-serif;font-size:15px;font-weight:700;color:#F2F3F1;margin-bottom:11px;">Das social2scale-Team</div>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;">
                    <tr><td style="padding:0 9px 4px 0;font-size:8px;font-weight:700;color:#00C896;text-transform:uppercase;letter-spacing:1.4px;">Web</td><td style="padding:0 0 4px;font-size:13px;"><a href="https://social2scale.com" style="color:#F2F3F1;text-decoration:none;">social2scale.com</a></td></tr>
                    <tr><td style="padding:0 9px 0 0;font-size:8px;font-weight:700;color:#00C896;text-transform:uppercase;letter-spacing:1.4px;">Mail</td><td style="padding:0;font-size:13px;"><a href="mailto:info@social2scale.com" style="color:#F2F3F1;text-decoration:none;">info@social2scale.com</a></td></tr>
                  </table>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Rechtlicher Footer -->
        <tr><td style="padding:20px 6px 0;">
          <p style="margin:0;font-size:11.5px;line-height:1.7;color:#565D5B;">
            Diese Mail ging an dich, weil deine Adresse unter start.social2scale.com für die Content-Vorschau eingetragen wurde. Erst mit Bestätigung werden Daten verarbeitet.<br>
            social2scale &mdash; Philipp Libowicz · Johannes-Hess-Straße 1, 84489 Burghausen &middot; <a href="https://social2scale.com/impressum/" style="color:#6E7573;">Impressum</a> &middot; <a href="https://social2scale.com/datenschutz/" style="color:#6E7573;">Datenschutz</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
