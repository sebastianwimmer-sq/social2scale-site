/**
 * Reine Validierungs- und Normalisierungsfunktionen.
 * Keine Bindings, kein I/O — damit trivial testbar.
 */

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Bildet alle Schreibweisen derselben Adresse auf EINEN Schluessel ab.
 * Gibt '' zurueck, wenn die Adresse syntaktisch unbrauchbar ist.
 */
export function normalizeEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email || (email.match(/@/g) || []).length !== 1) return '';

  const at = email.indexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain || !domain.includes('.')) return '';
  if (domain.startsWith('.') || domain.endsWith('.')) return '';

  const withoutTag = local.split('+')[0];
  if (!withoutTag) return '';

  const isGmail = GMAIL_DOMAINS.has(domain);
  // Punkte NUR bei Gmail entfernen — anderswo sind sie signifikant.
  const localNorm = isGmail ? withoutTag.replace(/\./g, '') : withoutTag;
  const domainNorm = isGmail ? 'gmail.com' : domain;
  if (!localNorm) return '';

  return `${localNorm}@${domainNorm}`;
}
