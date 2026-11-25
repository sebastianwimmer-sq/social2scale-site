/**
 * Reel-Check: die Annahme (Sebi 15.11.2026). Ein Lead lädt ein Reel hoch, beantwortet drei Fragen und bekommt
 * einen Befund per Mail. Dieser Teil nimmt nur an: prüfen, in Teilen nach R2 legen, Adresse bestätigen lassen.
 * Gemessen wird auf dem Mac (kit-build/reel-check), der Zeilen mit status='da' abholt.
 *
 * Ablauf einer Zeile in reel_check:
 *   laedt  → Upload läuft (Teile kommen einzeln, je höchstens TEIL_BYTES)
 *   da     → Video liegt vollständig, der Mac darf prüfen. Seit dem 21.11.2026 ohne Klick in einer Mail (Sebi: „Angekommen,
 *            also fertig? was lädt da?“): die Seite bleibt beim Prüfen offen und zeigt den Befund selbst, die Mail kommt dazu.
 *            Bremse gegen Missbrauch bleiben Turnstile, die Grenze je IP und ein Check je Adresse.
 *   wartet → nur noch alte Zeilen von vor dem 21.11. (Bestätigungsmail war raus)
 *   in_arbeit · fertig · fehler → setzt der Mac
 *                 danach verschickt reelCheckPost (Cron) genau eine Mail: Befund ist da, oder es hat nicht geklappt
 *   geloescht → Frist abgelaufen, Video und Befund sind weg, Adresse ist geleert
 *
 * Der Upload läuft in Teilen, weil ein Worker höchstens 100 MB je Anfrage annimmt und eine Handyverbindung
 * bei einem langen Einzel-Upload gern abreißt: ein gescheiterter Teil wird wiederholt, nicht das ganze Video.
 */

import { einsetzen as scaleWeekEinsetzen } from './scale-week.js';
import { verifyTurnstile, hasMailServer, registerAttempt } from './protect.js';
import { normalizeEmail, isDisposable, stripControlChars } from './validate.js';
import { mailVorschlag, mailErfunden, nameGueltig, nummer } from './eingaben.js';
import { send } from './mail.js';
import { reelCheckMailHtml, founderMailHtml } from './pages/confirm-email.js';

export const MAX_BYTES = 250 * 1024 * 1024;      // ein Reel aus dem Handy liegt weit darunter; darüber ist es kein Reel-Export
export const MIN_BYTES = 200 * 1024;             // darunter ist es kein Video, das sich prüfen lässt
export const TEIL_BYTES = 8 * 1024 * 1024;       // R2 verlangt ≥ 5 MB je Teil (außer dem letzten)
export const JE_ADRESSE_AM_TAG = 3;              // Bremse für angefangene Uploads: jede Prüfung kostet KI-Aufrufe
// Ein Gratis-Check je Adresse (Sebi 21.11.2026: „sonst ist ja unser Abo unnütz“). Zählt, sobald das Video vollständig liegt;
// ein abgebrochener Upload oder ein unlesbares Video verbraucht ihn nicht. Nach der Löschung (Adresse geleert) ist er wieder frei.
export const GENUTZT_STATUS = ['wartet', 'da', 'in_arbeit', 'fertig'];
export const UPLOAD_FRIST_STUNDEN = 24;          // angefangener Upload ohne Abschluss
export const BESTAETIGEN_FRIST_TAGE = 7;         // hochgeladen, aber Adresse nie bestätigt
export const LOESCH_FRIST_TAGE = 30;             // nach der Bestätigung: Video, Befund und Adresse weg
// Wortlaut-Fassung der Einwilligung. Ändert sich der Satz auf der Seite, zählt diese Zahl hoch: so steht an
// jeder Zeile, welchem Wortlaut zugestimmt wurde.
export const EINWILLIGUNG_FASSUNG = 'reel-check-1';
export const MIME = { 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
export const LAGEN = ['besser', 'anfang', 'keine_zeit'];
export const PLATTFORMEN = ['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube'];
const TEST_AM_TAG = 30;
const VORNAME_MAX = 40;
const ZIELGRUPPE_MAX = 200;
const TOKEN_RE = /^[a-f0-9]{48}$/;

const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });
const schluessel = (token, ext) => `reelcheck/${token}/reel.${ext}`;
const befundSchluessel = (token) => `reelcheck/${token}/befund.html`;
const pdfSchluessel = (token) => `reelcheck/${token}/befund.pdf`;

function neuerToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Wie viele Teile ein Video dieser Größe hat und wie groß Teil nr sein muss. */
export function teile(bytes) {
  return Math.ceil(bytes / TEIL_BYTES);
}
export function teilGroesse(bytes, nr) {
  const n = teile(bytes);
  if (nr < 1 || nr > n) return 0;
  return nr < n ? TEIL_BYTES : bytes - TEIL_BYTES * (n - 1);
}

/** Reine Prüfung der Anmeldung. → { ok, value } oder { ok:false, error } (error ist ein Schlüssel, die Seite übersetzt). */
export function pruefeStart(input) {
  const d = input && typeof input === 'object' ? input : {};
  const emailNorm = normalizeEmail(d.email);
  if (!emailNorm) return { ok: false, error: 'email' };
  if (isDisposable(emailNorm)) return { ok: false, error: 'disposable' };
  if (mailErfunden(d.email)) return { ok: false, error: 'email' };
  // Vertipper in der Domain: einmal nachfragen. Bestätigt sie ihre Schreibweise (email_ok = dieselbe Adresse), geht sie durch.
  const vorschlag = mailVorschlag(d.email);
  if (vorschlag && d.email_ok !== String(d.email).trim()) return { ok: false, error: 'email_tipp', vorschlag };
  // Zielgruppe, „spricht selbst“ und Lage sind seit dem 21.11.2026 freiwillig (ein Eingabeschirm): leer heißt „nicht gefragt“,
  // der Check erkennt Sprache selbst. Was kommt, muss trotzdem gültig sein.
  const zielgruppe = stripControlChars(d.zielgruppe ?? '').slice(0, ZIELGRUPPE_MAX);
  if (zielgruppe && zielgruppe.length < 3) return { ok: false, error: 'zielgruppe' };
  const spricht = d.spricht ?? '';
  if (spricht !== '' && spricht !== 'ja' && spricht !== 'nein') return { ok: false, error: 'spricht' };
  const lage = d.lage ?? '';
  if (lage !== '' && !LAGEN.includes(lage)) return { ok: false, error: 'lage' };
  const vorname = stripControlChars(d.vorname ?? '').trim().slice(0, VORNAME_MAX);
  if (!nameGueltig(vorname)) return { ok: false, error: 'vorname' };
  // Handynummer nur, wenn sie selbst eine einträgt (Rückruf von Phil). Leer ist der Normalfall.
  const telefon = nummer(stripControlChars(d.telefon ?? ''), d.land);
  if (telefon === null) return { ok: false, error: 'telefon' };
  const plattform = d.plattform === undefined ? 'instagram' : d.plattform;
  if (!PLATTFORMEN.includes(plattform)) return { ok: false, error: 'plattform' };
  // Die Einwilligung wird nie vorbelegt und nie abgeleitet: nur ein ausdrückliches true zählt.
  if (d.einwilligung !== true) return { ok: false, error: 'einwilligung' };
  const bytes = Number(d.bytes);
  if (!Number.isInteger(bytes) || bytes < MIN_BYTES) return { ok: false, error: 'video_klein' };
  if (bytes > MAX_BYTES) return { ok: false, error: 'video_gross' };
  const ext = MIME[String(d.mime || '').toLowerCase()];
  if (!ext) return { ok: false, error: 'video_art' };
  return {
    ok: true,
    value: {
      email: stripControlChars(d.email).toLowerCase().slice(0, 160), emailNorm, zielgruppe, spricht, lage, vorname, plattform, telefon,
      bytes, mime: String(d.mime).toLowerCase(), ext, sprache: d.sprache === 'en' ? 'en' : 'de', spam: d.website ? 1 : 0,
    },
  };
}

/** MP4 und MOV tragen an Stelle 4 die Kennung „ftyp“. Alles andere ist kein Video, egal was die Endung sagt. */
export function istVideoKopf(bytes) {
  const b = new Uint8Array(bytes);
  return b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
}

