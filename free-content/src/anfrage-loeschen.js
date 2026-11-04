/**
 * DSGVO (#423): Erstgespräch-Anfragen ohne Zusammenarbeit INACTIVE_TTL_DAYS nach
 * der letzten Anfrage löschen, überall, wo Funnel und Portal sie ablegen: CRM-Eingang,
 * Anruf-Termin und Brevo-Kontakt. Wer eine Karte im CRM hat, bleibt.
 */

import { INACTIVE_TTL_DAYS } from './constants.js';

const BREVO_KONTAKT = 'https://api.brevo.com/v3/contacts/';
const JE_LAUF = 20; // Bremse: Brevo-Aufrufe im 5-Minuten-Cron

const FAELLIG = `SELECT lower(trim(s.email)) AS schluessel FROM submissions s
  WHERE s.type = 'anfrage' AND coalesce(s.email, '') != ''
  GROUP BY schluessel
  HAVING max(s.created_at) < ? AND max(s.client_id) IS NULL
     AND NOT EXISTS (SELECT 1 FROM clients c
                      WHERE lower(trim(c.email)) = schluessel OR lower(trim(c.contact)) = schluessel)
  LIMIT ${JE_LAUF}`;

/** true, wenn bei Brevo nichts mehr zu tun ist. Wer auf einer Liste steht, hat eigens eingewilligt und bleibt. */
export async function brevoKontaktWeg(key, email, holen = fetch) {
  const url = BREVO_KONTAKT + encodeURIComponent(email);
  const kopf = { 'api-key': key, accept: 'application/json' };
  const lesen = await holen(url, { headers: kopf });
  if (lesen.status === 404) return true;
  if (!lesen.ok) throw new Error('Brevo lesen: ' + lesen.status);
  const kontakt = await lesen.json();
  if ((kontakt.listIds || []).length) return true;
  const weg = await holen(url, { method: 'DELETE', headers: kopf });
  if (!weg.ok && weg.status !== 404) throw new Error('Brevo löschen: ' + weg.status);
  return true;
}

/** @returns {Promise<number>} Anzahl gelöschter Adressen. Ohne Brevo-Zugang kein Lauf, sonst bliebe der Kontakt verwaist. */
export async function anfragenAufraeumen(env, now = new Date(), holen = fetch) {
  if (!env.BREVO_API_KEY) return 0;
  const cutoff = new Date(now.getTime() - INACTIVE_TTL_DAYS * 864e5).toISOString().replace('T', ' ').slice(0, 19);
  const { results } = await env.DB.prepare(FAELLIG).bind(cutoff).all();
  let geloescht = 0;
  for (const z of results ?? []) {
    try {
      await brevoKontaktWeg(env.BREVO_API_KEY, z.schluessel, holen);
    } catch (err) {
      // Zeilen bleiben, der nächste Lauf versucht es wieder. Die Adresse gehört nicht ins Log.
      console.error('[anfrage] Brevo-Löschung fehlgeschlagen:', err.message);
      continue;
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM submissions WHERE type = 'anfrage' AND lower(trim(email)) = ?").bind(z.schluessel),
      env.DB.prepare("DELETE FROM events WHERE client_id IS NULL AND title LIKE 'Anrufen: Erstgespräch-Anfrage %' AND instr(lower(note), ?) > 0").bind(z.schluessel),
    ]);
    geloescht++;
  }
  return geloescht;
}
