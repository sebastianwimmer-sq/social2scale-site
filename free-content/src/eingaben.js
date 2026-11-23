/**
 * Prüfung von Name, Adresse und Nummer (Sebi 23.11.2026: „check, ob's echte Mail, Telefonnummern, Namen sind“).
 * Grenze, die bleibt: geprüft wird, ob es die Adresse oder Nummer so geben KANN. Ob sie der Person gehört, wüsste man nur mit
 * einem Bestätigungs-Klick; den gibt es hier seit dem 21.11. bewusst nicht mehr.
 */
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode } from 'libphonenumber-js/max';

const VORNE = ['DE', 'AT', 'CH'];
const ERLAUBTE_ART = new Set(['MOBILE', 'FIXED_LINE', 'FIXED_LINE_OR_MOBILE', 'PERSONAL_NUMBER', 'VOIP', undefined]);
const TIPPFEHLER = /^(?:(gmial|gmai|gamil|gmal|gnail|gmaill|gmil)\.(com|de)|gmail\.(de|con|co|cm)|(hotmial|hotmal|hotmai)\.(com|de)|hotmail\.con|(outlok|outloook|oulook)\.(com|de)|outlook\.con|(yaho|yahooo)\.(com|de)|yahoo\.con|(gmxx|gxm)\.(de|net)|gmx\.(ed|dee)|(wbe|webb)\.de|web\.(ed|dee)|(iclod|icoud|iclould)\.com|icloud\.(con|de)|t-onlin\.de|tonline\.de)$/;
const ERSATZ = [[/^(gm|ga|gn).*/, 'gmail.com'], [/^hot.*/, 'hotmail.com'], [/^ou.*/, 'outlook.com'], [/^yah.*/, 'yahoo.com'], [/^(gmxx|gxm|gmx).*/, 'gmx.de'], [/^w.*/, 'web.de'], [/^ic.*/, 'icloud.com'], [/^t.*/, 't-online.de']];
const RAUS_MAIL = /^(test|tester|asdf|asd|qwert[zy]?|abc|xxx+|fake|keine|none|noreply|no-reply|mail|email)\d{0,4}$/;
const GROSSE = new Set(['gmail.com', 'googlemail.com', 'gmx.de', 'gmx.net', 'gmx.at', 'web.de', 'hotmail.com', 'outlook.com', 'outlook.de', 'yahoo.com', 'yahoo.de', 'icloud.com', 't-online.de']);

/** Vorschlag bei einem bekannten Vertipper der Domain, sonst ''. */
export function mailVorschlag(email) {
  const [lokal, domain] = String(email || '').trim().toLowerCase().split('@');
  if (!lokal || !domain || !TIPPFEHLER.test(domain)) return '';
  if (/^gmx/.test(domain) && !/^gmxx/.test(domain)) return `${lokal}@gmx.de`;
  const treffer = ERSATZ.find(([m]) => m.test(/^g(mxx|xm)/.test(domain) ? 'gxm' : domain));
  return /^g(mxx|xm)/.test(domain) ? `${lokal}@gmx.${domain.split('.').pop()}` : treffer ? `${lokal}@${treffer[1]}` : '';
}

/** Offensichtlich erfundene Adresse (nur bei den großen Anbietern: test@firma.de kann es geben). */
export function mailErfunden(email) {
  const [lokal, domain] = String(email || '').trim().toLowerCase().split('@');
  return GROSSE.has(domain) && (RAUS_MAIL.test(lokal) || /^(.)\1{3,}$/.test(lokal));
}

/** Leer ist erlaubt (freiwillig). Buchstaben jeder Sprache, Leerzeichen, Bindestrich, Apostroph, Punkt. */
export function nameGueltig(name) {
  const n = String(name || '').trim();
  if (!n) return true;
  if (n.length < 2 || !/^\p{L}[\p{L}\p{M} .'’-]*$/u.test(n)) return false;
  const k = n.toLowerCase();
  return !/(\p{L})\1{2,}/u.test(k) && !/^(test|tester|asdf\p{L}*|qwert\p{L}*|xyz|abc|name|vorname|fake|niemand|nobody)$/u.test(k);
}

const wiederholt = (z) => /(\d)\1{6}$/.test(z) || '01234567890'.includes(z.slice(-7)) || '9876543210'.includes(z.slice(-7));

/** → '' (leer), '+49171…' (gültig) oder null (gibt es so nicht). Land gilt nur, wenn keine Vorwahl davorsteht. */
export function nummer(roh, land) {
  const t = String(roh || '').trim();
  if (!t) return '';
  if (!/^\+?[0-9][0-9 ()\/.-]{4,24}$/.test(t)) return null;
  const n = parsePhoneNumberFromString(t.replace(/^00/, '+'), getCountries().includes(land) ? land : 'DE');
  if (!n || !n.isValid() || !ERLAUBTE_ART.has(n.getType()) || wiederholt(n.nationalNumber)) return null;
  return n.number;
}

/** Länder für die Auswahl: Deutschland, Österreich, Schweiz zuerst, dann nach Namen. */
export function laender(sprache) {
  const namen = new Intl.DisplayNames([sprache], { type: 'region' });
  const alle = getCountries().map((c) => ({ c, name: namen.of(c) || c, vw: getCountryCallingCode(c) }));
  const rest = alle.filter((l) => !VORNE.includes(l.c)).sort((a, b) => a.name.localeCompare(b.name, sprache));
  return [...VORNE.map((c) => alle.find((l) => l.c === c)), ...rest];
}
