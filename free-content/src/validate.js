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

const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

/**
 * Bildet '@Name', 'name' und eine Profil-URL auf EINEN Schluessel ab.
 * Gibt '' zurueck, wenn kein gueltiger Instagram-Handle erkennbar ist.
 */
export function normalizeHandle(raw) {
  let handle = String(raw ?? '').trim().toLowerCase();
  if (!handle) return '';

  const fromUrl = handle.match(/instagram\.com\/([^/?#\s]+)/);
  if (fromUrl) handle = fromUrl[1];

  handle = handle.replace(/^@+/, '').replace(/[/?#].*$/, '').trim();
  if (!HANDLE_PATTERN.test(handle)) return '';

  return handle;
}
