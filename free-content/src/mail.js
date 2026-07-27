/**
 * Brevo-Versand. Muster aus workers/anfrage-worker.js.
 * Die Bestaetigungsmail ist der Single Point of Failure des Funnels (Spec §11):
 * kommt sie nicht an, stirbt er lautlos.
 */

import { stripControlChars } from './validate.js';
import { confirmMailHtml, resultMailHtml, founderMailHtml } from './pages/confirm-email.js';

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
  const vorname = esc(firstName(lead.name, 'schön'));
  return {
    subject: 'Dein Feed ist fertig — sieh ihn dir an',
    htmlContent: resultMailHtml(vorname, esc(link)),
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
        // Komma-Liste erlaubt: die Founder-Benachrichtigung soll an Sebi UND Phil
        // persoenlich gehen. Ging sie nur ans Sammelpostfach (von dem aus sie auch
        // verschickt wird), uebersieht man sie — bei der ersten echten Interessentin
        // am 27.07. genau so passiert.
        to: String(to).split(',').map((e) => e.trim()).filter(Boolean).map((email) => ({ email, name })),
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
    await send(env, env.NOTIFY_TO, 'social2scale', buildFounderMail(lead, action, env.PUBLIC_ORIGIN));
  } catch (err) {
    console.error('[mail] Founder-Benachrichtigung fehlgeschlagen:', err);
  }
}

/**
 * Interne Benachrichtigung. Der Link zum fertigen Feed ist der Kern: ohne ihn muesste
 * man die Adresse von Hand zusammenbauen, um zu sehen, was die Kundin bekommen hat —
 * und genau das tut dann niemand.
 */
function buildFounderMail(lead, action, publicOrigin = '') {
  const feedUrl = publicOrigin && lead?.token ? `${publicOrigin}/r/${encodeURIComponent(lead.token)}` : '';
  const handle = String(lead?.handle || '').replace(/^@+/, '');
  const zeilen = [
    ['Name', esc(lead.name)],
    ['Mail', esc(lead.email)],
    ['Handle', handle ? `@${esc(handle)}` : ''],
    ['Thema', esc(lead.branche)],
    ['Ziel', esc(lead.ziel)],
    ['Stimmung', esc(lead.stimmung)],
    ['Quelle', esc(lead.source)],
    ['Status', esc(action)],
  ];
  return {
    subject: subjectSafe(`Free-Content-Lead: ${lead.name} (${action})`),
    htmlContent: founderMailHtml(`Free-Content-Lead: ${esc(lead.name)}`, zeilen, esc(feedUrl)),
  };
}
