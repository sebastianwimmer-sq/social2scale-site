/**
 * „Dein Reel ist fertig“ — Mail an die Kundin, wenn ein Reel fertig ist oder nicht gebaut werden konnte
 * (Fahrplan Phase 6, Sebi 15.10.2026: „Automatische Mail“).
 *
 * Die Reel-Wache läuft auf Sebis Mac und hat keinen Mail-Schlüssel (soll sie auch nicht). Dieser 5-Minuten-Cron sieht in D1,
 * welche Reels seit dem letzten Lauf fertig oder rot geworden sind, schickt EINE Mail je Kundin und merkt es sich
 * (bescheid_am, v56) — nie doppelt. Absender social2scale: Systemmail, keine persönliche Nachricht (Sebi 15.10.: „is ja eig eher
 * allgemein“) — Phil schreibt die echten Nachrichten. Abschaltbar je Kundin (clients.reel_bescheid).
 * Testkonten ([TEST] in den Notizen) mit fremder Adresse und Kundinnen ohne gültige Mail werden abgehakt, ohne Mail — sonst stünden
 * sie jeden Lauf an. Ein Testkonto mit eigener Adresse (EIGENE_DOMAINS) bekommt sie, damit wir sehen, was die Kundin sieht.
 * Scheitert der Versand, bleibt es offen und der nächste Lauf versucht es wieder.
 * WIRFT NIE (ein Fehler hier darf den Funnel-Cron nicht stoppen).
 */
import { send } from './mail.js';
import { reelMailHtml, MAIL_FARBEN } from './pages/confirm-email.js';

export const ABSENDER = 'social2scale';
const HUB = 'https://mein.social2scale.com';
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Testkonten bekommen die Mail nur an eigene Adressen (Sebi 15.10.: „mail an mein konto bitte auch schicken“) — nie Testpost nach außen
const EIGENE_DOMAINS = ['vegetarianhulk.de', 'social2scale.com'];
const eigeneAdresse = (mail) => EIGENE_DOMAINS.includes(mail.split('@').pop().toLowerCase());

const esc = (v) => String(v ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const vorname = (n) => String(n ?? '').trim().split(/\s+/)[0] || '';

export async function offene(db) {
  const sql = `SELECT 'reel_auftrag' AS tab, a.code, a.client_id, a.thema AS titel, a.status, a.fehler, c.name, c.email, c.slug, c.notes
      FROM reel_auftrag a JOIN clients c ON c.id = a.client_id
      WHERE a.status IN ('fertig', 'fehler') AND a.bescheid_am IS NULL AND c.reels_enabled = 1 AND COALESCE(c.reel_bescheid, 1) = 1
    UNION ALL
    SELECT 'reel_upload', u.code, u.client_id, COALESCE(NULLIF(u.satz, ''), 'aus deinem Clip'), u.status, u.fehler, c.name, c.email, c.slug, c.notes
      FROM reel_upload u JOIN clients c ON c.id = u.client_id
      WHERE u.status IN ('fertig', 'fehler') AND u.bescheid_am IS NULL AND u.teil_nr = 1 AND c.reels_enabled = 1
      AND COALESCE(c.reel_bescheid, 1) = 1`;
  const { results } = await db.prepare(sql).all();
  return results ?? [];
}

export function mailBauen(kundin, reels) {
  const fertig = reels.filter((r) => r.status === 'fertig');
  const rot = reels.filter((r) => r.status === 'fehler');
  const link = `${HUB}/${encodeURIComponent(kundin.slug)}-kit/hub/`;
  const betreff = rot.length && !fertig.length ? 'Zu deinem Reel gibt es eine Rückmeldung'
    : fertig.length > 1 ? 'Deine Reels sind fertig' : 'Dein Reel ist fertig';
  const fett = (x) => `<strong style="color:${MAIL_FARBEN.PAPER};">„${esc(x)}“</strong>`;
  const zeilen = [
    ...fertig.map((r) => `<p style="margin:0 0 10px;">${fett(r.titel)} liegt fertig in deinem Social Hub.</p>`),
    ...rot.map((r) => `<p style="margin:0 0 10px;">${fett(r.titel)}: ${esc(r.fehler || 'Wir sehen es uns an und melden uns.')}</p>`),
  ];
  const satz = fertig.length ? '<p style="margin:16px 0 0;">Schau es dir an und sag mit einem Tipp, ob es passt. Was du änderst, gilt auch für jedes nächste Reel.</p>' : '';
  const html = reelMailHtml(`Hallo ${esc(vorname(kundin.name)) || 'du'},`, zeilen.join('') + satz, esc(link));
  return { subject: betreff, htmlContent: html };
}

export async function reelBescheid(env, versand = send) {
  try {
    const liste = await offene(env.DB);
    if (!liste.length) return 'ruhig';
    const je = new Map();
    for (const r of liste) je.set(r.client_id, [...(je.get(r.client_id) ?? []), r]);
    let gesendet = 0;
    for (const reels of je.values()) {
      const k = reels[0];
      const test = /^\s*\[TEST\b/i.test(String(k.notes ?? ''));
      const email = String(k.email ?? '').trim();
      let ok = true;
      if (MAIL.test(email) && (!test || eigeneAdresse(email))) {
        ok = await versand(env, email, k.name, mailBauen(k, reels), ABSENDER);
        if (ok) gesendet += 1;
      }
      if (ok) {   // abhaken: gesendet, Testkonto oder ohne gültige Mail — sonst stünden sie in jedem Lauf wieder an
        for (const r of reels) {
          await env.DB.prepare(`UPDATE ${r.tab === 'reel_upload' ? 'reel_upload' : 'reel_auftrag'} SET bescheid_am = datetime('now') WHERE client_id = ? AND code = ?`)
            .bind(r.client_id, r.code).run();
        }
      }
    }
    // Kundinnen mit abgeschalteten Mails: still abhaken — schaltet sie später wieder an, kommen keine alten Reels nach
    for (const tab of ['reel_auftrag', 'reel_upload']) {
      await env.DB.prepare(`UPDATE ${tab} SET bescheid_am = datetime('now') WHERE bescheid_am IS NULL AND status IN ('fertig', 'fehler')
        AND client_id IN (SELECT id FROM clients WHERE COALESCE(reel_bescheid, 1) = 0)`).run();
    }
    return `gesendet ${gesendet}`;
  } catch (err) {
    console.error('[cron] Reel-Bescheid fehlgeschlagen:', err);
    return 'fehler';
  }
}
