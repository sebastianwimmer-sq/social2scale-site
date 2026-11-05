/**
 * Morgenmail der täglichen Abstimmung an Sebi und Phil (Sebi 04.11.2026: „abstimmung einmal täglich ... per mail oder crm“).
 * Abgestimmt wird im CRM, die Mail ist nur der Anstoß: Sie zeigt jedem seine Fragen im Look des CRM (Sebi 05.11.:
 * „random text ohne große gute aufbereitung“) und führt hin, Erklärungen und Texte an Kundinnen bleiben im CRM.
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

// Dieselben Farben wie im CRM: Jeder sieht auf einen Blick, wessen Mail das ist (Sebi grün, Phil blau).
const FARBE = { grund: '#0A0B0D', flaeche: '#101114', linie: '#25272B', schrift: '#F2F3F1', leise: '#A6A8A6', gruen: '#1FC998', rot: '#F07F7F', gelb: '#E0A93B', tiefschrift: '#04140F' };
const PERSON = { sebi: { name: 'Sebi', farbe: '#1FC998' }, phil: { name: 'Phil', farbe: '#5FB4F0' } };
const SCHRIFT = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MAX_ZEILEN = { senden: 3, fragen: 6, faellig: 3 };
// Titel können von Hand geschrieben sein. Was nach Zugangsdaten klingt, zählt mit, steht aber in keiner Mail.
const istHeikel = (titel) => /passw|kennwort|zugangsdaten/i.test(String(titel));

export function personVon(adresse) {
  const name = String(adresse).trim().toLowerCase();
  if (name.startsWith('sebastian@')) return 'sebi';
  if (name.startsWith('philipp@')) return 'phil';
  return null;
}

function teile(titel) {
  const m = /^([^:]{2,30}): (.+)$/.exec(String(titel));
  return m ? { thema: m[1], frage: m[2].charAt(0).toUpperCase() + m[2].slice(1) } : { thema: '', frage: String(titel) };
}

// Wie im CRM: erst meine Punkte, dann gemeinsame. Ohne bekannte Person stehen alle offenen Fragen da.
export function fuerPerson(punkte, ich) {
  const offen = punkte.filter((p) => (ich ? !p[`antwort_${ich}`] && (p.wer === ich || p.wer === 'beide' || p.wer === 'erledigt') : true));
  const rang = (w) => (w === ich ? 0 : w === 'beide' ? 1 : 2);
  const sortiert = [...offen].sort((a, b) => rang(a.wer) - rang(b.wer));
  return { fragen: sortiert.filter((p) => p.wer !== 'erledigt'), abnicken: sortiert.filter((p) => p.wer === 'erledigt') };
}

const anzahl = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;

function betreffBauen(ich, fragen, senden, faellig) {
  const stuecke = [];
  if (ich === 'phil' && senden) stuecke.push(`${senden} zu senden`);
  if (fragen) stuecke.push(anzahl(fragen, 'Entscheidung', 'Entscheidungen'));
  if (faellig) stuecke.push(`${faellig} fällig`);
  return stuecke;
}

function abschnitt(titel, zahl, inhalt) {
  return `<tr><td style="padding:26px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 0 9px;border-bottom:1px solid ${FARBE.linie};font:600 15px/1.3 ${SCHRIFT};color:${FARBE.schrift}">${esc(titel)}${zahl == null ? '' : ` <span style="font-weight:400;color:${FARBE.leise}">&nbsp;${zahl}</span>`}</td></tr>${inhalt}</table></td></tr>`;
}
function zeile(haupt, unter, rechts = '') {
  return `<tr><td style="padding:12px 0;border-bottom:1px solid ${FARBE.linie}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font:500 15px/1.4 ${SCHRIFT};color:${FARBE.schrift}">${haupt}${unter ? `<div style="margin-top:2px;font:400 13px/1.4 ${SCHRIFT};color:${FARBE.leise}">${unter}</div>` : ''}</td>${rechts ? `<td align="right" valign="top" style="padding-left:14px;white-space:nowrap;font:500 13px/1.5 ${SCHRIFT}">${rechts}</td>` : ''}</tr></table></td></tr>`;
}
const nochMehr = (n, eins = 'weitere', viele = 'weitere') => (n > 0 ? `<tr><td style="padding:10px 0 0;font:400 13px/1.4 ${SCHRIFT};color:${FARBE.leise}">Und ${n} ${n === 1 ? eins : viele} im CRM.</td></tr>` : '');

function frageZeile(p, ich) {
  const { thema, frage } = teile(p.titel);
  const anderer = ich === 'sebi' ? 'phil' : 'sebi';
  const unter = [esc(thema)];
  if (ich && p.wer === 'beide') unter.push(`${PERSON[anderer].name}: ${esc(p[`antwort_${anderer}`] || 'noch offen')}`);
  if (!ich && PERSON[p.wer]) unter.push(PERSON[p.wer].name);
  if (p.stufe === 'rot') unter.push(`<span style="color:${FARBE.rot}">nicht rückgängig</span>`);
  return zeile(esc(frage), unter.filter(Boolean).join(' · '), p.empfehlung && !/^(gesendet|geschickt|erledigt)$/i.test(p.empfehlung) ? `<span style="color:${FARBE.gruen}">Empfehlung: ${esc(p.empfehlung)}</span>` : '');
}

export function mailBauen(punkte, satz, ich = null, extra = {}) {
  const { fragen, abnicken } = fuerPerson(punkte, ich);
  const entwuerfe = ich === 'phil' ? (extra.entwuerfe || []) : [];
  const faellig = (extra.faellig || []).filter((t) => !ich || t.owner !== (ich === 'sebi' ? 'phil' : 'sebi'));
  const stuecke = betreffBauen(ich, fragen.length, entwuerfe.length, faellig.length);
  const person = PERSON[ich];
  const akzent = person ? person.farbe : FARBE.gruen;
  const betreff = stuecke.length ? `Heute: ${stuecke.join(', ')}` : 'Heute: die Wache liest gerade nicht mit';
  const gruss = person ? `Guten Morgen, ${person.name}` : 'Guten Morgen';

  const zeigbar = (liste) => liste.filter((x) => !istHeikel(x.titel || x.title));
  const sendenZeilen = zeigbar(entwuerfe).slice(0, MAX_ZEILEN.senden);
  const faelligZeilen = zeigbar(faellig).slice(0, MAX_ZEILEN.faellig);
  const inhalt = [
    entwuerfe.length ? abschnitt('Das schreibst du heute', entwuerfe.length,
      sendenZeilen.map((n) => zeile(esc(n.titel), '')).join('') + nochMehr(entwuerfe.length - sendenZeilen.length, 'weiterer Entwurf', 'weitere Entwürfe')) : '',
    fragen.length ? abschnitt('Zu entscheiden', fragen.length,
      fragen.slice(0, MAX_ZEILEN.fragen).map((p) => frageZeile(p, ich)).join('') + nochMehr(fragen.length - MAX_ZEILEN.fragen)) : '',
    abnicken.length ? abschnitt('Schon erledigt, kurz abnicken', abnicken.length, '') : '',
    faellig.length ? abschnitt('Fällig', faellig.length,
      faelligZeilen.map((t) => zeile(esc(t.title), '', `<span style="color:${FARBE.rot}">${esc(t.due.slice(8, 10))}.${esc(t.due.slice(5, 7))}.</span>`)).join('') + nochMehr(faellig.length - faelligZeilen.length)) : '',
  ].join('');

  const leer = !fragen.length && !abnicken.length && !entwuerfe.length;
  const kurz = stuecke.length ? `Heute: ${stuecke.join(', ')}.` : 'Heute liegt nichts zur Abstimmung an.';
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(betreff)}</title></head>`
    + `<body style="margin:0;padding:0;background:${FARBE.grund}"><div style="display:none;max-height:0;overflow:hidden">${esc(kurz)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${FARBE.grund}" style="background:${FARBE.grund}"><tr><td align="center" style="padding:24px 12px 32px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${FARBE.flaeche}" style="max-width:560px;background:${FARBE.flaeche};border:1px solid ${FARBE.linie};border-top:3px solid ${akzent};border-radius:10px"><tr><td style="padding:22px 24px 28px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">`
    + `<tr><td style="font:600 14px/1 ${SCHRIFT};color:${FARBE.schrift}">social<span style="color:${FARBE.gruen}">2</span>scale</td></tr>`
    + `<tr><td style="padding:26px 0 0;font:400 30px/1.15 Georgia,'Times New Roman',serif;color:${FARBE.schrift}">${esc(gruss)}</td></tr>`
    + `<tr><td style="padding:8px 0 0;font:400 16px/1.45 ${SCHRIFT};color:${FARBE.leise}">${esc(kurz)}</td></tr>`
    + inhalt
    + (satz ? `<tr><td style="padding:22px 0 0;font:400 14px/1.5 ${SCHRIFT};color:${FARBE.gelb}">${esc(satz)}</td></tr>` : '')
    + `<tr><td style="padding:26px 0 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${FARBE.gruen}" style="border-radius:9px"><a href="${CRM}" style="display:inline-block;padding:13px 22px;font:600 15px/1 ${SCHRIFT};color:${FARBE.tiefschrift};text-decoration:none">${leer ? 'CRM öffnen' : 'Im CRM erledigen'}</a></td></tr></table></td></tr>`
    + `</table></td></tr></table>`
    + `<div style="max-width:560px;padding:14px 8px 0;font:400 12px/1.5 ${SCHRIFT};color:${FARBE.leise}">Kommt morgens um 8:30, wenn etwas ansteht. Abgestimmt wird im CRM.</div>`
    + `</td></tr></table></body></html>`;
  return { subject: betreff, htmlContent: html };
}

// Entwürfe und Fristen sind Beiwerk: Fehlt eins davon, geht die Mail trotzdem raus.
async function beiwerkLesen(env, tag) {
  try {
    const entwuerfe = await env.DB.prepare(`SELECT titel FROM nachrichten WHERE status = 'entwurf' ORDER BY created_at DESC, id DESC`).all();
    const faellig = await env.DB.prepare(`SELECT title, owner, due FROM tickets WHERE status != 'erledigt' AND due IS NOT NULL AND due != '' AND due <= ? ORDER BY due, id`).bind(tag).all();
    return { entwuerfe: entwuerfe.results || [], faellig: faellig.results || [] };
  } catch (err) {
    console.error('[abstimmung-mail] Beiwerk fehlt', err);
    return {};
  }
}

export async function abstimmungMail(env, jetzt = new Date(), versand = send) {
  try {
    const { tag, uhr } = berlinJetzt(jetzt);
    if (uhr < AB || uhr >= BIS) return 'nicht jetzt';
    const { results } = await env.DB.prepare(
      `SELECT titel, wer, stufe, empfehlung, antwort_sebi, antwort_phil FROM abstimmung WHERE status = 'offen' AND (wieder_am IS NULL OR wieder_am <= ?) ORDER BY created_at, id`,
    ).bind(tag).all();
    const wache = await env.DB.prepare(`SELECT am FROM abstimmung_stand WHERE schluessel = 'wache_zuletzt'`).first();
    const satz = wacheSatz(wache && wache.am, jetzt);
    const punkte = results || [];
    // Nichts anzustehen und die Wache lebt: keine Mail, sonst lernt man, sie zu überlesen
    if (!punkte.length && !satz) return 'nichts an';
    const empfaenger = String(env.NOTIFY_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!empfaenger.length) return 'keine Empfänger';
    const extra = await beiwerkLesen(env, tag);
    let gesendet = 0;
    // Je Empfänger gemerkt: scheitert eine Adresse, bekommt die andere beim nächsten Lauf keine zweite Mail
    for (const an of empfaenger) {
      const merk = `mail:${tag}:${an}`;
      if (await env.DB.prepare('SELECT 1 FROM abstimmung_stand WHERE schluessel = ?').bind(merk).first()) continue;
      const ich = personVon(an);
      const fuerMich = fuerPerson(punkte, ich);
      // Liegt bei dieser Person nichts an, bleibt ihr Postfach leer, sonst lernt man, die Mail zu überlesen.
      if (!fuerMich.fragen.length && !fuerMich.abnicken.length && !satz) continue;
      if (!await versand(env, an, an, mailBauen(punkte, satz, ich, extra), 'social2scale')) continue;
      await env.DB.prepare('INSERT OR IGNORE INTO abstimmung_stand (schluessel, wert) VALUES (?, ?)').bind(merk, String(punkte.length)).run();
      gesendet += 1;
    }
    return `gesendet ${gesendet}`;
  } catch (err) {
    console.error('[abstimmung-mail]', err);
    return 'fehler';
  }
}
