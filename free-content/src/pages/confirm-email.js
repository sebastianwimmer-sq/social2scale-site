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
 * title/preheader variieren pro Mail. Die Karte wird in sigFooter() geschlossen.
 */
function mailHead(title, preheader, lang = 'de') {
  return `<!DOCTYPE html>
<html lang="${lang}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
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
const VORSCHAU_GRUND = 'Diese Mail ging an dich, weil deine Adresse bei social2scale für die Content-Vorschau eingetragen wurde. Erst mit Bestätigung werden Daten verarbeitet.';
const VORSCHAU_GRUND_EN = 'You’re receiving this email because your address was entered at social2scale for the content preview. Your data is only processed once you confirm.';
// Rechtsfuss je Sprache: Impressum und Datenschutz gibt es nur auf Deutsch, die Beschriftung folgt der Mail.
const RECHT = { de: ['Impressum', 'Datenschutz'], en: ['Legal notice', 'Privacy (German)'] };
const sigFooter = (name = 'Das social2scale-Team', grund = VORSCHAU_GRUND, lang = 'de') => `
          <div style="height:1px;line-height:1px;font-size:1px;background:rgba(255,255,255,0.09);margin:30px 0 22px;">&nbsp;</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:top;width:52px;padding-right:15px;"><img src="https://social2scale.com/assets/sig-avatar.png" width="52" height="52" alt="social2scale" style="display:block;width:52px;height:52px;border:0;"></td>
            <td style="vertical-align:top;">
              <img src="https://social2scale.com/assets/sig-wordmark.png" width="128" height="19" alt="social2scale" style="display:block;width:128px;height:19px;margin:1px 0 8px;border:0;">
              <div style="font-family:-apple-system,Arial,sans-serif;font-size:14px;font-weight:700;color:${PAPER};margin-bottom:9px;">${name}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;">
                <tr><td style="padding:0 9px 4px 0;font-size:8px;font-weight:700;color:#00C896;text-transform:uppercase;letter-spacing:1.4px;">Web</td><td style="padding:0 0 4px;font-size:13px;"><a href="https://social2scale.com" style="color:${PAPER};text-decoration:none;">social2scale.com</a></td></tr>
                <tr><td style="padding:0 9px 0 0;font-size:8px;font-weight:700;color:#00C896;text-transform:uppercase;letter-spacing:1.4px;">Mail</td><td style="padding:0;font-size:13px;"><a href="mailto:info@social2scale.com" style="color:${PAPER};text-decoration:none;">info@social2scale.com</a></td></tr>
              </table>
            </td>
          </tr></table>

          <p style="margin:24px 0 0;font-size:11.5px;line-height:1.7;color:${FAINT};">
            ${grund}<br>
            social2scale &mdash; Philipp Libowicz · Johannes-Hess-Straße 1, 84489 Burghausen &middot; <a href="https://social2scale.com/impressum/" style="color:${FAINT};">${RECHT[lang][0]}</a> &middot; <a href="https://social2scale.com/datenschutz/" style="color:${FAINT};">${RECHT[lang][1]}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/** Schliesst Karte + Dokument ohne den kundenseitigen Rechtsfuss (fuer interne Mails). */
const MAIL_CLOSE = `
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * INTERNE Benachrichtigung an Sebi & Phil. Gleicher dunkler Karten-Look wie die
 * Kundinnen-Mails (damit sie nicht wie ein Systemfehler aussieht), aber ohne
 * Impressum/Abmelde-Fuss — die gehoeren in Mails an Aussenstehende, nicht in eine
 * interne Notiz.
 *
 * @param {string} titel - bereits escaped.
 * @param {Array<[string,string]>} zeilen - [Label, Wert], Werte bereits escaped.
 * @param {string} feedUrl - bereits escaped; leer = kein Knopf.
 * @returns {string} vollstaendiges HTML-Dokument fuer den Mailversand.
 */
export function founderMailHtml(titel, zeilen, feedUrl) {
  const liste = zeilen
    .map(
      ([label, wert]) =>
        `<tr>
           <td style="padding:0 14px 7px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#00C896;text-transform:uppercase;letter-spacing:1.3px;white-space:nowrap;vertical-align:top;">${label}</td>
           <td style="padding:0 0 7px;font-family:-apple-system,Arial,sans-serif;font-size:14px;line-height:1.5;color:${PAPER};">${wert || '—'}</td>
         </tr>`
    )
    .join('');

  return (
    mailHead(titel, titel) +
    `
          <h1 class="h1" style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.15;color:${PAPER};">${titel}</h1>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${liste}</table>` +
    (feedUrl
      ? `<div style="height:1px;line-height:1px;font-size:1px;background:rgba(255,255,255,0.09);margin:26px 0 22px;">&nbsp;</div>` +
        mailCta(feedUrl, 'Ihren Feed ansehen')
      : '') +
    MAIL_CLOSE
  );
}

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
          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:${FAINT};">Gültig ${TOKEN_TTL_HOURS} Stunden. Nicht du? Ignorier diese Mail einfach.</p>` + sigFooter();
}

/** Englische Bestaetigung (Funnel /en/). Gleicher Aufbau wie confirmMailHtml. */
export function confirmMailHtmlEn(vorname, confirmUrl) {
  return mailHead('Confirm your preview — social2scale', `One click, ${vorname} — then your preview gets built, live.`, 'en') + `
          <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:31px;line-height:1.12;color:${PAPER};">Almost there, ${vorname}.</h1>
          <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:${MUTED};">One click confirms your address — <strong style="color:${PAPER};">then your personal Instagram preview gets built, live.</strong></p>
          ${mailCta(confirmUrl, 'Build my feed')}
          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:${FAINT};">Valid for ${TOKEN_TTL_HOURS} hours. Not you? Just ignore this email.</p>` + sigFooter('The social2scale team', VORSCHAU_GRUND_EN, 'en');
}

