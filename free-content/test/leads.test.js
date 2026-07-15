import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { upsertLead, findByToken, confirmLead, cleanupExpired } from '../src/leads.js';
import { validateSubmission } from '../src/validate.js';
// Kein readFileSync: dieser Test laeuft in workerd, nicht in Node — node:fs ist
// dort gestubbt und wirft immer. Vites '?raw' inlined die Datei beim Build.
import SCHEMA from './schema.sql?raw';

const BASE = {
  name: 'Sebi',
  email: 'sebi@gmail.com',
  handle: '@sebi.wimmer',
  branche: 'Fitness',
  ziel: 'Mehr Anfragen',
  stimmung: 'ruhig',
  farbe: '',
  consent: true,
  source: 'test',
};

function clean(over = {}) {
  const r = validateSubmission({ ...BASE, ...over });
  if (!r.ok) throw new Error('Fixture ungueltig: ' + r.error);
  return r.value;
}

const NOW = new Date('2026-07-15T12:00:00Z');

beforeEach(async () => {
  await env.DB.exec('DROP TABLE IF EXISTS free_leads');
  // '--'-Kommentare MUESSEN vor dem \s+-Collapse raus: sonst schluckt der zu
  // Leerzeichen plattgedrueckte Zeilenumbruch das folgende Statement mit.
  const noComments = SCHEMA.replace(/^--.*$/gm, '');
  for (const stmt of noComments.split(';').map((s) => s.trim()).filter(Boolean)) {
    await env.DB.exec(stmt.replace(/\s+/g, ' '));
  }
});

describe('upsertLead', () => {
  it('legt einen neuen Lead an und will die Bestaetigungsmail', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(r.action).toBe('created');
    expect(r.mail).toBe('confirm');
    expect(r.lead.status).toBe('pending');
    expect(r.lead.token).toBeTruthy();
  });

  it('legt bei Gmail-Varianten KEINE zweite Zeile an', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean({ email: 'S.E.B.I@gmail.com' }), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean({ email: 'sebi+neu@gmail.com' }), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean({ email: 'se.bi+x@googlemail.com' }), '1.1.1.1', NOW);

    const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
    expect(results.length).toBe(1);
  });

  it('schickt bei gueltigem Token denselben Link erneut', async () => {
    const first = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', new Date('2026-07-15T12:05:00Z'));
    expect(again.action).toBe('resent');
    expect(again.mail).toBe('confirm');
    expect(again.lead.token).toBe(first.lead.token);
  });

  it('erneuert einen abgelaufenen Token statt auszusperren', async () => {
    const first = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const spaeter = new Date('2026-07-17T12:00:00Z'); // > 24 h
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', spaeter);
    expect(again.action).toBe('renewed');
    expect(again.mail).toBe('confirm');
    expect(again.lead.token).not.toBe(first.lead.token);
  });

  it('deckelt Resends bei 3 pro Stunde (Anti-Mailbombing)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);            // created  -> 1
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);            // resent   -> 2
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);            // resent   -> 3
    const vierter = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(vierter.action).toBe('throttled');
    expect(vierter.mail).toBe('none');
  });

  it('erlaubt Resends nach Ablauf der Stunde wieder', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const spaeter = new Date('2026-07-15T13:30:00Z'); // > 1 h
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', spaeter);
    expect(r.action).toBe('resent');
    expect(r.mail).toBe('confirm');
  });

  it('schickt bei fertigem Lead den Ergebnis-Link', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await env.DB.prepare("UPDATE free_leads SET status='ready' WHERE id=?").bind(r.lead.id).run();
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(again.action).toBe('ready');
    expect(again.mail).toBe('result');
  });

  it('erlaubt nach einem Fehlschlag einen neuen Versuch', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await env.DB.prepare("UPDATE free_leads SET status='failed' WHERE id=?").bind(r.lead.id).run();
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(again.action).toBe('retry');
    expect(again.lead.status).toBe('pending');
    expect(again.mail).toBe('confirm');
  });

  it('sperrt einen bereits bestaetigten Handle fuer andere Mails', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await confirmLead(env.DB, r.lead.token, NOW);
    const fremd = await upsertLead(env.DB, clean({ email: 'wer.anders@firma.de' }), '2.2.2.2', NOW);
    expect(fremd.action).toBe('handle_taken');
    expect(fremd.mail).toBe('none');
  });

  it('blockiert einen NICHT bestaetigten Handle nicht (kein Griefing)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);  // bleibt pending
    const fremd = await upsertLead(env.DB, clean({ email: 'wer.anders@firma.de' }), '2.2.2.2', NOW);
    expect(fremd.action).toBe('created');
    expect(fremd.mail).toBe('confirm');
  });

  it('aktualisiert die Angaben beim Wiedereintritt', async () => {
    await upsertLead(env.DB, clean({ branche: 'Alt' }), '1.1.1.1', NOW);
    const r = await upsertLead(env.DB, clean({ branche: 'Neu' }), '1.1.1.1', NOW);
    expect(r.lead.branche).toBe('Neu');
  });
});

describe('confirmLead', () => {
  it('bestaetigt einen gueltigen Token genau einmal', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const first = await confirmLead(env.DB, r.lead.token, NOW);
    expect(first.ok).toBe(true);
    expect(first.lead.status).toBe('confirmed');

    const second = await confirmLead(env.DB, r.lead.token, NOW);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('used');
  });

  it('lehnt einen abgelaufenen Token ab', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const zuSpaet = new Date('2026-07-17T12:00:00Z');
    const res = await confirmLead(env.DB, r.lead.token, zuSpaet);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('expired');
  });

  it('lehnt einen unbekannten Token ab', async () => {
    const res = await confirmLead(env.DB, 'gibtsnicht', NOW);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not_found');
  });
});

describe('cleanupExpired', () => {
  it('loescht unbestaetigte Leads nach 30 Tagen (DSGVO)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const weit = new Date('2026-08-20T12:00:00Z'); // > 30 Tage
    const geloescht = await cleanupExpired(env.DB, weit);
    expect(geloescht).toBe(1);
  });

  it('loescht bestaetigte Leads NICHT', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await confirmLead(env.DB, r.lead.token, NOW);
    const weit = new Date('2026-08-20T12:00:00Z');
    expect(await cleanupExpired(env.DB, weit)).toBe(0);
  });
});
