/**
 * s2s Free-Content-Funnel — Router.
 * Kennt keine Interna: delegiert an validate/protect/leads/mail.
 */

import { validateSubmission } from './validate.js';
import {
  verifyTurnstile,
  isHoneypotTripped,
  isTooFast,
  hasMailServer,
  registerAttempt,
} from './protect.js';
import { upsertLead, cleanupExpired } from './leads.js';
import { sendConfirmMail, sendResultMail, notifyFounders } from './mail.js';

/**
 * EINE Antwort fuer JEDEN Lead-Ausgang — created, resent, renewed, retry, ready,
 * building, throttled, handle_taken. Wer hier unterscheidet, verraet welche Adressen
 * registriert sind (Enumeration).
 * Der Spam-Hinweis steht drin, weil die Mail der Punkt ist, an dem der Funnel
 * lautlos stirbt: kommt sie nicht an, ist die Besucherin weg und niemand erfaehrt es.
 */
const NEUTRAL = {
  ok: true,
  message: 'Schau in dein Postfach — und wirf auch einen Blick in den Spam-Ordner.',
};

function corsHeaders(allow) {
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'anon';
}

async function handleSubmit(request, env, ctx, cors) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[submit] Body ist kein JSON:', err);
    return json({ ok: false, error: 'bad_json' }, 400, cors);
  }

  // Billige Schichten zuerst — ein Bot soll keine DB- oder DNS-Arbeit ausloesen.
  // Honeypot und Zu-schnell antworten bewusst wie ein Erfolg: der Bot soll nicht
  // lernen, woran er gescheitert ist.
  if (isHoneypotTripped(body)) return json(NEUTRAL, 200, cors);
  if (isTooFast(body)) return json(NEUTRAL, 200, cors);

  const ip = clientIp(request);

  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET);
    if (!ok) return json({ ok: false, error: 'captcha' }, 403, cors);
  }

  const checked = validateSubmission(body);
  if (!checked.ok) return json({ ok: false, error: checked.error }, 422, cors);

  // registerAttempt schreibt ZUERST und urteilt dann — nur so haelt der Deckel gegen
  // einen parallelen Burst. Es zaehlt auch abgelehnte Versuche mit; das ist gewollt,
  // ein Angriff soll in der Tabelle sichtbar sein.
  let limited;
  try {
    limited = await registerAttempt(env.DB, ip);
  } catch (err) {
    // Fail-closed: ohne Zaehlung gibt es keinen Deckel.
    console.error('[submit] Rate-Limit-Zaehlung fehlgeschlagen:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }
  if (!limited.ok) return json({ ok: false, error: 'rate_limited' }, 429, cors);

  if (!(await hasMailServer(checked.value.emailNorm))) {
    return json({ ok: false, error: 'email_domain' }, 422, cors);
  }

  let lead;
  let action;
  let mail;
  try {
    ({ lead, action, mail } = await upsertLead(env.DB, checked.value, ip));
  } catch (err) {
    console.error('[submit] Lead konnte nicht gespeichert werden:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }

  // Mailversand und Aufraeumen duerfen die Antwort nicht aufhalten.
  if (mail === 'confirm') {
    ctx.waitUntil(
      sendConfirmMail(env, lead).then((sent) => {
        if (!sent) console.error('[submit] Bestaetigungsmail nicht zugestellt, Lead', lead.id);
      })
    );
  } else if (mail === 'result') {
    ctx.waitUntil(sendResultMail(env, lead));
  }
  if (action === 'created') ctx.waitUntil(notifyFounders(env, lead, action));

  ctx.waitUntil(
    cleanupExpired(env.DB).catch((err) =>
      console.error('[submit] TTL-Aufraeumen fehlgeschlagen:', err)
    )
  );

  return json(NEUTRAL, 200, cors);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(env.ALLOW_ORIGIN || 'https://social2scale.com');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/api/health') return json({ ok: true }, 200, cors);

    if (url.pathname === '/api/free-content') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
      return handleSubmit(request, env, ctx, cors);
    }

    return json({ ok: false, error: 'not_found' }, 404, cors);
  },
};
