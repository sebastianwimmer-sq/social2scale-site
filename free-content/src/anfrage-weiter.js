/**
 * Weg B des einen Funnels (15.10.2026): „Jemanden, der es für mich macht“.
 *
 * Erst sollte der Funnel an `POST /api/anfrage` im Portal weiterreichen. Live
 * antwortete das Portal dem Worker aber mit 522, über closing.social2scale.com
 * UND über s2s-closing.pages.dev: ein Worker erreicht das Pages-Projekt desselben
 * Kontos nicht über eine öffentliche Adresse, eine Service-Bindung zu Pages gibt
 * es nicht. Deshalb legt der Funnel die Anfrage selbst an, im SELBEN Format wie
 * das Portal (`submissions` type 'anfrage', Markdown-Payload, Herkunft „Link:
 * vorschau-b“, gleiche Zählung in `formular_versuche`) und schickt dieselbe
 * Founder-Mail. Ändert sich das Format im Portal (_worker.js anfrageVerarbeiten),
 * muss es hier mitgehen — der Test hält die Felder fest.
 */

import { verifyTurnstile, isHoneypotTripped, registerAttempt, hasMailServer } from './protect.js';
import { send } from './mail.js';
import { stripControlChars } from './validate.js';
import { anfrageMailHtml } from './pages/confirm-email.js';

export const ANFRAGE_MAX_BYTES = 16 * 1024;
const VON = 'vorschau-b';

// Feld → Höchstlänge, wie im Portal geclippt. Was nicht hier steht, wird nicht gespeichert.
const FELDER = { name: 120, email: 160, phone: 60, business: 200, status: 80, goal: 600, budget: 80 };

// Steuerzeichen raus: der Name landet im Betreff der Founder-Mail (Header-Sink).
const clip = (v, n) => (typeof v === 'string' ? stripControlChars(v).trim().slice(0, n) : '');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Funnel-Eingabe → die Felder einer Erstgespräch-Anfrage. */
export function anfrageAusFunnel(body) {
  const d = {};
  for (const [k, n] of Object.entries(FELDER)) d[k] = clip(body?.[k], n);
  // Start-Zeitpunkt hat im CRM kein eigenes Feld — er gehört zum Ziel.
  const start = clip(body?.start, 60);
  if (start) d.goal = (d.goal ? d.goal + ' · ' : '') + 'Start: ' + start;
  return d;
}

export function pflichtFehler(d) {
  if (!d.name) return 'name';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(d.email)) return 'email';
  if (d.phone.replace(/[^0-9]/g, '').length < 6) return 'phone';
  return '';
}

/** Markdown wie im Portal — die CRM-Oberfläche zeigt `payload` so an. */
export function anfrageMarkdown(d) {
  return '# Erstgespräch-Anfrage\n\n' +
    '- **Name:** ' + d.name + '\n' +
    '- **E-Mail:** ' + d.email + '\n' +
    '- **Telefon:** ' + d.phone + '\n' +
    (d.business ? '- **Business / Rolle:** ' + d.business + '\n' : '') +
    (d.status ? '- **Status:** ' + d.status + '\n' : '') +
    (d.budget ? '- **Budget:** ' + d.budget + '\n' : '') +
    (d.goal ? '\n**Ziel / Bottleneck:**\n' + d.goal + '\n' : '') +
    '\n- **Gefunden über:** Link: ' + VON + '\n';
}

export function founderMail(d) {
  const zeilen = [['Name', d.name], ['E-Mail', d.email], ['Telefon', d.phone], ['Business / Rolle', d.business],
    ['Status', d.status], ['Budget', d.budget], ['Ziel / Bottleneck', d.goal], ['Gefunden über', 'Gratis-Vorschau, Weg B (Betreuung)']];
  return {
    subject: 'Neue Erstgespräch-Anfrage: ' + d.name,
    htmlContent: '<h2>Neue Erstgespräch-Anfrage</h2><ul>' +
      zeilen.filter(([, v]) => v).map(([k, v]) => '<li><b>' + k + ':</b> ' + esc(v) + '</li>').join('') + '</ul>',
  };
}

async function kundinZuEmail(db, email) {
  try {
    const r = await db.prepare('SELECT id FROM clients WHERE lower(trim(email)) = ?').bind(email.toLowerCase()).all();
    const ids = (r.results || []).map((x) => x.id);
    return ids.length === 1 ? ids[0] : null;
  } catch (err) {
    console.error('[anfrage] Kundinnen-Abgleich fehlgeschlagen:', err);
    return null;
  }
}

async function zaehle(db, ergebnis) {
  try {
    await db.prepare(
      "INSERT INTO formular_versuche (tag, formular, ergebnis, n) VALUES (date('now'), 'anfrage', ?, 1) " +
      'ON CONFLICT(tag, formular, ergebnis) DO UPDATE SET n = n + 1'
    ).bind(ergebnis).run();
  } catch (err) {
    console.error('[anfrage] Zählen fehlgeschlagen:', err);
  }
}

function antwort(body, status, cors) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}

const BREVO_KONTAKT = 'https://api.brevo.com/v3/contacts';
const VORSCHAU_URL = 'https://start.social2scale.com/?weg=a';

