/**
 * Einziger Ort, der die Tabelle free_leads kennt.
 *
 * Kernregel (Spec §7 "Wiedereintritt"): Erneutes Eintragen legt NIE eine zweite
 * Zeile an, sondern schickt den Link neu. Ein harter Unique-Index ohne diese
 * Logik sperrt jeden aus, der die Mail nie anklickt — der Funnel frisst still Leads.
 */

import { TOKEN_TTL_HOURS, RESEND_MAX_PER_HOUR, PENDING_TTL_DAYS } from './constants.js';

const HOUR_MS = 60 * 60 * 1000;

function iso(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function plusHours(date, hours) {
  return new Date(date.getTime() + hours * HOUR_MS);
}

async function byEmailNorm(db, emailNorm) {
  return db.prepare('SELECT * FROM free_leads WHERE email_norm = ?').bind(emailNorm).first();
}

async function byId(db, id) {
  return db.prepare('SELECT * FROM free_leads WHERE id = ?').bind(id).first();
}

/** true, wenn der Handle bereits von einem ANDEREN, bestaetigten Lead belegt ist. */
async function handleTakenByOther(db, handleNorm, emailNorm) {
  if (!handleNorm) return false;
  const row = await db
    .prepare(
      `SELECT id FROM free_leads
       WHERE handle_norm = ? AND email_norm != ? AND confirmed_at IS NOT NULL`
    )
    .bind(handleNorm, emailNorm)
    .first();
  return !!row;
}

/** Resend-Deckel: max. RESEND_MAX_PER_HOUR pro Lead und Stunde (Anti-Mailbombing). */
function isThrottled(lead, now) {
  if (!lead.last_sent_at) return false;
  const last = new Date(lead.last_sent_at.replace(' ', 'T') + 'Z');
  if (now.getTime() - last.getTime() >= HOUR_MS) return false;
  return lead.resend_count >= RESEND_MAX_PER_HOUR;
}

/** Zaehler zuruecksetzen, sobald das Stundenfenster vorbei ist. */
function nextResendCount(lead, now) {
  if (!lead.last_sent_at) return 1;
  const last = new Date(lead.last_sent_at.replace(' ', 'T') + 'Z');
  if (now.getTime() - last.getTime() >= HOUR_MS) return 1;
  return lead.resend_count + 1;
}

function isTokenExpired(lead, now) {
  return new Date(lead.token_expires.replace(' ', 'T') + 'Z').getTime() <= now.getTime();
}

/**
 * Legt an oder tritt wieder ein.
 * @returns {{lead: object, action: string, mail: 'confirm'|'result'|'none'}}
 */
export async function upsertLead(db, clean, ip, now = new Date()) {
  const existing = await byEmailNorm(db, clean.emailNorm);

  if (await handleTakenByOther(db, clean.handleNorm, clean.emailNorm)) {
    return { lead: existing ?? null, action: 'handle_taken', mail: 'none' };
  }

  if (!existing) {
    const token = newToken();
    await db
      .prepare(
        `INSERT INTO free_leads
           (name, email, email_norm, handle, handle_norm, branche, ziel, stimmung,
            farbe, consent, source, token, token_expires, resend_count, last_sent_at,
            ip, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?,1,?,?, 'pending', ?)`
      )
      .bind(
        clean.name, clean.email, clean.emailNorm, clean.handle, clean.handleNorm,
        clean.branche, clean.ziel, clean.stimmung, clean.farbe, clean.source,
        token, iso(plusHours(now, TOKEN_TTL_HOURS)), iso(now), ip, iso(now)
      )
      .run();

    const lead = await byEmailNorm(db, clean.emailNorm);
    return { lead, action: 'created', mail: 'confirm' };
  }

  // Fertig -> Ergebnis-Link, nicht neu bauen.
  if (existing.status === 'ready') {
    return { lead: existing, action: 'ready', mail: 'result' };
  }

  // Laeuft gerade -> Link zur Build-Seite.
  if (existing.status === 'confirmed' || existing.status === 'building') {
    return { lead: existing, action: 'building', mail: 'result' };
  }

  if (isThrottled(existing, now)) {
    return { lead: existing, action: 'throttled', mail: 'none' };
  }

  const retry = existing.status === 'failed';
  const expired = isTokenExpired(existing, now);
  const keepToken = !retry && !expired;

  const token = keepToken ? existing.token : newToken();
  const expires = keepToken ? existing.token_expires : iso(plusHours(now, TOKEN_TTL_HOURS));

  // Angaben mit aktualisieren — sie hat sie evtl. korrigiert.
  await db
    .prepare(
      `UPDATE free_leads SET
         name=?, email=?, handle=?, handle_norm=?, branche=?, ziel=?, stimmung=?,
         farbe=?, source=?, token=?, token_expires=?, token_used_at=NULL,
         resend_count=?, last_sent_at=?, ip=?, status='pending'
       WHERE id=?`
    )
    .bind(
      clean.name, clean.email, clean.handle, clean.handleNorm, clean.branche,
      clean.ziel, clean.stimmung, clean.farbe, clean.source, token, expires,
      nextResendCount(existing, now), iso(now), ip, existing.id
    )
    .run();

  const lead = await byId(db, existing.id);
  const action = retry ? 'retry' : expired ? 'renewed' : 'resent';
  return { lead, action, mail: 'confirm' };
}

export async function findByToken(db, token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM free_leads WHERE token = ?').bind(token).first();
}

/**
 * Entwertet den Token und setzt den Lead auf confirmed. Genau einmal moeglich.
 * @returns {{ok: boolean, lead?: object, reason?: 'not_found'|'expired'|'used'}}
 */
export async function confirmLead(db, token, now = new Date()) {
  const lead = await findByToken(db, token);
  if (!lead) return { ok: false, reason: 'not_found' };
  if (lead.token_used_at) return { ok: false, reason: 'used' };
  if (isTokenExpired(lead, now)) return { ok: false, reason: 'expired' };

  await db
    .prepare(
      `UPDATE free_leads
         SET token_used_at=?, confirmed_at=?, status='confirmed'
       WHERE id=? AND token_used_at IS NULL`
    )
    .bind(iso(now), iso(now), lead.id)
    .run();

  return { ok: true, lead: await byId(db, lead.id) };
}

/** DSGVO: unbestaetigte Leads nach PENDING_TTL_DAYS loeschen. */
export async function cleanupExpired(db, now = new Date()) {
  const cutoff = iso(new Date(now.getTime() - PENDING_TTL_DAYS * 24 * HOUR_MS));
  const res = await db
    .prepare(
      `DELETE FROM free_leads
        WHERE status = 'pending' AND confirmed_at IS NULL AND created_at < ?`
    )
    .bind(cutoff)
    .run();
  return res.meta?.changes ?? 0;
}
