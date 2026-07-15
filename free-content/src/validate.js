/**
 * Reine Validierungs- und Normalisierungsfunktionen.
 * Keine Bindings, kein I/O — damit trivial testbar.
 */

import { DISPOSABLE_DOMAINS } from './disposable.js';
import { FIELD_LIMITS } from './constants.js';

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

/** true, wenn die Domain auf der Wegwerf-Liste steht. */
export function isDisposable(email) {
  const norm = normalizeEmail(email);
  if (!norm) return false;
  return DISPOSABLE_DOMAINS.has(norm.split('@')[1]);
}

/**
 * Trimmt und kappt einen String auf max Zeichen.
 * Fehlt der Wert (null/undefined), ist das Ergebnis ''.
 * Ist der Wert vorhanden, aber KEIN String, ist das Ergebnis null —
 * das Feld wird dann abgelehnt statt stillschweigend gecastet zu werden.
 * Ohne diese Grenze landete ['xss','payload'] als 'xss,payload' in der DB.
 */
function clip(value, max) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, max);
}

/**
 * Validiert + normalisiert eine Formular-Eingabe.
 * Gibt { ok:true, value } oder { ok:false, error } zurueck.
 * error ist ein stabiler Schluessel (kein Text) — die UI uebersetzt ihn.
 */
export function validateSubmission(input) {
  const raw = input ?? {};

  const name = clip(raw.name, FIELD_LIMITS.name);
  if (!name) return { ok: false, error: 'name' };

  const email = clip(raw.email, FIELD_LIMITS.email);
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return { ok: false, error: 'email' };
  if (isDisposable(emailNorm)) return { ok: false, error: 'disposable' };

  const handle = clip(raw.handle, FIELD_LIMITS.handle);
  const handleNorm = normalizeHandle(handle);
  if (!handleNorm) return { ok: false, error: 'handle' };

  const branche = clip(raw.branche, FIELD_LIMITS.branche);
  if (!branche) return { ok: false, error: 'branche' };

  const ziel = clip(raw.ziel, FIELD_LIMITS.ziel);
  if (!ziel) return { ok: false, error: 'ziel' };

  const stimmung = clip(raw.stimmung, FIELD_LIMITS.stimmung);
  if (!stimmung) return { ok: false, error: 'stimmung' };

  // farbe und source sind optional: '' ist erlaubt, null (= kein String) nicht.
  const farbe = clip(raw.farbe, FIELD_LIMITS.farbe);
  if (farbe === null) return { ok: false, error: 'farbe' };

  const source = clip(raw.source, FIELD_LIMITS.source);
  if (source === null) return { ok: false, error: 'source' };

  if (raw.consent !== true) return { ok: false, error: 'consent' };

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      emailNorm,
      handle: handleNorm,
      handleNorm,
      branche,
      ziel,
      stimmung,
      farbe,
      consent: true,
      source,
    },
  };
}
