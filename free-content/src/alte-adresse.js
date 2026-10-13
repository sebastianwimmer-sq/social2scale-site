// Bis 12.08.2026 lief der Funnel unter s2s-free-content.<konto>.workers.dev — Bestätigungsmails
// und QR-Codes auf Share-Karten zeigen noch dorthin. Statt die Adresse abzuschalten (alte Links
// tot), leitet sie auf die Markenadresse um; der alte Kontoname verschwindet aus der Adresszeile.
// start.social2scale.com erreicht den Worker per Service-Binding und ist nicht betroffen.
export const ZIEL = 'https://start.social2scale.com';

export function alteAdresse(request) {
  const url = new URL(request.url);
  if (!url.hostname.endsWith('.workers.dev')) return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  return Response.redirect(ZIEL + url.pathname + url.search, 301);
}
