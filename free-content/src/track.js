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
export async function track(env, { event, token = '' }) {
  try {
    await env.DB.prepare('INSERT INTO funnel_events (event, token) VALUES (?, ?)')
      .bind(event, token)
      .run();
  } catch (err) {
    console.error('[track] Event nicht geschrieben:', event, err);
  }
}
