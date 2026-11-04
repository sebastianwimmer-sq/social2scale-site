/**
 * Morgenmail der täglichen Abstimmung an Sebi und Phil (Sebi 04.11.2026: „abstimmung einmal täglich ... per mail oder crm“).
 * Abgestimmt wird im CRM, die Mail ist nur der Anstoß: Sie nennt Titel und führt hin, Details bleiben im CRM.
 * Läuft hier im 5-Minuten-Cron und nicht auf dem Mac, damit sie auch kommt, wenn Sebi im Flieger sitzt. Genau dann
 * sagt sie dazu, seit wann die Wache nichts mehr gelesen hat.
 * Einmal je Tag und Empfänger (abstimmung_stand), scheitert der Versand, versucht es der nächste Lauf. WIRFT NIE.
 */
import { send } from './mail.js';

const CRM = 'https://closing.social2scale.com/';
const AB = '08:30', BIS = '12:00';
const WACHE_STILL_STUNDEN = 12;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Deutsche Uhrzeit, auch wenn der Worker in UTC läuft (Sommer- und Winterzeit)
export function berlinJetzt(jetzt) {
  const t = Object.fromEntries(new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(jetzt).map((p) => [p.type, p.value]));
  return { tag: `${t.year}-${t.month}-${t.day}`, uhr: `${t.hour}:${t.minute}` };
}

function stundenSeit(am, jetzt) {
  const ms = jetzt.getTime() - new Date(String(am).replace(' ', 'T') + 'Z').getTime();
  return Number.isNaN(ms) ? null : ms / 3600000;
}

export function wacheSatz(am, jetzt) {
  const h = am ? stundenSeit(am, jetzt) : null;
  if (h === null) return 'Von der Wache liegt noch keine Meldung vor.';
  if (h < WACHE_STILL_STUNDEN) return '';
  const zeit = h < 48 ? `${Math.round(h)} Stunden` : `${Math.round(h / 24)} Tagen`;
  return `Die Wache hat seit ${zeit} nichts gelesen, der Mac ist vermutlich offline. Was seitdem in der Gruppe kam, ist noch nicht dabei.`;
}

export function mailBauen(punkte, satz) {
  const zahl = (w) => punkte.filter((p) => p.wer === w).length;
  const teile = [];
  if (zahl('sebi')) teile.push(`Sebi ${zahl('sebi')}`);
  if (zahl('phil')) teile.push(`Phil ${zahl('phil')}`);
  if (zahl('beide')) teile.push(`gemeinsam ${zahl('beide')}`);
  if (zahl('erledigt')) teile.push(`erledigt ${zahl('erledigt')}`);
  const betreff = teile.length ? `Abstimmung: ${teile.join(', ')}` : 'Abstimmung: die Wache liest gerade nicht mit';
  const zeile = (p) => `<li style="margin:4px 0">${esc(p.titel)}</li>`;
  const html = '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1a1f1c;line-height:1.5">'
    + (punkte.length ? `<ul style="padding-left:20px">${punkte.map(zeile).join('')}</ul>` : '<p>Heute liegt nichts zur Abstimmung an.</p>')
    + (satz ? `<p style="color:#4c544e">${esc(satz)}</p>` : '')
    + `<p style="margin:22px 0"><a href="${CRM}" style="background:#0d7f61;color:#fff;text-decoration:none;padding:11px 18px;border-radius:9px;font-weight:600">Abstimmen</a></p></div>`;
  return { subject: betreff, htmlContent: html };
}

export async function abstimmungMail(env, jetzt = new Date(), versand = send) {
  try {
    const { tag, uhr } = berlinJetzt(jetzt);
    if (uhr < AB || uhr >= BIS) return 'nicht jetzt';
    const { results } = await env.DB.prepare(
      `SELECT titel, wer FROM abstimmung WHERE status = 'offen' AND (wieder_am IS NULL OR wieder_am <= ?) ORDER BY created_at, id`,
    ).bind(tag).all();
    const wache = await env.DB.prepare(`SELECT am FROM abstimmung_stand WHERE schluessel = 'wache_zuletzt'`).first();
    const satz = wacheSatz(wache && wache.am, jetzt);
    const punkte = results || [];
    // Nichts anzustehen und die Wache lebt: keine Mail, sonst lernt man, sie zu überlesen
    if (!punkte.length && !satz) return 'nichts an';
    const empfaenger = String(env.NOTIFY_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!empfaenger.length) return 'keine Empfänger';
    const mail = mailBauen(punkte, satz);
    let gesendet = 0;
    // Je Empfänger gemerkt: scheitert eine Adresse, bekommt die andere beim nächsten Lauf keine zweite Mail
    for (const an of empfaenger) {
      const merk = `mail:${tag}:${an}`;
      if (await env.DB.prepare('SELECT 1 FROM abstimmung_stand WHERE schluessel = ?').bind(merk).first()) continue;
      if (!await versand(env, an, an, mail, 'social2scale')) continue;
      await env.DB.prepare('INSERT OR IGNORE INTO abstimmung_stand (schluessel, wert) VALUES (?, ?)').bind(merk, String(punkte.length)).run();
      gesendet += 1;
    }
    return `gesendet ${gesendet}`;
  } catch (err) {
    console.error('[abstimmung-mail]', err);
    return 'fehler';
  }
}
