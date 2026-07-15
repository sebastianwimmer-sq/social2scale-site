/**
 * Einziger Ort, der die Tabelle free_leads kennt.
 *
 * Kernregel (Spec §7 "Wiedereintritt"): Erneutes Eintragen legt NIE eine zweite
 * Zeile an, sondern schickt den Link neu. Ein harter Unique-Index ohne diese
 * Logik sperrt jeden aus, der die Mail nie anklickt — der Funnel frisst still Leads.
 *
 * Nebenlaeufigkeit: Jeder Lese-dann-Schreib-Pfad kann sich mit einer parallelen
 * Anfrage ueberschneiden (Doppelklick, Client-Retry, verteilter Angreifer). Kein
 * Pfad darf deshalb in einer unbehandelten D1-Exception enden — ein Fremder, der
 * seinen Bestaetigungslink anklickt, bekommt nie eine 500.
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

/**
 * Erkennt eine verletzte UNIQUE-Bedingung. D1 verpackt den SQLite-Fehler, der
 * Index-Name steckt im Text ("UNIQUE constraint failed: free_leads.email_norm").
 */
function isUniqueViolation(err, column) {
  const msg = `${err?.message ?? ''} ${err?.cause?.message ?? ''}`;
  if (!/UNIQUE constraint failed/i.test(msg)) return false;
  return column ? msg.includes(column) : true;
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

function isTokenExpired(lead, now) {
  return new Date(lead.token_expires.replace(' ', 'T') + 'Z').getTime() <= now.getTime();
}

/**
 * Legt eine neue Zeile an.
 * @returns Ergebnis-Objekt, oder null wenn eine parallele Anfrage schneller war.
 */
async function insertNew(db, clean, ip, now) {
  const token = newToken();
  try {
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
  } catch (err) {
    // Rennen verloren: zwischen Lookup und INSERT hat eine parallele Anfrage
    // dieselbe Adresse angelegt. Kein Fehlerfall — der Verlierer tritt einfach
    // wieder ein und bekommt seinen Link.
    if (isUniqueViolation(err, 'email_norm')) {
      console.error('[leads] INSERT-Rennen um email_norm verloren, Wiedereintritt folgt:', err.message);
      return null;
    }
    console.error('[leads] INSERT fehlgeschlagen:', err);
    throw err;
  }

  const lead = await byEmailNorm(db, clean.emailNorm);
  return { lead, action: 'created', mail: 'confirm' };
}

/**
 * Wiedereintritt auf einer bestehenden Zeile.
 *
 * Der Resend-Deckel steckt im WHERE des UPDATEs: Pruefung UND Hochzaehlen sind
 * EIN Statement. Getrennt (erst lesen, dann pruefen, dann schreiben) laufen N
 * parallele Anfragen alle gegen denselben veralteten Zaehler, passieren alle den
 * Check und loesen N Mails aus — ein umgehbarer Deckel ist kein Deckel, und der
 * Deckel ist die einzige Verteidigung eines fremden Postfachs gegen Mailbombing.
 */
async function reenter(db, clean, ip, now, existing) {
  // Fertig -> Ergebnis-Link, nicht neu bauen.
  if (existing.status === 'ready') {
    return { lead: existing, action: 'ready', mail: 'result' };
  }

  // Laeuft gerade -> Link zur Build-Seite.
  if (existing.status === 'confirmed' || existing.status === 'building') {
    return { lead: existing, action: 'building', mail: 'result' };
  }

  const retry = existing.status === 'failed';
  const expired = isTokenExpired(existing, now);
  const keepToken = !retry && !expired;

  const token = keepToken ? existing.token : newToken();
  const expires = keepToken ? existing.token_expires : iso(plusHours(now, TOKEN_TTL_HOURS));
  // Fixe Breite ISO 'YYYY-MM-DD HH:MM:SS' -> Textvergleich == Zeitvergleich.
  const windowStart = iso(new Date(now.getTime() - HOUR_MS));

  const res = await db
    .prepare(
      `UPDATE free_leads SET
         name=?, email=?, handle=?, handle_norm=?, branche=?, ziel=?, stimmung=?,
         farbe=?, source=?, token=?, token_expires=?, token_used_at=NULL,
         resend_count = CASE WHEN last_sent_at IS NULL OR last_sent_at <= ?
                             THEN 1 ELSE resend_count + 1 END,
         last_sent_at=?, ip=?, status='pending'
       WHERE id=?
         AND (last_sent_at IS NULL OR last_sent_at <= ? OR resend_count < ?)`
    )
    .bind(
      clean.name, clean.email, clean.handle, clean.handleNorm, clean.branche,
      clean.ziel, clean.stimmung, clean.farbe, clean.source, token, expires,
      windowStart, iso(now), ip, existing.id, windowStart, RESEND_MAX_PER_HOUR
    )
    .run();

  // Keine Zeile getroffen == Quote im laufenden Fenster ausgeschoepft.
  if ((res.meta?.changes ?? 0) === 0) {
    return { lead: existing, action: 'throttled', mail: 'none' };
  }

  const lead = await byId(db, existing.id);
  const action = retry ? 'retry' : expired ? 'renewed' : 'resent';
  return { lead, action, mail: 'confirm' };
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

  if (existing) return reenter(db, clean, ip, now, existing);

  const created = await insertNew(db, clean, ip, now);
  if (created) return created;

  const raced = await byEmailNorm(db, clean.emailNorm);
  if (!raced) {
    // UNIQUE auf email_norm verletzt, aber die Zeile ist nicht auffindbar —
    // dafuer gibt es keine sinnvolle Erklaerung. Lieber laut als still falsch.
    console.error('[leads] UNIQUE-Verletzung ohne auffindbare Zeile:', clean.emailNorm);
    throw new Error('leads: UNIQUE-Verletzung auf email_norm ohne auffindbare Zeile');
  }
  return reenter(db, clean, ip, now, raced);
}

export async function findByToken(db, token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM free_leads WHERE token = ?').bind(token).first();
}

/**
 * Entwertet den Token und setzt den Lead auf confirmed. Genau einmal moeglich.
 * @returns {{ok: boolean, lead?: object, reason?: 'not_found'|'expired'|'used'|'handle_taken'}}
 */
export async function confirmLead(db, token, now = new Date()) {
  const lead = await findByToken(db, token);
  if (!lead) return { ok: false, reason: 'not_found' };
  if (lead.token_used_at) return { ok: false, reason: 'used' };
  if (isTokenExpired(lead, now)) return { ok: false, reason: 'expired' };

  try {
    await db
      .prepare(
        `UPDATE free_leads
           SET token_used_at=?, confirmed_at=?, status='confirmed'
         WHERE id=? AND token_used_at IS NULL`
      )
      .bind(iso(now), iso(now), lead.id)
      .run();
  } catch (err) {
    // Zwei PENDING-Leads duerfen denselben Handle tragen (kein Griefing-Lock).
    // Bestaetigen beide, greift beim Zweiten der partielle Handle-Index. Das ist
    // ein regulaerer Ausgang, kein Serverfehler: der Klick auf einen echten
    // Bestaetigungslink darf nie in einer 500 enden.
    if (isUniqueViolation(err, 'handle_norm')) {
      console.error('[leads] confirmLead: Handle inzwischen fremd bestaetigt:', lead.handle_norm);
      return { ok: false, reason: 'handle_taken' };
    }
    console.error('[leads] confirmLead fehlgeschlagen:', err);
    throw err;
  }

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