/** Englische Ergebnismail (Funnel /en/). Gleicher Aufbau wie resultMailHtml. */
export function resultMailHtmlEn(vorname, resultUrl) {
  return mailHead('Good to have you back — social2scale', `Good to have you back, ${vorname}. Your preview is ready.`, 'en') + `
          <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:31px;line-height:1.12;color:${PAPER};">Good to have you back, ${vorname}.</h1>
          <p style="margin:0 0 30px;font-size:16px;line-height:1.6;color:${MUTED};">Your preview is ready — take your time looking through it. And if you want to get started or have questions: <strong style="color:${PAPER};">we’re happy to help.</strong></p>
          ${mailCta(resultUrl, 'View my preview')}
          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:${FAINT};">Just reply to this email — we read every reply and help you personally.</p>` + sigFooter('The social2scale team', VORSCHAU_GRUND_EN, 'en');
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
          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:${FAINT};">Antworte einfach auf diese Mail — wir lesen mit und helfen dir persönlich.</p>` + sigFooter();
}

/**
 * Bestaetigung fuer Weg B (Erstgespraech, 16.10.2026): vorher sah die Anfragende nur den
 * Danke-Schirm — wer ihn schloss, wusste nicht mehr, ob es geklappt hat. Kommt von Phil (Ich-Form,
 * seine Nummer, Antworten an ihn): Sebi 16.10. „die an den kunden direkt mit phil“.
 * @param {string} vorname - bereits escaped (esc()).
 * @param {string} vorschauUrl - bereits escaped (esc()).
 */
export function anfrageMailHtml(vorname, vorschauUrl, buchungUrl, tel, telHref) {
  return mailHead('Deine Anfrage ist bei mir angekommen', `Danke, ${vorname}. Ich melde mich persönlich bei dir.`) + `
          <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:31px;line-height:1.12;color:${PAPER};">Danke, ${vorname}. Ich kümmere mich.</h1>
          <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:${MUTED};">Deine Anfrage ist bei mir angekommen. Ich melde mich persönlich bei dir, telefonisch oder per Mail. Wenn du nicht warten willst, such dir direkt einen Termin aus:</p>
          ${mailCta(buchungUrl, 'Termin direkt buchen')}
          <p style="margin:24px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">Oder ruf mich an: <a href="tel:${telHref}" style="color:${PAPER};font-weight:700;text-decoration:none;">${tel}</a>. Antworten auf diese Mail landen direkt bei mir.</p>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${FAINT};">Bis dahin kannst du dir in 60 Sekunden ansehen, wie dein Auftritt aussehen kann: <a href="${vorschauUrl}" style="color:${MUTED};">Gratis-Vorschau</a></p>` +
    sigFooter('Phil · social2scale', 'Du bekommst diese Mail, weil du auf social2scale.com ein Erstgespräch angefragt hast.');
}

/** Englische Fassung (Funnel /en/, Sebi 23.10.2026: „immer beides 1/1“) — gleicher Aufbau wie
 * anfrageMailHtml, mit dem Weg zur englischen Gratis-Vorschau. */
export function anfrageMailHtmlEn(vorname, vorschauUrl, buchungUrl, tel, telHref) {
  return mailHead('Your inquiry has reached me', `Thanks, ${vorname}. I’ll get back to you personally.`, 'en') + `
          <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:31px;line-height:1.12;color:${PAPER};">Thanks, ${vorname}. I’m on it.</h1>
          <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:${MUTED};">Your inquiry has reached me. I’ll get back to you personally, by phone or email. If you don’t want to wait, just pick a time for our intro call:</p>
          ${mailCta(buchungUrl, 'Book a time')}
          <p style="margin:24px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">Or call me: <a href="tel:${telHref}" style="color:${PAPER};font-weight:700;text-decoration:none;">${tel}</a>. Replies to this email come straight to me.</p>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${FAINT};">Until then, see what your presence could look like in 60 seconds: <a href="${vorschauUrl}" style="color:${MUTED};">free preview</a></p>` +
    sigFooter('Phil · social2scale', 'You’re receiving this email because you requested an intro call on social2scale.com.', 'en');
}

/**
 * Reel-Bescheid an eine Kundin (reel-bescheid.js) in derselben dunklen Karte — vorher schlichtes HTML ohne Hintergrund,
 * das Apple Mail im Dunkelmodus umfärbte (Knopf blass-mint, Sebi 15.10.: „sieht iwie buggy aus“). Absender social2scale (Systemmail).
 * @param {string} titel - Überschrift, bereits escaped.
 * @param {string} innen - fertiges, escaptes HTML (Liste der Reels + Satz).
 * @param {string} url - bereits escaped.
 */
export function reelMailHtml(titel, innen, url) {
  return mailHead(`${titel} — social2scale`, titel) + `
          <h1 class="h1" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:29px;line-height:1.15;color:${PAPER};">${titel}</h1>
          <div style="margin:0 0 28px;font-size:16px;line-height:1.6;color:${MUTED};">${innen}</div>
          ${mailCta(url, 'In deinen Social Hub')}` +
    sigFooter(undefined, 'Du bekommst diese Mail, weil in deinem Social Hub ein Reel fertig geworden ist. Willst du keine mehr, antworte kurz auf diese Mail.');
}

export const MAIL_FARBEN = { PAPER, MUTED };
