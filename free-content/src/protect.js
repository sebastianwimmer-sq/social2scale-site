/**
 * Bot-Schichten 1-4 (Spec §7). Portiert aus workers/anfrage-worker.js —
 * dort erprobt, hier nicht neu erfunden.
 * Entscheidet nur ja/nein und kennt keine Leads.
 */

import { MIN_ELAPSED_MS } from './constants.js';

/** Schicht 1: Turnstile serverseitig verifizieren. */
export async function verifyTurnstile(token, ip, secret) {
  if (!token || !secret) return false;
  try {
    const body = new URLSearchParams();
    body.append('secret', secret);
    body.append('response', String(token));
    if (ip && ip !== 'anon') body.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('[protect] Turnstile-Verifikation fehlgeschlagen:', err);
    return false; // fail-closed: im Zweifel kein Durchlass
  }
}

/** Schicht 2: Bots fuellen das versteckte Feld aus. */
export function isHoneypotTripped(body) {
  return !!String(body?.website ?? '').trim();
}

/** Schicht 3: Menschen brauchen laenger als MIN_ELAPSED_MS. */
export function isTooFast(body) {
  const elapsed = body?.elapsed;
  if (elapsed == null) return false; // fail-open: keine Messung -> nicht blocken
  return Number(elapsed) < MIN_ELAPSED_MS;
}

/** Schicht 4: hat die Domain ueberhaupt einen Mailserver? */
export async function hasMailServer(email) {
  try {
    const domain = String(email).split('@')[1];
    if (!domain) return false;

    const lookup = async (type) => {
      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
        { headers: { accept: 'application/dns-json' } }
      );
      const data = await res.json();
      return Array.isArray(data.Answer) && data.Answer.length > 0;
    };

    if (await lookup('MX')) return true;
    if (await lookup('A')) return true;
    return false;
  } catch (err) {
    console.error('[protect] DNS-Lookup fehlgeschlagen:', err);
    return true; // fail-open: Lookup-Panne darf keine echten Leads killen
  }
}
