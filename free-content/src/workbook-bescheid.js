/**
 * „Dein Workbook ist fertig“ — Mail an die Kundin, wenn ein Workbook fertig ist oder nicht gebaut werden konnte
 * (Sebi 11.11.2026: „mach Mail fertig wie beim Reel halt, angepasst auf Workbook“).
 *
 * Gleicher Weg wie reel-bescheid.js: die Workbook-Wache läuft auf Sebis Mac und hat keinen Mail-Schlüssel. Dieser Cron sieht in
 * D1 (workbook_auftrag, Portal v72/v74), was seit dem letzten Lauf fertig oder rot geworden ist, schickt EINE Mail je Kundin und
 * merkt es sich (bescheid_am) — nie doppelt. Absender social2scale (Systemmail). Abschaltbar je Kundin mit demselben Haken wie
 * die Reel-Mails (clients.reel_bescheid: „Mails, wenn etwas fertig ist“).
 * Der rohe Fehlertext der Wache geht NIE in die Mail (er nennt Interna). Bei einem Einspruch gegen ihre Eingabe steht ein fester
 * Satz darin; den genauen Grund liest sie im Hub.
 * Testkonten ([TEST in den Notizen) bekommen die Mail nur an eigene Adressen, Kundinnen ohne gültige Mail werden abgehakt.
 * Scheitert der Versand, bleibt es offen und der nächste Lauf versucht es wieder. WIRFT NIE.
 */
import { send } from './mail.js';
import { workbookMailHtml, MAIL_FARBEN } from './pages/confirm-email.js';

export const ABSENDER = 'social2scale';
const HUB = 'https://mein.social2scale.com';
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EIGENE_DOMAINS = ['vegetarianhulk.de', 'social2scale.com'];
const eigeneAdresse = (mail) => EIGENE_DOMAINS.includes(mail.split('@').pop().toLowerCase());

const esc = (v) => String(v ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const vorname = (n) => String(n ?? '').trim().split(/\s+/)[0] || '';

// Über dem Heft steht im Hub der Titel aus dem geprüften Aufbau, nicht ihre rohe Eingabe. Dasselbe gilt für die Mail.
export function heftTitel(r) {
  try {
    const t = JSON.parse(r.gliederung || '{}').titel;
    if (typeof t === 'string' && t.trim()) return t.trim().slice(0, 140);
  } catch { /* kaputte Gliederung: ihr Thema */ }
  return String(r.thema ?? '').slice(0, 140);
}

export function rotSatz(r) {
  return /^einspruch:/.test(String(r.fehler ?? ''))
    ? 'So, wie es formuliert war, bauen wir es nicht. In deinem Social Hub steht, warum, und du kannst es dort neu formulieren.'
    : 'Das hat nicht geklappt. Wir sehen es uns an und melden uns.';
}

export async function offene(db) {
  const { results } = await db.prepare(`SELECT a.code, a.client_id, a.thema, a.gliederung, a.status, a.fehler, c.name, c.email, c.slug, c.notes
      FROM workbook_auftrag a JOIN clients c ON c.id = a.client_id
      WHERE a.status IN ('fertig', 'fehler') AND a.bescheid_am IS NULL AND c.workbook_enabled = 1 AND COALESCE(c.reel_bescheid, 1) = 1`).all();
  return results ?? [];
}

export function mailBauen(kundin, hefte) {
  const fertig = hefte.filter((r) => r.status === 'fertig');
  const rot = hefte.filter((r) => r.status === 'fehler');
  const link = `${HUB}/${encodeURIComponent(kundin.slug)}-kit/workbook/`;
  const betreff = rot.length && !fertig.length ? 'Zu deinem Workbook gibt es eine Rückmeldung'
    : fertig.length > 1 ? 'Deine Workbooks sind fertig' : 'Dein Workbook ist fertig';
  const fett = (x) => `<strong style="color:${MAIL_FARBEN.PAPER};">„${esc(x)}“</strong>`;
  const zeilen = [
    ...fertig.map((r) => `<p style="margin:0 0 10px;">${fett(heftTitel(r))} liegt fertig in deinem Social Hub, als Blätter zum Ansehen und als PDF.</p>`),
    ...rot.map((r) => `<p style="margin:0 0 10px;">${fett(String(r.thema ?? '').slice(0, 140))}: ${esc(rotSatz(r))}</p>`),
  ];
  const satz = fertig.length ? '<p style="margin:16px 0 0;">Schau es dir an. Was du am Aufbau geändert hast, merken wir uns für dein nächstes Workbook.</p>' : '';
  const html = workbookMailHtml(`Hallo ${esc(vorname(kundin.name)) || 'du'},`, zeilen.join('') + satz, esc(link));
  return { subject: betreff, htmlContent: html };
}

export async function workbookBescheid(env, versand = send) {
  try {
    const liste = await offene(env.DB);
    let gesendet = 0;
    const je = new Map();
    for (const r of liste) je.set(r.client_id, [...(je.get(r.client_id) ?? []), r]);
    for (const hefte of je.values()) {
      const k = hefte[0];
      const test = /^\s*\[TEST\b/i.test(String(k.notes ?? ''));
      const email = String(k.email ?? '').trim();
      let ok = true;
      if (MAIL.test(email) && (!test || eigeneAdresse(email))) {
        ok = await versand(env, email, k.name, mailBauen(k, hefte), ABSENDER);
        if (ok) gesendet += 1;
      }
      if (ok) {   // abhaken: gesendet, Testkonto oder ohne gültige Mail — sonst stünden sie in jedem Lauf wieder an
        for (const r of hefte) {
          await env.DB.prepare(`UPDATE workbook_auftrag SET bescheid_am = datetime('now') WHERE client_id = ? AND code = ?`).bind(r.client_id, r.code).run();
        }
      }
    }
    // Abgeschaltete Mails oder nicht (mehr) freigeschaltet: still abhaken — schaltet sie später wieder an, kommt nichts Altes nach
    await env.DB.prepare(`UPDATE workbook_auftrag SET bescheid_am = datetime('now') WHERE bescheid_am IS NULL AND status IN ('fertig', 'fehler')
      AND client_id IN (SELECT id FROM clients WHERE COALESCE(reel_bescheid, 1) = 0 OR workbook_enabled = 0)`).run();
    return liste.length ? `gesendet ${gesendet}` : 'ruhig';
  } catch (err) {
    console.error('[cron] Workbook-Bescheid fehlgeschlagen:', err);
    return 'fehler';
  }
}