/** Brevo-Kontakt wie im Portal (ohne Liste: Newsletter braucht eine eigene Einwilligung). Nicht fatal. */
export async function brevoKontakt(env, d, holen = fetch) {
  if (!env.BREVO_API_KEY) return false;
  try {
    const res = await holen(BREVO_KONTAKT, {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: d.email, attributes: { VORNAME: d.name, BUSINESS: d.business, STATUS: d.status, ZIEL: d.goal, BUDGET: d.budget, QUELLE: VON }, updateEnabled: true }),
    });
    if (!res.ok && res.status !== 204) console.error('[anfrage] Brevo-Kontakt:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('[anfrage] Brevo-Kontakt fehlgeschlagen:', err);
    return false;
  }
}

/** Bestaetigung an die Anfragende — sie soll wissen, dass es geklappt hat. Nicht fatal. */
export async function bestaetigen(env, d, mailSenden = send) {
  const vorname = esc(d.name.split(/\s+/)[0] || 'du');
  try {
    return await mailSenden(env, d.email, d.name, { subject: 'Deine Anfrage ist angekommen', htmlContent: anfrageMailHtml(vorname, esc(VORSCHAU_URL)) }, 'social2scale');
  } catch (err) {
    console.error('[anfrage] Bestaetigungsmail fehlgeschlagen:', err);
    return false;
  }
}

/** Legt die Anfrage an. true, wenn sie mindestens an EINEM Ort sicher ist (CRM oder Mail). */
export async function anfrageAnlegen(env, d, mailSenden = send) {
  const clientId = await kundinZuEmail(env.DB, d.email);
  let gespeichert = false;
  try {
    await env.DB.prepare(
      `INSERT INTO submissions (type, client_id, name, email, payload, data, logo_key, rating, status)
       VALUES ('anfrage', ?, ?, ?, ?, ?, '', NULL, 'new')`
    ).bind(clientId, d.name, d.email, anfrageMarkdown(d), JSON.stringify({ herkunft: { gefunden: '', von: VON, host: '' } })).run();
    gespeichert = true;
  } catch (err) {
    console.error('[anfrage] CRM-Eingang fehlgeschlagen:', err);
  }
  let gemailt = false;
  try {
    gemailt = await mailSenden(env, env.NOTIFY_TO || env.NOTIFY_FROM, 'social2scale', founderMail(d), 'social2scale Anfrage');
  } catch (err) {
    console.error('[anfrage] Founder-Mail fehlgeschlagen:', err);
  }
  return gespeichert || gemailt;
}

/**
 * @param {Request} request
 * @param {{TURNSTILE_SECRET?:string, DB:any, NOTIFY_TO?:string, NOTIFY_FROM?:string, BREVO_API_KEY?:string}} env
 * @param {Record<string,string>} cors
 * @param {{mail?:Function, mx?:Function}} [teile] nur für Tests austauschbar
 */
export async function handleAnfrage(request, env, cors, teile = {}) {
  if (request.method !== 'POST') return antwort({ ok: false, error: 'method' }, 405, cors);
  if (Number(request.headers.get('content-length') || 0) > ANFRAGE_MAX_BYTES) {
    return antwort({ ok: false, error: 'gross' }, 413, cors);
  }
  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[anfrage] Body ist kein JSON:', err);
    return antwort({ ok: false, error: 'bad_json' }, 400, cors);
  }
  if (isHoneypotTripped(body)) {
    console.error('[anfrage] Abgewiesen: Honeypot ausgeloest');
    await zaehle(env.DB, 'spam_falle');
    return antwort({ ok: true }, 200, cors);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  if (!env.TURNSTILE_SECRET || !(await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET))) {
    console.error('[anfrage] Abgewiesen: Turnstile ungueltig/fehlt');
    await zaehle(env.DB, 'captcha');
    return antwort({ ok: false, error: 'captcha' }, 403, cors);
  }

  const d = anfrageAusFunnel(body);
  const fehler = pflichtFehler(d);
  if (fehler) {
    await zaehle(env.DB, 'pflichtfeld');
    return antwort({ ok: false, error: fehler }, 422, cors);
  }

  const rl = await registerAttempt(env.DB, ip);
  if (!rl.ok) {
    await zaehle(env.DB, 'rate');
    return antwort({ ok: false, error: 'rate_limited' }, 429, cors);
  }
  if (!(await (teile.mx || hasMailServer)(d.email))) {
    await zaehle(env.DB, 'mail_domain');
    return antwort({ ok: false, error: 'email_domain' }, 422, cors);
  }

  if (!(await anfrageAnlegen(env, d, teile.mail))) {
    return antwort({ ok: false, error: 'speichern' }, 500, cors);
  }
  await Promise.all([bestaetigen(env, d, teile.mail), brevoKontakt(env, d, teile.holen)]);
  await zaehle(env.DB, 'angekommen');
  return antwort({ ok: true }, 200, cors);
}

/** Selbsttest ohne Spuren: sind CRM-Tabellen und Mail-Zugang da? */
export async function anfrageProbe(env) {
  if (!env.BREVO_API_KEY) return 'mail';
  try {
    await env.DB.prepare('SELECT 1 FROM submissions LIMIT 1').first();
    await env.DB.prepare('SELECT 1 FROM formular_versuche LIMIT 1').first();
    return 'ok';
  } catch (err) {
    console.error('[anfrage] Probe: CRM-Tabellen nicht lesbar:', err);
    return 'crm';
  }
}
