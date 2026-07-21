import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { upsertLead, findByToken, confirmLead, cleanupExpired, sweepStaleBuilding } from '../src/leads.js';
import { BUILDING_TIMEOUT_MINUTES } from '../src/constants.js';
import { validateSubmission } from '../src/validate.js';
// Kein readFileSync: dieser Test laeuft in workerd, nicht in Node — node:fs ist
// dort gestubbt und wirft immer. Vites '?raw' inlined die Datei beim Build.
import SCHEMA from './schema.sql?raw';
import { splitSchema } from './helpers.js';

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

  // Reachable-Bug-Regression: ein moderation-Reject darf einen NEUEN Versuch
  // nicht vorbelasten. Ohne Reset traegt die Zeile fail_reason='moderation' in
  // den naechsten Build hinein — stirbt der Worker diesmal an Infra statt an
  // Moderation, zeigt sweepStaleBuilding() faelschlich die alte, nicht-retrybare
  // Moderation-Meldung statt der echten (retrybaren) Infra-Absage.
  it('setzt fail_reason beim Wiedereintritt nach Moderation-Reject zurueck', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await env.DB
      .prepare("UPDATE free_leads SET status='failed', fail_reason='moderation' WHERE id=?")
      .bind(r.lead.id)
      .run();

    const again = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(again.action).toBe('retry');
    expect(again.lead.fail_reason).toBe('');
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

  it('schickt bei laufendem Build den Link zur Build-Seite', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await env.DB.prepare("UPDATE free_leads SET status='building' WHERE id=?").bind(r.lead.id).run();
    const again = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(again.action).toBe('building');
    expect(again.mail).toBe('result');
  });

  it('faengt das INSERT-Rennen ab und liefert resent statt einer 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await upsertLead(env.DB, clean(), '1.1.1.1', NOW);

      // Der erste Lookup luegt EINMAL und meldet "nicht da" — exakt das Fenster,
      // das zwei parallele Anfragen sehen. Alles andere laeuft gegen die echte DB,
      // der INSERT rennt also wirklich in den UNIQUE-Index.
      let gelogen = false;
      const racingDb = {
        prepare(sql) {
          if (!gelogen && sql.includes('SELECT * FROM free_leads WHERE email_norm')) {
            gelogen = true;
            return { bind: () => ({ first: async () => null }) };
          }
          return env.DB.prepare(sql);
        },
      };

      const r = await upsertLead(racingDb, clean(), '1.1.1.1', NOW);
      expect(r.action).toBe('resent');
      expect(r.mail).toBe('confirm');

      const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
      expect(results.length).toBe(1);
      // Fehler wird nie verschluckt.
      expect(spy.mock.calls.flat().join(' ')).toMatch(/INSERT-Rennen/);
    } finally {
      spy.mockRestore();
    }
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

  it('laesst den Zweiten am selben Handle sauber auflaufen statt zu werfen', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // Beide pending mit demselben Handle — laut Spec erlaubt (kein Griefing).
      const a = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
      const b = await upsertLead(env.DB, clean({ email: 'zwei@firma.de' }), '2.2.2.2', NOW);
      expect(b.action).toBe('created');

      expect((await confirmLead(env.DB, a.lead.token, NOW)).ok).toBe(true);

      // Der Zweite klickt einen ECHTEN Link: geordnete Absage, keine Exception.
      const res = await confirmLead(env.DB, b.lead.token, NOW);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('handle_taken');
      expect(spy.mock.calls.flat().join(' ')).toMatch(/Handle/);
    } finally {
      spy.mockRestore();
    }
  });
});

