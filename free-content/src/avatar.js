/**
 * Ihr Profilbild — hochgeladen im Wizard, NICHT gescraped: unavatar verlangt
 * fuer Instagram einen Pro-Plan (403) und Instagram leitet Cloudflare-Worker-IPs
 * auf den Login um (04.08. live vom Edge verifiziert). Ein Server-Fetch haette
 * still IMMER den Fallback geliefert. Sie laedt selbst hoch = klare Einwilligung.
 *
 * Ablage als `free/<token>/avatar.bin` — bewusst NICHT .jpg: buildStatus
 * (generate.js) zaehlt die .jpg-Keys im Lead-Prefix als Render-Fortschritt,
 * ein avatar.jpg wuerde den Balken verfaelschen. Gleicher Prefix = gleicher
 * Lebenszyklus wie die Feed-Bilder (Aufraeumen loescht beides).
 *
 * ladeAvatar liefert eine data-URL fuer die Render-Seite (frames.js): die
 * Browser-Rendering-Seite kommt per setContent ohne Origin und koennte
 * relative oder externe Quellen nicht zuverlaessig laden.
 *
 * WIRFT NIE. Jeder Ausfall = false/null = Initial-Fallback im Frame. Gates
 * gegen "Ressource da, Auslieferung leer": Typ, Mindest-/Maximalgroesse.
 */

import { AVATAR_MIN_BYTES, AVATAR_MAX_BYTES } from './constants.js';

// Nur Rasterformate, die jeder Render-Browser sicher dekodiert. KEIN svg
// (Skript-Traeger) — der Upload kommt aus einem oeffentlichen Formular.
const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Nur was wir selbst erzeugen darf in den Key — der Token kommt von aussen. */
function sauber(v) {
  return String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
}

export function avatarKey(token) {
  return `free/${sauber(token)}/avatar.bin`;
}

/**
 * Prueft und dekodiert die hochgeladene data-URL.
 * @returns {{typ: string, bytes: Uint8Array}|null}
 */
export function parseFotoDataUrl(v) {
  const m = DATA_URL_RE.exec(String(v ?? ''));
  if (!m) return null;
  let bin;
  try {
    bin = atob(m[2]);
  } catch {
    return null;
  }
  if (bin.length < AVATAR_MIN_BYTES || bin.length > AVATAR_MAX_BYTES) return null;
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { typ: m[1], bytes };
}

function base64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000; // String.fromCharCode-Argumentgrenze
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/**
 * Legt das gepruefte Foto in R2 ab. Non-fatal: ein kaputter Upload darf die
 * Anmeldung nicht kosten.
 * @returns {Promise<boolean>} ob wirklich etwas liegt
 */
export async function speichereAvatar(env, token, fotoDataUrl) {
  const geparst = parseFotoDataUrl(fotoDataUrl);
  if (!geparst) return false;
  try {
    await env.IMAGES.put(avatarKey(token), geparst.bytes, {
      httpMetadata: { contentType: geparst.typ },
    });
    return true;
  } catch (err) {
    console.error('[avatar] Foto konnte nicht gespeichert werden:', err);
    return false;
  }
}

/**
 * @returns {Promise<string|null>} data-URL fuer die Render-Seite oder null
 */
export async function ladeAvatar(env, token) {
  try {
    const obj = await env.IMAGES.get(avatarKey(token));
    if (!obj) return null;
    const typ = String(obj.httpMetadata?.contentType || 'image/jpeg');
    if (!typ.startsWith('image/')) return null;
    const buf = await obj.arrayBuffer();
    if (buf.byteLength < AVATAR_MIN_BYTES || buf.byteLength > AVATAR_MAX_BYTES) return null;
    return `data:${typ};base64,${base64(buf)}`;
  } catch (err) {
    console.error('[avatar] Foto nicht ladbar (Fallback: Initial):', err);
    return null;
  }
}