/** Unsere eigenen Testadressen (Secret REEL_CHECK_TEST_MAIL, mit Komma getrennt, nie im Code: das Repo ist öffentlich). */
export function istTest(env, emailNorm) {
  return String(env.REEL_CHECK_TEST_MAIL || '').split(',').map(normalizeEmail).filter(Boolean).includes(emailNorm);
}

/** Vorabprüfung beim Verlassen eines Felds: dieselben Regeln wie beim Absenden, ohne Datenbank und ohne Netz. */
async function eingabe(request, cors) {
  let d;
  try { d = await request.json(); } catch { return json({ ok: false }, 400, cors); }
  if (d?.feld === 'vorname') return json({ ok: nameGueltig(String(d.wert ?? '').slice(0, 80)) , error: 'vorname' }, 200, cors);
  if (d?.feld === 'telefon') return json({ ok: nummer(String(d.wert ?? '').slice(0, 40), d.land) !== null, error: 'telefon' }, 200, cors);
  if (d?.feld !== 'email') return json({ ok: false }, 400, cors);
  const m = String(d.wert ?? '').trim().slice(0, 160), norm = normalizeEmail(m);
  if (m && (!norm || mailErfunden(m))) return json({ ok: false, error: 'email' }, 200, cors);
  if (m && isDisposable(norm)) return json({ ok: false, error: 'disposable' }, 200, cors);
  const vorschlag = mailVorschlag(m);
  return json(vorschlag ? { ok: false, error: 'email_tipp', vorschlag } : { ok: true }, 200, cors);
}

async function zeile(db, token) {
  if (!TOKEN_RE.test(token)) return null;
  return db.prepare('SELECT * FROM reel_check WHERE token = ?').bind(token).first();
}

