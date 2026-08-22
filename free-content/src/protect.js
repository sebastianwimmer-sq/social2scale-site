/**
 * Bot-Schichten 1-4 + 6 (Spec §7). Schichten 1-4 portiert aus
 * workers/anfrage-worker.js — dort erprobt, hier nicht neu erfunden.
 * Entscheidet nur ja/nein und kennt keine Leads.
 *
 * ABWEICHUNG vom Original (bewusst, nicht vergessen):
 * verifyTurnstile prueft hier zusaetzlich res.ok. Das Original tut das nicht —
 * dort haette eine HTTP-Fehlerantwort mit `{success:true}` im Body ein `true`
 * zurueckgegeben. Fail-closed hielt dort nur zufaellig, weil echte
 * Cloudflare-Fehlerseiten HTML sind und .json() darum in den catch laeuft.
 * Mit dem Check ist fail-closed Absicht statt Zufall.
 */

import {
  MIN_ELAPSED_MS,
  RATE_LIMIT_PER_IP_PER_HOUR,
  RATE_LIMIT_GLOBAL_PER_HOUR,
  RATE_LIMIT_LOG_RETENTION_HOURS,
} from './constants.js';

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

const HOUR_MS = 60 * 60 * 1000;

function iso(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Schicht 6: Rate-Limit pro IP + globaler Deckel (Muster: intake_log).
 *
 * EIN Aufruf pro Anfrage: protokolliert den Versuch UND faellt das Urteil.
 * Bewusst NICHT in "erst pruefen" + "spaeter protokollieren" getrennt — zwischen
 * zwei solchen Aufrufen laege ein Fenster, in dem nichts den Deckel haelt.
 *
 * Reihenfolge ist Absicht: erst INSERT, dann COUNT. D1 serialisiert Schreib-
 * vorgaenge, der eigene INSERT ist also committed, bevor der eigene COUNT laeuft
 * — jede parallele Anfrage sieht darum einen anderen Zaehler und hoechstens
 * RATE_LIMIT_PER_IP_PER_HOUR kommen durch. Andersherum (erst zaehlen, dann
 * schreiben) lesen N parallele Anfragen alle denselben veralteten Zaehler,
 * passieren alle den Check und der Deckel haelt genau nichts — ein umgehbarer
 * Deckel ist kein Deckel (dieselbe Lektion wie in leads.js beim Resend-Deckel).
 *
 * Abgewiesene Versuche landen BEWUSST ebenfalls im Log und zaehlen weiter mit:
 * ein Burst soll in der Tabelle sichtbar sein, und wer den Deckel reisst, soll
 * sich nicht durch blosses Weiterballern wieder freizaehlen. Nicht "wegoptimieren".
 */
export async function registerAttempt(db, ip, now = new Date()) {
  const cutoff = iso(new Date(now.getTime() - RATE_LIMIT_LOG_RETENTION_HOURS * HOUR_MS));
  try {
    await db.prepare('DELETE FROM free_intake_log WHERE created_at < ?').bind(cutoff).run();
  } catch (err) {
    // Nicht fatal: ein misslungenes Aufraeumen darf nie eine echte Anfrage blockieren.
    console.error('[protect] Aufraeumen des Rate-Limit-Logs fehlgeschlagen:', err);
  }

  await db
    .prepare('INSERT INTO free_intake_log (ip, created_at) VALUES (?, ?)')
    .bind(ip, iso(now))
    .run();

  // Fixe Breite ISO 'YYYY-MM-DD HH:MM:SS' -> Textvergleich == Zeitvergleich.
  // Strikt '>' wie leads.js: exakt eine Stunde alt liegt AUSSERHALB des Fensters.
  const fensterStart = iso(new Date(now.getTime() - HOUR_MS));

  // Der eigene INSERT zaehlt mit -> '>' statt '>=': N Versuche erlaubt, N+1 nicht.
  const proIp = await db
    .prepare('SELECT COUNT(*) AS c FROM free_intake_log WHERE ip = ? AND created_at > ?')
    .bind(ip, fensterStart)
    .first();
  if ((proIp?.c ?? 0) > RATE_LIMIT_PER_IP_PER_HOUR) return { ok: false, reason: 'ip' };

  const gesamt = await db
    .prepare('SELECT COUNT(*) AS c FROM free_intake_log WHERE created_at > ?')
    .bind(fensterStart)
    .first();
  if ((gesamt?.c ?? 0) > RATE_LIMIT_GLOBAL_PER_HOUR) return { ok: false, reason: 'global' };

  return { ok: true };
}