// Diese Tests gehen absichtlich AM App-Code VORBEI und schreiben roh in die DB.
// Sie sichern die DDL selbst ab: die Indizes sind das letzte Netz, falls die
// Anwendungslogik je umgebaut wird. Fallen sie um, ist das Schema kaputt —
// die 16 Verhaltenstests oben wuerden das NICHT bemerken.
describe('DB-Backstop: die Indizes selbst', () => {
  it('weist eine zweite Zeile mit gleicher email_norm ab', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await expect(
      env.DB.prepare(
        `INSERT INTO free_leads (name, email, email_norm, token, token_expires)
         VALUES ('X','x@gmail.com','sebi@gmail.com','tok-backstop-1','2026-07-16 12:00:00')`
      ).run()
    ).rejects.toThrow(/UNIQUE constraint failed/i);
  });

  it('laesst denselben Handle auf PENDING-Zeilen zu (kein Griefing-Lock)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW); // pending, handle sebi.wimmer
    await env.DB.prepare(
      `INSERT INTO free_leads (name, email, email_norm, handle_norm, token, token_expires)
       VALUES ('A','a@x.de','a@x.de','sebi.wimmer','tok-backstop-2','2026-07-16 12:00:00')`
    ).run();
    const { results } = await env.DB
      .prepare("SELECT id FROM free_leads WHERE handle_norm = 'sebi.wimmer'").all();
    expect(results.length).toBe(2);
  });

  it('sperrt denselben Handle, sobald eine Zeile bestaetigt ist', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await confirmLead(env.DB, r.lead.token, NOW);
    await expect(
      env.DB.prepare(
        `INSERT INTO free_leads (name, email, email_norm, handle_norm, token, token_expires, confirmed_at)
         VALUES ('B','b@x.de','b@x.de','sebi.wimmer','tok-backstop-3','2026-07-16 12:00:00','2026-07-15 12:00:00')`
      ).run()
    ).rejects.toThrow(/UNIQUE constraint failed/i);
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

// §9 Sackgasse: ein hart gekillter Worker (CPU-Limit/OOM) zwischen dem atomaren
// Claim (generate.js setzt status='building' + generated_at) und markiereFehler
// laesst eine Zeile fuer immer bei 'building' haengen. sweepStaleBuilding erkennt
// das ueber generated_at (vom Claim gesetzt, nur von markiereFehler geloescht —
// eine 'building'-Zeile traegt also immer den echten Claim-Zeitstempel) und macht
// sie retrybar, ohne pro Zeile zu alarmieren (sonst spammt ein Burst die Founder).
describe('sweepStaleBuilding', () => {
  async function alsBuilding(id, generatedAtIso) {
    await env.DB
      .prepare("UPDATE free_leads SET status='building', generated_at=? WHERE id=?")
      .bind(generatedAtIso, id)
      .run();
  }

  it('kippt eine haengengebliebene "building"-Zeile auf failed und gibt den Riegel frei', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const laengstTot = new Date(NOW.getTime() - (BUILDING_TIMEOUT_MINUTES + 5) * 60 * 1000);
    await alsBuilding(r.lead.id, laengstTot.toISOString().replace('T', ' ').slice(0, 19));

    const anzahl = await sweepStaleBuilding(env.DB, NOW);
    expect(anzahl).toBe(1);

    const lead = await findByToken(env.DB, r.lead.token);
    expect(lead.status).toBe('failed');
    expect(lead.generated_at).toBeNull();
  });

  // Reachable-Bug-Regression: eine gesweepte Zeile hat KEINE bekannte Ursache
  // (der Worker wurde hart gekillt) — eine stale fail_reason='moderation' aus
  // einem FRUEHEREN Versuch wuerde das Build-Screen faelschlich "kein Retry"
  // zeigen, obwohl der Sweep-Fall immer retrybar ist (reason:'render').
  it('setzt fail_reason einer gesweepten Zeile zurueck (kein stale moderation-Reject)', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await env.DB
      .prepare("UPDATE free_leads SET fail_reason='moderation' WHERE id=?")
      .bind(r.lead.id)
      .run();
    const laengstTot = new Date(NOW.getTime() - (BUILDING_TIMEOUT_MINUTES + 5) * 60 * 1000);
    await alsBuilding(r.lead.id, laengstTot.toISOString().replace('T', ' ').slice(0, 19));

    const anzahl = await sweepStaleBuilding(env.DB, NOW);
    expect(anzahl).toBe(1);

    const lead = await findByToken(env.DB, r.lead.token);
    expect(lead.status).toBe('failed');
    expect(lead.fail_reason).toBe('');
  });

  it('laesst eine gerade erst geclaimte "building"-Zeile in Ruhe (noch in Arbeit)', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    await alsBuilding(r.lead.id, NOW.toISOString().replace('T', ' ').slice(0, 19));

    const anzahl = await sweepStaleBuilding(env.DB, NOW);
    expect(anzahl).toBe(0);

    const lead = await findByToken(env.DB, r.lead.token);
    expect(lead.status).toBe('building');
    expect(lead.generated_at).not.toBeNull();
  });

  it('fasst eine fertige "ready"-Zeile nicht an', async () => {
    const r = await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    const laengstTot = new Date(NOW.getTime() - (BUILDING_TIMEOUT_MINUTES + 5) * 60 * 1000);
    await env.DB
      .prepare("UPDATE free_leads SET status='ready', generated_at=? WHERE id=?")
      .bind(laengstTot.toISOString().replace('T', ' ').slice(0, 19), r.lead.id)
      .run();

    expect(await sweepStaleBuilding(env.DB, NOW)).toBe(0);
    const lead = await findByToken(env.DB, r.lead.token);
    expect(lead.status).toBe('ready');
  });

  it('fasst eine "pending"-Zeile nicht an (kein generated_at, kein building)', async () => {
    await upsertLead(env.DB, clean(), '1.1.1.1', NOW);
    expect(await sweepStaleBuilding(env.DB, NOW)).toBe(0);
  });
});
