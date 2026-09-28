/**
 * Leichtes Funnel-Tracking (entered/confirmed/ready/cta_call/cta_save).
 * Fail-open per Design: ein Tracking-Fehler darf den Funnel NIE bremsen — wer
 * hier wirft, reisst einen echten Nutzer-Flow (Formular-Submit, Bestaetigung,
 * Beacon-Klick) mit runter. Deshalb: try/catch, nur loggen, nie werfen.
 */

/**
 * @param {object} env
 * @param {{event: string, token?: string}} param1
 * @returns {Promise<void>}
 */
/**
 * Beacon-Variante fuer die OEFFENTLICHE Route /api/track. Ohne Anmeldung
 * erreichbar — sie darf deshalb nur schreiben, wenn der Token zu einem echten
 * Lead gehoert UND dieses Ereignis fuer ihn noch nicht erfasst ist. Vorher
 * erzeugte jeder Aufruf eine Zeile in der CRM-Datenbank (s2s-crm), die sich
 * CRM, Portal und Funnel teilen: ein Aufruf-Flood haette Tabelle und
 * Schreibkontingent aller drei getroffen (Sicherheits-Loop 28.09.2026).
 * So ist die Zahl der Zeilen auf Leads x Ereignisarten begrenzt.
 * Eine Anweisung, keine Schemaaenderung. Wirft nie.
 */
export async function trackBeacon(env, { event, token }) {
  if (!token) return;
  try {
    await env.DB.prepare(
      `INSERT INTO funnel_events (event, token)
       SELECT ?1, ?2
        WHERE EXISTS (SELECT 1 FROM free_leads WHERE token = ?2)
          AND NOT EXISTS (SELECT 1 FROM funnel_events WHERE event = ?1 AND token = ?2)`
    )
      .bind(event, token)
      .run();
  } catch (err) {
    console.error('[track] Beacon nicht geschrieben:', event, err);
  }
}

export async function track(env, { event, token = '' }) {
  try {
    await env.DB.prepare('INSERT INTO funnel_events (event, token) VALUES (?, ?)')
      .bind(event, token)
      .run();
  } catch (err) {
    console.error('[track] Event nicht geschrieben:', event, err);
  }
}