async function start(request, env, cors) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400, cors); }
  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  if (env.TURNSTILE_SECRET) {
    if (!(await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET))) return json({ ok: false, error: 'captcha' }, 403, cors);
  } else {
    console.error('[reel-check] TURNSTILE_SECRET fehlt — Bot-Gate ist AUS');
  }
  const c = pruefeStart(body);
  if (!c.ok) return json({ ok: false, error: c.error, ...(c.vorschlag ? { vorschlag: c.vorschlag } : {}) }, 422, cors);
  const v = c.value;
  // Der Honigtopf verwirft nie, er markiert (Autofill füllt ihn bei echten Menschen): die Bestätigung per Mail entscheidet.
  if (v.spam) console.error('[reel-check] Honigtopf gefüllt, Zeile wird markiert');
  let limit;
  try { limit = await registerAttempt(env.DB, ip); } catch (err) {
    console.error('[reel-check] Rate-Limit-Zählung fehlgeschlagen:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }
  const test = istTest(env, v.emailNorm);
  if (!limit.ok && !test) return json({ ok: false, error: 'rate_limited' }, 429, cors);
  if (!(await hasMailServer(v.emailNorm))) return json({ ok: false, error: 'email_domain' }, 422, cors);
  try {
    const heute = await env.DB.prepare("SELECT COUNT(*) AS c FROM reel_check WHERE email_norm = ? AND created_at > datetime('now', '-1 day')").bind(v.emailNorm).first();
    if ((heute?.c ?? 0) >= (test ? TEST_AM_TAG : JE_ADRESSE_AM_TAG)) return json({ ok: false, error: 'rate_limited' }, 429, cors);
    const genutzt = await env.DB.prepare(`SELECT COUNT(*) AS c FROM reel_check WHERE email_norm = ? AND status IN (${GENUTZT_STATUS.map(() => '?').join(', ')})`).bind(v.emailNorm, ...GENUTZT_STATUS).first();
    if ((genutzt?.c ?? 0) >= 1 && !test) return json({ ok: false, error: 'schon' }, 409, cors);
    const token = neuerToken();
    const mp = await env.IMAGES.createMultipartUpload(schluessel(token, v.ext), { httpMetadata: { contentType: v.mime } });
    await env.DB.prepare(
      'INSERT INTO reel_check (token, email, email_norm, zielgruppe, spricht, lage, vorname, plattform, telefon, sprache, einwilligung_fassung, einwilligung_at, bytes, mime, upload_id, spam, status, created_at, updated_at) ' +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, 'laedt', datetime('now'), datetime('now'))",
    ).bind(token, v.email, v.emailNorm, v.zielgruppe, v.spricht, v.lage, v.vorname, v.plattform, v.telefon, v.sprache, EINWILLIGUNG_FASSUNG, v.bytes, v.mime, mp.uploadId, v.spam).run();
    return json({ ok: true, token, teil: TEIL_BYTES, teile: teile(v.bytes) }, 200, cors);
  } catch (err) {
    console.error('[reel-check] Anmeldung nicht gespeichert:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }
}

async function teil(request, env, cors, token, nr) {
  const z = await zeile(env.DB, token);
  if (!z || z.status !== 'laedt') return json({ ok: false, error: 'not_found' }, 404, cors);
  const soll = teilGroesse(z.bytes, nr);
  // Größe VOR dem Lesen prüfen: wer mehr schickt als angemeldet, wird nicht erst eingelesen.
  if (!soll || Number(request.headers.get('content-length') || 0) !== soll) return json({ ok: false, error: 'teil' }, 400, cors);
  try {
    const daten = await request.arrayBuffer();
    if (daten.byteLength !== soll) return json({ ok: false, error: 'teil' }, 400, cors);
    if (nr === 1 && !istVideoKopf(daten.slice(0, 16))) return json({ ok: false, error: 'video_art' }, 422, cors);
    const mp = env.IMAGES.resumeMultipartUpload(schluessel(token, MIME[z.mime]), z.upload_id);
    const t = await mp.uploadPart(nr, daten);
    return json({ ok: true, nr, etag: t.etag }, 200, cors);
  } catch (err) {
    console.error('[reel-check] Teil', nr, 'nicht abgelegt:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }
}

export function bestaetigungsMail(z, origin) {
  const link = `${origin}/rc/c/${z.token}`;
  if (z.sprache === 'en') {
    return {
      subject: 'One click, then we check your reel',
      htmlContent: reelCheckMailHtml('Your reel has arrived', 'One click confirms your address. After that we check your reel and send you the report by email.', link, 'Confirm and start the check',
        'One click, then we check your reel.', 'You are getting this email because a reel was uploaded for the social2scale Reel Check with this address. Not you? Just ignore it, nothing will be checked.', 'en'),
      tags: ['reel-check-bestaetigung'],
    };
  }
  return {
    subject: 'Ein Klick, dann prüfen wir dein Reel',
    htmlContent: reelCheckMailHtml('Dein Reel ist angekommen', 'Ein Klick bestätigt deine Adresse. Danach prüfen wir dein Reel und schicken dir den Befund per Mail.', link, 'Bestätigen und prüfen lassen',
      'Ein Klick, dann prüfen wir dein Reel.', 'Du bekommst diese Mail, weil mit dieser Adresse ein Reel für den Reel-Check von social2scale hochgeladen wurde. Warst du das nicht, ignorier sie einfach, dann wird nichts geprüft.'),
    tags: ['reel-check-bestaetigung'],
  };
}

async function fertig(request, env, ctx, cors, token) {
  const z = await zeile(env.DB, token);
  if (!z || z.status !== 'laedt') return json({ ok: false, error: 'not_found' }, 404, cors);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400, cors); }
  const n = teile(z.bytes);
  const liste = Array.isArray(body?.teile) ? body.teile : [];
  const ok = liste.length === n && liste.every((t, i) => t && t.nr === i + 1 && typeof t.etag === 'string' && t.etag.length <= 200);
  if (!ok) return json({ ok: false, error: 'teil' }, 400, cors);
  const key = schluessel(token, MIME[z.mime]);
  try {
    const mp = env.IMAGES.resumeMultipartUpload(key, z.upload_id);
    const obj = await mp.complete(liste.map((t) => ({ partNumber: t.nr, etag: t.etag })));
    if (obj.size !== z.bytes) {
      await env.IMAGES.delete(key);
      await env.DB.prepare("UPDATE reel_check SET status='fehler', fehler='groesse', updated_at=datetime('now') WHERE token=?").bind(token).run();
      return json({ ok: false, error: 'teil' }, 400, cors);
    }
    // Das Video liegt vollständig: ab jetzt darf der Mac prüfen. confirmed_at ist der Beginn der Löschfrist.
    await env.DB.prepare("UPDATE reel_check SET status='da', upload_id=NULL, confirmed_at=datetime('now'), updated_at=datetime('now') WHERE token=? AND status='laedt'").bind(token).run();
    return json({ ok: true }, 200, cors);
  } catch (err) {
    console.error('[reel-check] Abschluss fehlgeschlagen:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }
}

/** Mail nochmal schicken (die Seite bietet es an, wenn nichts ankommt). Höchstens einmal je 2 Minuten. */
async function nochmal(env, cors, token) {
  const z = await zeile(env.DB, token);
  if (!z || z.status !== 'wartet') return json({ ok: true }, 200, cors);
  const r = await env.DB.prepare("UPDATE reel_check SET updated_at=datetime('now') WHERE token=? AND status='wartet' AND updated_at < datetime('now', '-2 minutes')").bind(token).run();
  if ((r.meta?.changes ?? 0) !== 1) return json({ ok: false, error: 'rate_limited' }, 429, cors);
  const gesendet = await send(env, z.email, '', bestaetigungsMail(z, env.PUBLIC_ORIGIN || 'https://start.social2scale.com'));
  return gesendet ? json({ ok: true }, 200, cors) : json({ ok: false, error: 'mail' }, 502, cors);
}

/** API-Weiche. → Response oder null, wenn der Pfad nicht hierher gehört. */
export async function reelCheckApi(request, env, ctx, cors, url) {
  const p = url.pathname;
  if (!p.startsWith('/api/reel-check/')) return null;
  if (p === '/api/reel-check/start') return request.method === 'POST' ? start(request, env, cors) : json({ ok: false, error: 'method' }, 405, cors);
  if (p === '/api/reel-check/eingabe') return request.method === 'POST' ? eingabe(request, cors) : json({ ok: false, error: 'method' }, 405, cors);
  let m = p.match(/^\/api\/reel-check\/teil\/([a-f0-9]{48})\/(\d{1,3})$/);
  if (m) return request.method === 'PUT' ? teil(request, env, cors, m[1], Number(m[2])) : json({ ok: false, error: 'method' }, 405, cors);
  m = p.match(/^\/api\/reel-check\/fertig\/([a-f0-9]{48})$/);
  if (m) return request.method === 'POST' ? fertig(request, env, ctx, cors, m[1]) : json({ ok: false, error: 'method' }, 405, cors);
  m = p.match(/^\/api\/reel-check\/nochmal\/([a-f0-9]{48})$/);
  if (m) return request.method === 'POST' ? nochmal(env, cors, m[1]) : json({ ok: false, error: 'method' }, 405, cors);
  // Die Profil-Vorschau geht direkt aus dem Befund weiter (Sebi 21.11.2026: „nicht nochmal alles neu fahren“): wer den Link
  // seines Befunds hat, bekommt Vorname und Adresse zurück, damit die Vorschau sie nicht nochmal fragt. Nur solange die Zeile lebt.
  m = p.match(/^\/api\/reel-check\/person\/([a-f0-9]{48})$/);
  if (m) {
    const z = await zeile(env.DB, m[1]);
    if (!z || !GENUTZT_STATUS.includes(z.status) || !z.email) return json({ ok: false }, 404, cors);
    return json({ ok: true, vorname: z.vorname || '', email: z.email }, 200, { ...cors, 'Cache-Control': 'no-store' });
  }
  m = p.match(/^\/api\/reel-check\/status\/([a-f0-9]{48})$/);
  if (m) {
    const z = await zeile(env.DB, m[1]);
    return json({ ok: true, status: z ? z.status : 'not_found' }, 200, cors);
  }
  return json({ ok: false, error: 'not_found' }, 404, cors);
}

/** Klick in der Mail: wartet → da. Mehrfaches Klicken ist harmlos. → { ok, status, sprache } */
export async function bestaetigen(env, token) {
  const z = await zeile(env.DB, token);
  if (!z || z.status === 'laedt' || z.status === 'geloescht') return { ok: false, sprache: z?.sprache || 'de' };
  if (z.status === 'wartet') {
    await env.DB.prepare("UPDATE reel_check SET status='da', confirmed_at=datetime('now'), updated_at=datetime('now') WHERE token=? AND status='wartet'").bind(token).run();
    return { ok: true, status: 'da', sprache: z.sprache };
  }
  return { ok: true, status: z.status, sprache: z.sprache };
}

/** Stand für die Seite /rc/<token>. Den fertigen Befund legt der Mac als HTML nach R2. */
export async function stand(env, token) {
  const z = await zeile(env.DB, token);
  if (!z) return { status: 'not_found', sprache: 'de' };
  if (z.status === 'fertig') {
    const obj = await env.IMAGES.get(befundSchluessel(token));
    if (obj) return { status: 'fertig', sprache: z.sprache, befund: scaleWeekEinsetzen(await obj.text(), z.sprache) };
    return { status: 'in_arbeit', sprache: z.sprache };
  }
  return { status: z.status, sprache: z.sprache, seit: z.confirmed_at ? Math.max(0, (Date.now() - Date.parse(z.confirmed_at.replace(' ', 'T') + 'Z')) / 1000) : 0 };
}

/** Der Befund als PDF. Nur solange die Zeile fertig ist; danach 404 wie die Seite. */
export async function befundPdf(env, token) {
  const z = await zeile(env.DB, token);
  const obj = z && z.status === 'fertig' ? await env.IMAGES.get(pdfSchluessel(token)) : null;
  if (!obj) return null;
  return new Response(obj.body, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="reel-check-social2scale.pdf"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });
}

async function wegraeumen(env, z, grund) {
  const key = schluessel(z.token, MIME[z.mime] || 'mp4');
  if (z.upload_id) {
    try { await env.IMAGES.resumeMultipartUpload(key, z.upload_id).abort(); } catch (err) { console.error('[reel-check] Upload-Abbruch:', err); }
  }
  await env.IMAGES.delete([key, befundSchluessel(z.token), pdfSchluessel(z.token)]);
  // Die Notiz für Phil (volle Lösungen, Sätze aus dem Reel) geht mit derselben Frist.
  await env.DB.prepare("DELETE FROM tickets WHERE source='reel-check-befund' AND title LIKE ?").bind(`Reel-Check ${Number(z.id)} ·%`).run();
  // Die Zeile bleibt als Zähler ohne Person: Adresse, Vorname und Zielgruppe werden geleert, der Token ist danach tot.
  await env.DB.prepare(
    "UPDATE reel_check SET status='geloescht', email='', email_norm='', zielgruppe='', vorname='', telefon='', upload_id=NULL, fehler=?, geloescht_at=datetime('now'), updated_at=datetime('now') WHERE id=?",
  ).bind(grund, z.id).run();
}

/**
 * Löschfristen (Cron). Drei Fälle: Upload nie abgeschlossen (24 h), Adresse nie bestätigt (7 Tage),
 * bestätigt (30 Tage nach der Bestätigung: Video, Befund und Adresse weg). WIRFT NIE.
 * @returns {Promise<number>} gelöschte Zeilen
 */
export async function reelCheckAufraeumen(env) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM reel_check WHERE status != 'geloescht' AND (" +
      `(status = 'laedt' AND created_at < datetime('now', '-${UPLOAD_FRIST_STUNDEN} hours')) OR ` +
      `(status = 'wartet' AND created_at < datetime('now', '-${BESTAETIGEN_FRIST_TAGE} days')) OR ` +
      `(confirmed_at IS NOT NULL AND confirmed_at < datetime('now', '-${LOESCH_FRIST_TAGE} days'))) LIMIT 50`,
    ).all();
    let n = 0;
    for (const z of results ?? []) {
      try {
        await wegraeumen(env, z, z.status === 'laedt' ? 'upload_abgebrochen' : z.status === 'wartet' ? 'nie_bestaetigt' : 'frist');
        n++;
      } catch (err) { console.error('[reel-check] Löschen fehlgeschlagen, Zeile', z.id, err); }
    }
    return n;
  } catch (err) {
    console.error('[reel-check] Aufräumen fehlgeschlagen:', err);
    return 0;
  }
}

/** Mail nach der Prüfung: der Befund ist da, oder das Reel ließ sich nicht prüfen. */
export function befundMail(z, origin) {
  const en = z.sprache === 'en';
  const grund = en
    ? 'You are getting this email because this address was entered for the social2scale Reel Check. Your reel, the report and your address are deleted 30 days after the upload.'
    : 'Du bekommst diese Mail, weil diese Adresse für den Reel-Check von social2scale angegeben wurde. Dein Reel, der Befund und deine Adresse werden 30 Tage nach dem Hochladen gelöscht.';
  if (z.status === 'fehler') {
    const link = `${origin}${en ? '/en' : ''}/reel-check/`;
    return en
      ? { subject: 'We could not check your reel', tags: ['reel-check-fehler'],
        htmlContent: reelCheckMailHtml('That did not work', 'We could not read your video, so there is no report. Please upload the reel again, ideally the original file from your phone.', link, 'Upload again', 'We could not check your reel.', grund, 'en') }
      : { subject: 'Dein Reel ließ sich nicht prüfen', tags: ['reel-check-fehler'],
        htmlContent: reelCheckMailHtml('Das hat nicht geklappt', 'Wir konnten dein Video nicht lesen, deshalb gibt es keinen Befund. Lad das Reel bitte nochmal hoch, am besten die Originaldatei aus deinem Handy.', link, 'Nochmal hochladen', 'Dein Reel ließ sich nicht prüfen.', grund) };
  }
  const link = `${origin}/rc/${z.token}`;
  return en
    ? { subject: 'Your reel report is ready', tags: ['reel-check-befund'],
      htmlContent: reelCheckMailHtml('Your report is ready', 'We checked your reel against 50 points. The report shows what already works and the three places to start.', link, 'Open the report', 'Your reel report is ready.', grund, 'en') }
    : { subject: 'Dein Befund ist da', tags: ['reel-check-befund'],
      htmlContent: reelCheckMailHtml('Dein Befund ist da', 'Wir haben dein Reel an 50 Punkten geprüft. Der Befund zeigt, was schon sitzt und an welchen drei Stellen du anfängst.', link, 'Befund ansehen', 'Dein Befund ist da.', grund) };
}

const LAGE_WORT = { besser: 'will besser werden', anfang: 'steht am Anfang', keine_zeit: 'hat keine Zeit dafür' };

/**
 * Nach der Prüfung (Cron): je Zeile genau EINE Mail an die Person und ein Hinweis an uns. Der Hinweis nennt keine
 * Adresse (am Haken steht, dass wir sie nur für den Befund nutzen), nur Zahl, Lage und den Link zum Befund.
 * Riegel über befund_mail_at; scheitert der Versand, geht der Riegel wieder auf. WIRFT NIE.
 * @returns {Promise<number>} verschickte Mails
 */
export async function reelCheckPost(env) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM reel_check WHERE status IN ('fertig', 'fehler') AND confirmed_at IS NOT NULL AND befund_mail_at IS NULL AND spam = 0 AND email != '' LIMIT 20",
    ).all();
    const origin = env.PUBLIC_ORIGIN || 'https://start.social2scale.com';
    let n = 0;
    for (const z of results ?? []) {
      try {
        if (z.status === 'fertig' && !(await env.IMAGES.get(befundSchluessel(z.token)))) continue;   // nie eine Mail auf eine leere Seite
        const r = await env.DB.prepare("UPDATE reel_check SET befund_mail_at=datetime('now') WHERE id=? AND befund_mail_at IS NULL").bind(z.id).run();
        if ((r.meta?.changes ?? 0) !== 1) continue;
        if (!(await send(env, z.email, '', befundMail(z, origin)))) {
          await env.DB.prepare('UPDATE reel_check SET befund_mail_at=NULL WHERE id=?').bind(z.id).run();
          console.error('[reel-check] Befund-Mail nicht zugestellt, Zeile', z.id);
          continue;
        }
        n++;
        if (z.status === 'fertig') {
          const an = env.NOTIFY_TO || env.NOTIFY_FROM;
          await send(env, an, 'social2scale', {
            subject: `Reel-Check fertig: ${z.zahl ?? '–'} von 100${z.sprache === 'en' ? ' [EN]' : ''}`,
            htmlContent: founderMailHtml('Reel-Check fertig', [
              ['Zahl', `${z.zahl ?? '–'} von 100`], ['Plattform', z.plattform || 'instagram'], ...(LAGE_WORT[z.lage] ? [['Lage', LAGE_WORT[z.lage]]] : []), ['Sprache', z.sprache === 'en' ? 'Englisch' : 'Deutsch'],
              ...(z.telefon ? [['Rückruf erwünscht', `${z.vorname ? z.vorname + ' · ' : ''}${z.telefon}`]] : []),
              ['Hinweis', z.telefon ? 'Die Nummer hat die Person selbst für einen Rückruf zum Befund eingetragen. Der Link gilt bis zur Löschung nach 30 Tagen.' : 'Ohne Adresse: die Person meldet sich über den Termin-Knopf im Befund. Der Link gilt bis zur Löschung nach 30 Tagen.'],
            ], `${origin}/rc/${z.token}`),
          });
        }
      } catch (err) { console.error('[reel-check] Post fehlgeschlagen, Zeile', z.id, err); }
    }
    return n;
  } catch (err) {
    console.error('[reel-check] Post fehlgeschlagen:', err);
    return 0;
  }
}

