import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SCHEMA from './schema.sql?raw';
import { splitSchema } from './helpers.js';
import { generateFor, buildStatus } from '../src/generate.js';
import { upsertLead, confirmLead, findByToken } from '../src/leads.js';
import { validateSubmission } from '../src/validate.js';

const BASE = {
  name: 'Dorothea', email: 'do@gmail.com', handle: '@praxisfunke',
  branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen', stimmung: 'ruhig', consent: true,
};
const clean = () => validateSubmission(BASE).value;

async function bestaetigterLead() {
  const { lead } = await upsertLead(env.DB, clean(), '1.1.1.1');
  await confirmLead(env.DB, lead.token);
  return lead.token;
}

beforeEach(async () => {
  for (const t of ['free_leads', 'free_intake_log']) await env.DB.exec(`DROP TABLE IF EXISTS ${t}`);
  for (const s of splitSchema(SCHEMA)) await env.DB.exec(s);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('generateFor', () => {
  it('lehnt einen unbekannten Token ab, ohne zu werfen', async () => {
    const r = await generateFor(env, 'gibtsnicht');
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('not_found');
  });

  it('generiert nicht fuer einen unbestaetigten Lead', async () => {
    const { lead } = await upsertLead(env.DB, clean(), '1.1.1.1');
    const r = await generateFor(env, lead.token);
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('not_confirmed');
  });

  it('laeuft genau EINMAL — generated_at ist der Riegel', async () => {
    const token = await bestaetigterLead();
    await env.DB.prepare("UPDATE free_leads SET generated_at = datetime('now'), status='ready'").run();
    const r = await generateFor(env, token);
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('bereits_erzeugt');
  });

  it('serialisiert zwei GLEICHZEITIGE Aufrufe — nur EINER kommt durch den Riegel', async () => {
    // Der echte Riegel-Test: nicht sequenziell vorgesetzt, sondern zwei parallele
    // Invocationen fuer denselben bestaetigten Lead. Der frueher hier stehende Read
    // ("if generated_at") ist ein TOCTOU-Race: beide lesen NULL, beide bauen. Der
    // atomare Claim (UPDATE ... WHERE generated_at IS NULL) laesst genau EINEN
    // durch. Beide scheitern am Ende am Render (kein BROWSER im Test) — bewiesen
    // wird aber die CLAIM-Schicht: genau einer prallt mit 'bereits_erzeugt' ab.
    const token = await bestaetigterLead();
    const [a, b] = await Promise.all([generateFor(env, token), generateFor(env, token)]);
    const gruende = [a.grund, b.grund];
    expect(gruende.filter((g) => g === 'bereits_erzeugt')).toHaveLength(1);   // genau einer am Riegel
    expect(gruende.filter((g) => g !== 'bereits_erzeugt')).toHaveLength(1);   // genau einer kam durch
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it('lehnt Themen ab, die unser Logo nicht tragen darf', async () => {
    const { lead } = await upsertLead(env.DB, { ...clean(), ziel: 'heilt Krebs in 4 Wochen' }, '1.1.1.1');
    await confirmLead(env.DB, lead.token);
    const r = await generateFor(env, lead.token);
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('moderation');
    const nach = await findByToken(env.DB, lead.token);
    expect(nach.status).toBe('failed');   // Sackgasse verboten: Status ist ehrlich
  });

  it('alarmiert die Founder bei JEDER Ablehnung — sonst ist der Filter Leadvernichtung', async () => {
    // Der Wortfilter ist bewusst streng (er kann `Drogen-Praevention` nicht von
    // `Drogen-Verkauf` trennen). Das ist NUR vertretbar, weil ein Mensch jede
    // Ablehnung sieht. Faellt der Alarm weg, verschwinden zu Unrecht Abgelehnte
    // lautlos — und niemand erfaehrt es je.
    const { lead } = await upsertLead(env.DB, { ...clean(), ziel: 'heilt Krebs in 4 Wochen' }, '1.1.1.1');
    await confirmLead(env.DB, lead.token);

    const f = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', f);
    await generateFor(
      { ...env, BREVO_API_KEY: 'test-key', NOTIFY_TO: 'info@social2scale.com', NOTIFY_FROM: 'info@social2scale.com' },
      lead.token
    );

    const alarm = f.mock.calls.some((c) => String(c[1]?.body || '').includes('ABGELEHNT'));
    expect(alarm).toBe(true);
  });

  it('setzt bei einem Render-Fehler auf failed statt stillschweigend zu haengen', async () => {
    const token = await bestaetigterLead();
    // Kein BROWSER-Binding im Test -> renderAll wirft.
    const r = await generateFor(env, token);
    expect(r.ok).toBe(false);
    const nach = await findByToken(env.DB, token);
    expect(nach.status).toBe('failed');
  });

  it('gibt beim Rendern nicht nach dem ersten Versuch auf (Spec §9)', async () => {
    // Browser Rendering hat eine Session-Grenze: bei Andrang scheitert Versuch 1
    // und Versuch 2 klappt. Ohne Retry verliert sie ihre Bilder, weil zufaellig
    // jemand anders gleichzeitig da war.
    const token = await bestaetigterLead();
    const fehler = vi.spyOn(console, 'error');
    await generateFor(env, token);
    const renderVersuche = fehler.mock.calls.filter((c) =>
      String(c[0]).includes('Render-Versuch')
    );
    expect(renderVersuche.length).toBeGreaterThanOrEqual(2);
  });

  it('alarmiert die Founder, wenn sie endgueltig nichts bekommt', async () => {
    // Sie hat bestaetigt und geht leer aus. Erfahren WIR das nicht, erfaehrt es
    // niemand — sie meldet sich nicht, sie hoert auf.
    const token = await bestaetigterLead();
    const f = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', f);

    // notifyFounders schickt ohne Key gar nichts — der Test braucht ihn, sonst
    // prueft er nur, dass nichts passiert.
    await generateFor(
      { ...env, BREVO_API_KEY: 'test-key', NOTIFY_TO: 'info@social2scale.com', NOTIFY_FROM: 'info@social2scale.com' },
      token
    );

    const anAlarm = f.mock.calls.some((c) =>
      String(c[1]?.body || '').includes('FEHLGESCHLAGEN')
    );
    expect(anAlarm).toBe(true);
  });
});

describe('buildStatus', () => {
  it('meldet unbekannte Token als not_found', async () => {
    expect((await buildStatus(env, 'gibtsnicht')).state).toBe('not_found');
  });

  it('meldet den echten Stand eines bestaetigten Leads', async () => {
    const token = await bestaetigterLead();
    const s = await buildStatus(env, token);
    expect(s.state).toBe('confirmed');
    expect(s.total).toBe(8);
    expect(s.done).toBe(0);
    expect(typeof s.step).toBe('string');
  });

  it('zaehlt done aus den TATSAECHLICH in R2 liegenden Bildern', async () => {
    const token = await bestaetigterLead();
    await env.IMAGES.put(`free/${token}/f-0-profil.jpg`, 'x');
    await env.IMAGES.put(`free/${token}/f-0-s1.jpg`, 'x');
    const s = await buildStatus(env, token);
    expect(s.done).toBe(2);   // echt gezaehlt, nicht geschaetzt
  });

  it('liefert bei ready die Bild-Keys mit', async () => {
    const token = await bestaetigterLead();
    await env.DB.prepare("UPDATE free_leads SET status='ready', generated_at=datetime('now')").run();
    await env.IMAGES.put(`free/${token}/f-0-profil.jpg`, 'x');
    const s = await buildStatus(env, token);
    expect(s.state).toBe('ready');
    expect(Array.isArray(s.images)).toBe(true);
    expect(s.images.length).toBeGreaterThan(0);
  });
});
