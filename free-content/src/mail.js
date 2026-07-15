/**
 * Brevo-Versand. Muster aus workers/anfrage-worker.js.
 * Die Bestaetigungsmail ist der Single Point of Failure des Funnels (Spec §11):
 * kommt sie nicht an, stirbt er lautlos.
 */

const BREVO_MAIL_URL = 'https://api.brevo.com/v3/smtp/email';

function esc(value) {
  return String(value ?? '').replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])
  );
}

function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] || 'du';
}

/** Reine Funktion — deshalb ohne Netzwerk testbar. */
export function buildConfirmMail(lead, publicOrigin) {
  const link = `${publicOrigin}/c/${encodeURIComponent(lead.token)}`;
  const vorname = esc(firstName(lead.name));

  return {
    subject: 'Nur noch ein Klick bis zu deinem ersten s2s Free Content',
    htmlContent: `
      <p>Hey ${vorname},</p>
      <p>dein Content wartet — <strong>ein Klick</strong> und wir bauen ihn live fuer dich:</p>
      <p><a href="${esc(link)}">Jetzt meinen Free Content ansehen</a></p>
      <p>Der Link gilt 24 Stunden. Falls du das nicht warst, ignorier diese Mail einfach.</p>
      <p>— social2scale</p>
    `.trim(),
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

export async function sendConfirmMail(env, lead) {
  return send(env, lead.email, lead.name, buildConfirmMail(lead, env.PUBLIC_ORIGIN));
}

export async function sendResultMail(env, lead) {
  return send(env, lead.email, lead.name, buildResultMail(lead, env.PUBLIC_ORIGIN));
}

/** Founder-Benachrichtigung — non-fatal, aber niemals still. */
export async function notifyFounders(env, lead, action) {
  const mail = {
    subject: `Free-Content-Lead: ${lead.name} (${action})`,
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
  await send(env, env.NOTIFY_TO, 'social2scale', mail);
}
