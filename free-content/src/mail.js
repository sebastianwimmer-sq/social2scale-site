/**
 * Brevo-Versand. Muster aus workers/anfrage-worker.js.
 * Die Bestaetigungsmail ist der Single Point of Failure des Funnels (Spec §11):
 * kommt sie nicht an, stirbt er lautlos.
 */

import { stripControlChars } from './validate.js';
import { confirmMailHtml } from './pages/confirm-email.js';

const BREVO_MAIL_URL = 'https://api.brevo.com/v3/smtp/email';

/** Schuetzt den HTML-Body. Fuer Betreffzeilen ungeeignet — siehe subjectSafe(). */
function esc(value) {
  return String(value ?? '').replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])
  );
}

/**
 * Schuetzt die Betreffzeile. Bewusst NICHT esc():
 * Ein Betreff ist Klartext, kein HTML — esc() wuerde 'Mueller & Co' zu
 * 'Mueller &amp; Co' entstellen und trotzdem kein CR/LF entfernen.
 * Die echte Gefahr am Header-Sink ist Header-Injection, also Steuerzeichen.
 * validate.js saeubert bereits an der Grenze; das hier ist die zweite Schicht,
 * damit das naechste neue Feld nicht davon abhaengt, dass jemand daran denkt.
 */
function subjectSafe(value) {
  return stripControlChars(value);
}

function firstName(name, fallback = 'du') {
  return String(name ?? '').trim().split(/\s+/)[0] || fallback;
}

/**
 * Reine Funktion — deshalb ohne Netzwerk testbar.
 * Markup kommt aus pages/confirm-email.js (Quelle: design/prototypes/confirm-email.html).
 */
export function buildConfirmMail(lead, publicOrigin) {
  const link = `${publicOrigin}/c/${encodeURIComponent(lead.token)}`;
  const vorname = esc(firstName(lead.name, 'schön'));

  return {
    subject: 'Nur noch ein Klick bis zu deinem ersten s2s Free Content',
    htmlContent: confirmMailHtml(vorname, esc(link)),
  };
}

export function buildResultMail(lead, publicOrigin) {
  const link = `${publicOrigin}/r/${encodeURIComponent(lead.token)}`;
  return {
    subject: 'Dein s2s Free Content liegt bereit',
    htmlContent: `
      <p>Hey ${esc(firstName(lead.name))},</p>
      <p>hier geht's zu deinem Content:</p>
      <p><a href="${esc(link)}">Meinen Free Content oeffnen</a></p>
      <p>— social2scale</p>
    `.trim(),
  };
}

async function send(env, to, name, mail) {
  if (!env.BREVO_API_KEY) {
    console.error('[mail] BREVO_API_KEY fehlt — Mail nicht versendet');
    return false;
  }
  try {
    const res = await fetch(BREVO_MAIL_URL, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.NOTIFY_FROM, name: 'social2scale' },
        to: [{ email: to, name }],
        subject: mail.subject,
        htmlContent: mail.htmlContent,
      }),
    });
    if (!res.ok) {
      console.error('[mail] Brevo antwortete mit', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[mail] Versand fehlgeschlagen:', err);
    return false;
  }
}

/**
 * Die Bauschritte liegen mit im try: sie greifen auf lead-Felder zu und laufen
 * unter ctx.waitUntil fire-and-forget. Ein malformter Lead wuerde sonst werfen,
 * BEVOR die Fehlerbehandlung in send() greift — und die Rejection verschwaende
 * ungeloggt. Genau das stille Scheitern, gegen das dieses Modul existiert.
 */
export async function sendConfirmMail(env, lead) {
  try {
    return await send(env, lead.email, lead.name, buildConfirmMail(lead, env.PUBLIC_ORIGIN));
  } catch (err) {
    console.error('[mail] Bestaetigungsmail konnte nicht gebaut werden:', err);
    return false;
  }
}

export async function sendResultMail(env, lead) {
  try {
    return await send(env, lead.email, lead.name, buildResultMail(lead, env.PUBLIC_ORIGIN));
  } catch (err) {
    console.error('[mail] Ergebnismail konnte nicht gebaut werden:', err);
    return false;
  }
}

/** Founder-Benachrichtigung — non-fatal, aber niemals still. */
export async function notifyFounders(env, lead, action) {
  try {
    await send(env, env.NOTIFY_TO, 'social2scale', buildFounderMail(lead, action));
  } catch (err) {
    console.error('[mail] Founder-Benachrichtigung fehlgeschlagen:', err);
  }
}

function buildFounderMail(lead, action) {
  return {
    subject: subjectSafe(`Free-Content-Lead: ${lead.name} (${action})`),
    htmlContent: `
      <h2>Neuer Free-Content-Lead</h2>
      <ul>
        <li><b>Name:</b> ${esc(lead.name)}</li>
        <li><b>E-Mail:</b> ${esc(lead.email)}</li>
        <li><b>Handle:</b> @${esc(lead.handle)}</li>
        <li><b>Branche:</b> ${esc(lead.branche)}</li>
        <li><b>Ziel:</b> ${esc(lead.ziel)}</li>
        <li><b>Stimmung:</b> ${esc(lead.stimmung)}</li>
        <li><b>Quelle:</b> ${esc(lead.source)}</li>
        <li><b>Aktion:</b> ${esc(action)}</li>
      </ul>
    `.trim(),
  };
}
