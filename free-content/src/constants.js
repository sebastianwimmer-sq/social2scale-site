/** Alle Schwellen/Grenzen zentral — keine Magic Numbers im Code verteilt. */

export const TOKEN_TTL_HOURS = 24;
export const PENDING_TTL_DAYS = 30;
export const RESEND_MAX_PER_HOUR = 3;
export const MIN_ELAPSED_MS = 1500;
export const RATE_LIMIT_PER_IP_PER_HOUR = 5;
export const RATE_LIMIT_GLOBAL_PER_HOUR = 300;
/** Aufbewahrung von free_intake_log — nur fuers Aufraeumen, nicht fuers Zaehlen. */
export const RATE_LIMIT_LOG_RETENTION_HOURS = 24;

/**
 * Mindest-Kontrast ihrer Wunschfarbe gegen den Grund der jeweiligen Welt.
 * 3:1 = WCAG AA fuer grosse Schrift/Grafik — der Akzent traegt nur die
 * Headline-Pointe und den Kicker, beide gross. Reicht die Farbe nicht,
 * behaelt die Welt ihren eigenen Akzent.
 */
export const ACCENT_MIN_CONTRAST = 3;

export const FIELD_LIMITS = {
  name: 120,
  email: 160,
  handle: 60,
  branche: 200,
  ziel: 2000,
  stimmung: 40,
  farbe: 40,
  source: 40,
};
