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
// Domain-Grenze erzwingen: 'notinstagram.com' ist NICHT Instagram.
const IG_DOMAIN_PATTERN = /(?:^|\/\/|\.)instagram\.com(?:[/?#]|$)/;
// Der Handle muss sauber durch '/', '?', '#' oder Ende begrenzt sein.
const IG_URL_PATTERN = /(?:^|\/\/|\.)instagram\.com\/([^/?#\s]+)(?:[/?#]|$)/;

/**
 * Bildet '@Name', 'name' und eine Profil-URL auf EINEN Schluessel ab.
 * Gibt '' zurueck, wenn kein gueltiger Instagram-Handle erkennbar ist.
 */
export function normalizeHandle(raw) {
  const input = String(raw ?? '').trim().toLowerCase();
  if (!input) return '';

  // Wer instagram.com nennt, muss eine wohlgeformte Profil-URL liefern.
  // Kein Rueckfall auf den Roh-Pfad — sonst waere 'instagram.com' selbst ein
  // Handle, und zwei gekuerzte Share-Links kollidierten auf demselben Schluessel.
  if (IG_DOMAIN_PATTERN.test(input)) {
    const fromUrl = input.match(IG_URL_PATTERN);
    if (!fromUrl) return '';
    return HANDLE_PATTERN.test(fromUrl[1]) ? fromUrl[1] : '';
  }

  // Roh-Handle: nur das fuehrende '@' faellt weg. '/', '?' und '#' kommen in
  // keinem echten Handle vor — sie wegzuschneiden wuerde einen Handle erfinden,
  // der nie eingegeben wurde ('some/random?query' -> 'some').
  const handle = input.replace(/^@+/, '');
  return HANDLE_PATTERN.test(handle) ? handle : '';
}
