/**
 * Holt das oeffentliche Instagram-Profilbild ueber unavatar.io — server-seitig,
 * die Besucherin laedt NIE von Dritt-Origins. Ergebnis ist eine data-URL, die
 * direkt in die Render-Seite (frames.js) eingebettet wird: die Browser-
 * Rendering-Seite kommt per setContent ohne Origin und koennte relative oder
 * externe Quellen nicht zuverlaessig laden. KEIN R2-Objekt — ein avatar.jpg im
 * Lead-Prefix wuerde den .jpg-Fortschrittszaehler von buildStatus verfaelschen,
 * und Reveal/Share zeigen ohnehin nur die gerenderten Frames.
 *
 * WIRFT NIE. Jeder Ausfall = null = Initial-Fallback im Frame. Gates gegen
 * "Ressource da, Auslieferung leer": Status, Content-Type, Mindest-/Maximalgroesse.
 */

import { AVATAR_TIMEOUT_MS, AVATAR_MIN_BYTES, AVATAR_MAX_BYTES } from './constants.js';

// fallback=false: unavatar liefert 404 statt eines generischen Platzhalters —
// wir wollen ihr echtes Bild oder ehrlich keins, nie ein fremdes Standardgesicht.
const quelle = (handle) =>
  `https://unavatar.io/instagram/${encodeURIComponent(handle)}?fallback=false`;

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
 * @param {string} handle bereits validiert/normalisiert (validate.js, ohne @)
 * @param {typeof fetch} [fetchImpl] injizierbar fuer Tests
 * @returns {Promise<string|null>} data-URL oder null
 */
export async function holeAvatar(handle, fetchImpl = fetch) {
  const h = String(handle ?? '').trim();
  if (!h) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AVATAR_TIMEOUT_MS);
  try {
    const res = await fetchImpl(quelle(h), { signal: ctrl.signal });
    if (!res.ok) return null;
    const typ = String(res.headers.get('content-type') || '').split(';')[0].trim();
    if (!typ.startsWith('image/')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < AVATAR_MIN_BYTES || buf.byteLength > AVATAR_MAX_BYTES) return null;
    return `data:${typ};base64,${base64(buf)}`;
  } catch (err) {
    console.error('[avatar] Profilbild nicht ladbar (Fallback: Initial):', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