export const WAECHTER_TITEL = 'Reel-Check steht — Reels warten';
export const MARKIERT_TITEL = 'Reel-Check: markierte Uploads ansehen';
export const WAECHTER_MIN = 90;

/**
 * Wächter von außen (wie reel-waechter.js): die Prüfung läuft auf Sebis Mac. Schläft er, wartet jedes Reel, und niemand
 * erfährt es. Zwei Tickets, je höchstens eines offen, beide schließen sich selbst:
 *   steht     bestätigte Reels warten oder hängen länger als WAECHTER_MIN
 *   markiert  der Honigtopf war gefüllt (spam = 1): die Wache prüft solche Zeilen nicht, ein Mensch gibt frei oder lässt sie verfallen
 * WIRFT NIE.
 */
export async function reelCheckWaechter(env) {
  const eins = async (titel, zeilen, body, owner) => {
    const offen = await env.DB.prepare("SELECT id FROM tickets WHERE title = ? AND status != 'erledigt' LIMIT 1").bind(titel).first();
    if (zeilen.length && !offen) {
      await env.DB.prepare(
        "INSERT INTO tickets (client_id, type, title, body, status, priority, source, owner, updated_at) VALUES (NULL, 'bug', ?, ?, 'offen', 'hoch', 'reel-check-waechter', ?, datetime('now'))",
      ).bind(titel, body.slice(0, 4000), owner).run();
      return 'gemeldet';
    }
    if (!zeilen.length && offen) {
      await env.DB.prepare(
        "UPDATE tickets SET status='erledigt', done_at=datetime('now'), updated_at=datetime('now'), done_note='Reel-Check-Wächter: nichts wartet mehr (Cron-Messung)' WHERE id = ?",
      ).bind(offen.id).run();
      return 'geschlossen';
    }
    return zeilen.length ? 'schon gemeldet' : 'ruhig';
  };
  try {
    const steht = (await env.DB.prepare(
      `SELECT id, status, updated_at FROM reel_check WHERE spam = 0 AND status IN ('da', 'in_arbeit') AND updated_at < datetime('now', '-${WAECHTER_MIN} minutes')`,
    ).all()).results ?? [];
    const markiert = (await env.DB.prepare("SELECT id, updated_at FROM reel_check WHERE spam = 1 AND status = 'da'").all()).results ?? [];
    return {
      steht: await eins(WAECHTER_TITEL, steht, 'Gemeldet vom Cloudflare-Cron (Worker s2s-free-content), unabhängig vom Mac.\n' +
        steht.map((r) => `- Zeile ${r.id}: ${r.status} seit ${r.updated_at} UTC`).join('\n') +
        '\n\nPrüfen: läuft der Mac / launchd com.s2s.reel-check-wache? ~/s2s-reel-check/wache.log', 'sebi'),
      markiert: await eins(MARKIERT_TITEL, markiert, 'Bei diesen Uploads war das unsichtbare Feld gefüllt (meist ein Bot, manchmal Autofill). Die Adresse ist bestätigt, geprüft wird nicht von selbst.\n' +
        markiert.map((r) => `- Zeile ${r.id}, bestätigt ${r.updated_at} UTC`).join('\n') +
        '\n\nFreigeben: UPDATE reel_check SET spam = 0 WHERE id = <Zeile>. Sonst verfällt die Zeile nach 30 Tagen.', 'wir'),
    };
  } catch (err) {
    console.error('[reel-check] Wächter fehlgeschlagen:', err);
    return { steht: 'fehler', markiert: 'fehler' };
  }
}
