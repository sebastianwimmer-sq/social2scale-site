/**
 * Einstieg von start.social2scale.com. Seit 25.11.2026 führt der nackte Aufruf in den Reel-Check (Sebi: „der nervige passt du zu uns“).
 * Die Fragen-Strecke bleibt nur für Wege mit Kennung: ?weg=a|b|c und ?von=check (Profil-Vorschau aus dem Befund).
 */
export function einstiegUmleiten(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/en/')) return null;
  if (url.searchParams.has('weg') || url.searchParams.get('von') === 'check') return null;
  return `${url.origin}${url.pathname}reel-check/${url.search}`;
}
