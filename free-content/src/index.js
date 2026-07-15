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
import { upsertLead, confirmLead, cleanupExpired } from './leads.js';
import { sendConfirmMail, sendResultMail, notifyFounders } from './mail.js';

const FORMULAR_URL = 'https://social2scale.com/free-content/';
const ANFRAGE_URL = 'https://social2scale.com/anfrage/';

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

function htmlPage(title, body) {
  return new Response(
    '<!doctype html><html lang="de"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<title>${title}</title></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/**
 * Sackgassen sind verboten (Spec §9): sie hat gerade ihre Mail bestaetigt, jeder
 * Fehlerfall muss ihr sagen was sie JETZT tun kann — nicht was schiefging.
 * Die Texte nennen die Handlung, nicht die Ursache (Spec §6, Zielgruppen-Haertung).
 */
const CONFIRM_FEHLER = {
  used: {
    title: 'Diesen Link hast du schon benutzt',
    body:
      '<p>Kein Problem — trag dich einfach nochmal ein, dann schicken wir dir einen frischen Link.</p>' +
      `<p><a href="${FORMULAR_URL}">Nochmal eintragen</a></p>`,
  },
  expired: {
    title: 'Dieser Link ist nicht mehr gültig',
    body:
      '<p>Links gelten 24 Stunden. Trag dich nochmal ein, dann bekommst du sofort einen neuen.</p>' +
      `<p><a href="${FORMULAR_URL}">Neuen Link holen</a></p>`,
  },
  not_found: {
    title: 'Diesen Link kennen wir nicht mehr',
    body:
      '<p>Vielleicht ein Tippfehler beim Kopieren? Trag dich einfach nochmal ein.</p>' +
      `<p><a href="${FORMULAR_URL}">Nochmal eintragen</a></p>`,
  },
  // Zwei noch unbestaetigte Leads duerfen denselben Handle haben (kein Griefing) —
  // bestaetigt aber nur einer. Der Zweite darf KEINEN 500 sehen.
  handle_taken: {
    title: 'Diesen Account hat schon jemand angemeldet',
    body:
      '<p>Für <strong>diesen Instagram-Account</strong> läuft bereits ein Free Content. ' +
      'Wenn das dein Account ist, melde dich kurz bei uns — wir klären das in zwei Minuten.</p>' +
      `<p><a href="${ANFRAGE_URL}">Kurz melden</a></p>`,
  },
};

async function handleConfirm(token, env) {
  let res;
  try {
    res = await confirmLead(env.DB, token);
  } catch (err) {
    console.error('[confirm] Bestaetigung fehlgeschlagen:', err);
    return htmlPage(CONFIRM_FEHLER.not_found.title, CONFIRM_FEHLER.not_found.body);
  }

  if (!res.ok) {
    const fehler = CONFIRM_FEHLER[res.reason] ?? CONFIRM_FEHLER.not_found;
    return htmlPage(fehler.title, fehler.body);
  }

  // Plan 2 haengt hier die Generierung ein: ctx.waitUntil(generate(env, res.lead)).
  return new Response(null, { status: 302, headers: { Location: `/r/${token}` } });
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

    // Token ist server-generierter Hex — alles andere ist gar kein Token von uns.
    // Das Muster haelt zugleich Fremdes aus dem HTML der Fehlerseiten.
    const confirmMatch = url.pathname.match(/^\/c\/([a-f0-9]{8,128})$/);
    if (confirmMatch) return handleConfirm(confirmMatch[1], env);
    if (url.pathname.startsWith('/c/')) {
      return htmlPage(CONFIRM_FEHLER.not_found.title, CONFIRM_FEHLER.not_found.body);
    }

    // Platzhalter — Plan 2 ersetzt das durch Build- und Ergebnisseite.
    if (/^\/r\/[a-f0-9]{8,128}$/.test(url.pathname)) {
      return htmlPage('Dein Free Content', '<p>Wird gebaut (Plan 2).</p>');
    }

    return json({ ok: false, error: 'not_found' }, 404, cors);
  },
};
