/**
 * Waechter von aussen fuer die Reel-Wache (Ticket #284, 15.10.2026).
 *
 * Die Reel-Wache laeuft auf Sebis Mac. Schlaeft er, ist das Kontingent leer oder ist die Wache abgestuerzt, steht jeder
 * Auftrag — und niemand erfaehrt es (14.10. 15:34–18:56). Dieser Cron laeuft in Cloudflare, also auch dann.
 *   wartet  > 30 min in 'da'        → die Wache holt nicht ab
 *   haengt  > 60 min in 'in_arbeit' → ein Bau steht
 * Ergebnis: GENAU EIN offenes Ticket (Dublettensperre ueber den Titel), mit den Codes. Erledigt sich der Stau, schliesst
 * der Waechter sein Ticket selbst (mit Beleg) — ein Waechter, der nur aufmacht, haeuft Tickets an.
 * WIRFT NIE (ein Fehler hier darf den Funnel-Cron nicht stoppen).
 */
export const TITEL = 'Reel-Wache steht — Aufträge warten';
export const WARTET_MIN = 30;
export const HAENGT_MIN = 60;

export async function staus(db) {
  const sql = (tab, status, min) =>
    `SELECT '${tab}' AS art, code, client_id, status, updated_at FROM ${tab} ` +
    `WHERE status = '${status}' AND updated_at < datetime('now', '-${min} minutes')`;
  const teile = [];
  for (const tab of ['reel_upload', 'reel_auftrag']) {
    for (const [status, min] of [['da', WARTET_MIN], ['in_arbeit', HAENGT_MIN]]) {
      const { results } = await db.prepare(sql(tab, status, min)).all();
      teile.push(...(results ?? []));
    }
  }
  return teile;
}

export async function reelWaechter(env) {
  try {
    const liste = await staus(env.DB);
    const offen = await env.DB.prepare("SELECT id FROM tickets WHERE title = ? AND status != 'erledigt' LIMIT 1").bind(TITEL).first();
    if (liste.length && !offen) {
      const body = 'Gemeldet vom Cloudflare-Cron (Worker s2s-free-content), unabhängig vom Mac.\n' +
        liste.map((r) => `- ${r.art} ${r.code} (Kundin ${r.client_id}): ${r.status} seit ${r.updated_at} UTC`).join('\n') +
        '\n\nPrüfen: läuft der Mac / launchd com.s2s.reel-wache? ~/s2s-reel-wache/<datum>.log, kontingent.json, PAUSE.';
      await env.DB.prepare(
        "INSERT INTO tickets (client_id, type, title, body, status, priority, source, owner, updated_at) " +
        "VALUES (NULL, 'bug', ?, ?, 'offen', 'hoch', 'reel-waechter', 'sebi', datetime('now'))",
      ).bind(TITEL, body.slice(0, 4000)).run();
      console.error('[cron] Reel-Wache steht:', liste.length, 'Aufträge');
      return 'gemeldet';
    }
    if (!liste.length && offen) {
      await env.DB.prepare(
        "UPDATE tickets SET status='erledigt', done_at=datetime('now'), updated_at=datetime('now'), " +
        "done_note='Reel-Wächter: keine wartenden oder hängenden Aufträge mehr (Cron-Messung)' WHERE id = ?",
      ).bind(offen.id).run();
      return 'geschlossen';
    }
    return liste.length ? 'schon gemeldet' : 'ruhig';
  } catch (err) {
    console.error('[cron] Reel-Wächter fehlgeschlagen:', err);
    return 'fehler';
  }
}
