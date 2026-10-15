/**
 * Weg B des einen Funnels (15.10.2026): „Jemanden, der es für mich macht“.
 *
 * Die Erstgespräch-Anfrage hat genau EINEN Besitzer: `POST /api/anfrage` im
 * Portal (closing.social2scale.com) schreibt CRM, Brevo und die Mail an Sebi und
 * Phil. Der Funnel baut das nicht nach, er reicht weiter (der ärmere Weg delegiert
 * an den reicheren). Weil die Turnstile-Prüfung des Funnels an SEINEN Schlüssel
 * gebunden ist, prüft dieser Worker sie selbst und weist sich beim Portal mit
 * FUNNEL_KEY aus; das Portal überspringt dann nur Turnstile, alles andere
 * (Pflichtfelder, Mail-Domain, Rate-Limit pro IP) prüft es weiter selbst.
 */

import { verifyTurnstile, isHoneypotTripped, registerAttempt } from './protect.js';

export const ANFRAGE_MAX_BYTES = 16 * 1024;
const PORTAL_ANFRAGE = 'https://closing.social2scale.com/api/anfrage';

// Feld → Höchstlänge. Was nicht hier steht, geht nicht ans Portal.
const FELDER = { name: 120, email: 160, phone: 60, business: 200, status: 80, goal: 600, budget: 80 };

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Baut aus der Funnel-Eingabe genau das, was /api/anfrage versteht. */
export function anfrageAusFunnel(body) {
  const d = {};
  for (const [k, n] of Object.entries(FELDER)) d[k] = clip(body?.[k], n);
  // Start-Zeitpunkt hat im Portal kein eigenes Feld — er gehört zum Ziel.
  const start = clip(body?.start, 60);
  if (start) d.goal = (d.goal ? d.goal + ' · ' : '') + 'Start: ' + start;
  d.von = 'vorschau-b';
  return d;
}

export function pflichtFehler(d) {
  if (!d.name) return 'name';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(d.email)) return 'email';
  if (d.phone.replace(/[^0-9]/g, '').length < 6) return 'phone';
  return '';
}

function antwort(body, status, cors) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}

/**
 * @param {Request} request
 * @param {{TURNSTILE_SECRET?:string, FUNNEL_KEY?:string, DB:any, ANFRAGE_URL?:string}} env
 * @param {Record<string,string>} cors
 * @param {typeof fetch} [holen] nur für Tests austauschbar
 */
/**
 * Selbsttest der Strecke Funnel → Portal ohne Spuren: das Portal erkennt `probe`
 * nur mit gültigem Schlüssel und antwortet, ohne CRM, Brevo oder Mail zu berühren.
 * @returns {Promise<'ok'|'aus'|'schluessel'|'netz'|'portal'>}
 */
export async function anfrageProbe(env, holen = fetch) {
  if (!env.FUNNEL_KEY) return 'aus';
  try {
    const res = await holen(env.ANFRAGE_URL || PORTAL_ANFRAGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Funnel-Key': env.FUNNEL_KEY },
      body: JSON.stringify({ probe: true }),
    });
    if (res.status === 403) return 'schluessel';
    const j = await res.json().catch(() => ({}));
    return res.ok && j.probe === true ? 'ok' : 'portal';
  } catch (err) {
    console.error('[anfrage] Probe: Portal nicht erreichbar:', err);
    return 'netz';
  }
}

export async function handleAnfrage(request, env, cors, holen = fetch) {
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
    return antwort({ ok: true }, 200, cors);
  }
  if (!env.FUNNEL_KEY) {
    // Ohne Schlüssel nimmt das Portal nichts an — lieber laut scheitern als still verlieren.
    console.error('[anfrage] FUNNEL_KEY fehlt — Weg B kann nicht weiterreichen');
    return antwort({ ok: false, error: 'aus' }, 503, cors);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  if (!env.TURNSTILE_SECRET || !(await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET))) {
    console.error('[anfrage] Abgewiesen: Turnstile ungueltig/fehlt');
    return antwort({ ok: false, error: 'captcha' }, 403, cors);
  }

  const daten = anfrageAusFunnel(body);
  const fehler = pflichtFehler(daten);
  if (fehler) return antwort({ ok: false, error: fehler }, 422, cors);

  const rl = await registerAttempt(env.DB, ip);
  if (!rl.ok) return antwort({ ok: false, error: 'rate_limited' }, 429, cors);

  let res;
  try {
    res = await holen(env.ANFRAGE_URL || PORTAL_ANFRAGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Funnel-Key': env.FUNNEL_KEY, 'X-Funnel-IP': ip },
      body: JSON.stringify(daten),
    });
  } catch (err) {
    console.error('[anfrage] Portal nicht erreichbar:', err);
    return antwort({ ok: false, error: 'netz' }, 502, cors);
  }
  let j = {};
  try { j = await res.json(); } catch (err) { console.error('[anfrage] Portal-Antwort nicht lesbar:', err); }
  if (res.ok && j && j.success === true) return antwort({ ok: true }, 200, cors);

  const code = j && j.error === 'email_domain' ? 'email_domain'
    : res.status === 429 ? 'rate_limited'
    : j && j.error === 'missing_fields' ? 'phone'
    : 'portal';
  console.error('[anfrage] Portal lehnte ab:', res.status, j && j.error);
  return antwort({ ok: false, error: code }, res.status === 429 ? 429 : 422, cors);
}
