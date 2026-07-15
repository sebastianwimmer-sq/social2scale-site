/**
 * Bot-Schichten 1-4 (Spec §7). Portiert aus workers/anfrage-worker.js —
 * dort erprobt, hier nicht neu erfunden.
 * Entscheidet nur ja/nein und kennt keine Leads.
 *
 * ABWEICHUNG vom Original (bewusst, nicht vergessen):
 * verifyTurnstile prueft hier zusaetzlich res.ok. Das Original tut das nicht —
 * dort haette eine HTTP-Fehlerantwort mit `{success:true}` im Body ein `true`
 * zurueckgegeben. Fail-closed hielt dort nur zufaellig, weil echte
 * Cloudflare-Fehlerseiten HTML sind und .json() darum in den catch laeuft.
 * Mit dem Check ist fail-closed Absicht statt Zufall.
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
    if (!res.ok) {
      console.error('[protect] Turnstile antwortete mit HTTP', res.status);
      return false; // fail-closed: kaputte Antwort ist kein Freifahrtschein
    }
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('[protect] Turnstile-Verifikation fehlgeschlagen:', err);
    return false; // fail-closed: im Zweifel kein Durchlass
  }
}

/**
 * Schicht 2: Bots fuellen das versteckte Feld aus.
 * Kein .trim() — wie im Original (anfrage-worker.js:75 `if (data.website)`):
 * das Feld ist versteckt, kein Mensch fuellt es je aus. Jeder nicht-leere
 * Wert (auch reine Leerzeichen) ist ein Bot.
 */
export function isHoneypotTripped(body) {
  return !!body?.website;
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
