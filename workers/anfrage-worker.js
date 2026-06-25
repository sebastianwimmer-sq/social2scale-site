/**
 * social2scale — Erstgespräch-Anfrage Worker
 * Nimmt die POST der /anfrage/-Form entgegen, legt einen Brevo-Kontakt an
 * und benachrichtigt die Founder per Transaktions-Mail.
 *
 * Deploy: siehe workers/DEPLOY.md
 * Secret:  wrangler secret put BREVO_API_KEY
 * Vars:    BREVO_LIST_ID, NOTIFY_TO, NOTIFY_FROM, ALLOW_ORIGIN  (in wrangler.toml)
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function corsHeaders(allow) {
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), { status, headers: { ...JSON_HEADERS, ...(extra || {}) } });
}

function esc(s) {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

export default {
  async fetch(request, env) {
    const allow = env.ALLOW_ORIGIN || 'https://social2scale.com';
    const cd = corsHeaders(allow);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cd });
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cd);

    let data;
    try { data = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400, cd); }

    // Honeypot: Bots füllen das versteckte Feld → still als Erfolg verwerfen
    if (data.website) return json({ ok: true }, 200, cd);

    const clip = (v, n) => (v == null ? '' : String(v)).trim().slice(0, n);
    const name = clip(data.name, 120);
    const email = clip(data.email, 160);
    const phone = clip(data.phone, 60);
    const business = clip(data.business, 200);
    const status = clip(data.status, 80);
    const goal = clip(data.goal, 2000);
    const budget = clip(data.budget, 80);

    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!name || !emailOk || !phone) return json({ ok: false, error: 'missing_fields' }, 422, cd);

    const key = env.BREVO_API_KEY;
    if (!key) return json({ ok: false, error: 'not_configured' }, 503, cd);

    const brevoHeaders = { 'api-key': key, 'Content-Type': 'application/json', 'accept': 'application/json' };

    // 1) Brevo-Kontakt anlegen / aktualisieren
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: brevoHeaders,
        body: JSON.stringify({
          email,
          attributes: { VORNAME: name, SMS: phone, BUSINESS: business, STATUS: status, ZIEL: goal, BUDGET: budget, QUELLE: 'anfrage' },
          listIds: env.BREVO_LIST_ID ? [Number(env.BREVO_LIST_ID)] : undefined,
          updateEnabled: true,
        }),
      });
    } catch (_) { /* nicht fatal — Founder-Mail folgt trotzdem */ }

    // 2) Founder-Benachrichtigung (Brevo Transactional)
    try {
      const to = env.NOTIFY_TO || 'info@social2scale.com';
      const from = env.NOTIFY_FROM || 'info@social2scale.com';
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: brevoHeaders,
        body: JSON.stringify({
          sender: { email: from, name: 'social2scale Anfrage' },
          to: [{ email: to }],
          replyTo: { email, name },
          subject: `Neue Erstgespräch-Anfrage: ${name}`,
          htmlContent:
            `<h2>Neue Erstgespräch-Anfrage</h2><ul>` +
            `<li><b>Name:</b> ${esc(name)}</li>` +
            `<li><b>E-Mail:</b> ${esc(email)}</li>` +
            `<li><b>Telefon:</b> ${esc(phone)}</li>` +
            `<li><b>Business / Rolle:</b> ${esc(business)}</li>` +
            `<li><b>Status:</b> ${esc(status)}</li>` +
            `<li><b>Budget:</b> ${esc(budget)}</li>` +
            `<li><b>Ziel / Bottleneck:</b> ${esc(goal)}</li></ul>`,
        }),
      });
    } catch (_) { /* nicht fatal */ }

    return json({ ok: true }, 200, cd);
  },
};
