import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import SCHEMA_SQL from './schema.sql?raw';
import { resetTables } from './helpers.js';

const TABELLEN = ['free_leads', 'free_intake_log'];

const GUELTIG = {
  name: 'Sebi',
  email: 'sebi@gmail.com',
  handle: '@sebi.wimmer',
  branche: 'Fitness',
  ziel: 'Mehr Anfragen',
  stimmung: 'ruhig',
  consent: true,
  elapsed: 9000,
  website: '',
  turnstile: 'TESTTOKEN',
};

async function post(body, ip = '9.9.9.9') {
  return SELF.fetch('https://start.social2scale.com/api/free-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  });
}

async function zeilen() {
  const { results } = await env.DB.prepare('SELECT * FROM free_leads').all();
  return results;
}

describe('health', () => {
  it('antwortet mit ok', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('POST /api/free-content', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, TABELLEN);
  });

  it('nimmt eine gueltige Eingabe an und legt genau eine Zeile an', async () => {
    const res = await post(GUELTIG);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect((await zeilen()).length).toBe(1);
  });

  it('verwirft Honeypot-Treffer still und legt NICHTS an', async () => {
    const res = await post({ ...GUELTIG, website: 'http://spam.example' });
    // Der Bot soll nicht merken, dass er aufgeflogen ist.
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect((await zeilen()).length).toBe(0);
  });

  it('verwirft zu schnelle Eingaben still und legt NICHTS an', async () => {
    const res = await post({ ...GUELTIG, elapsed: 200 });
    expect(res.status).toBe(200);
    expect((await zeilen()).length).toBe(0);
  });

  it('lehnt fehlende Einwilligung ab (DSGVO)', async () => {
    const res = await post({ ...GUELTIG, consent: false });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('consent');
    expect((await zeilen()).length).toBe(0);
  });

  it('lehnt Wegwerf-Mails ab', async () => {
    const res = await post({ ...GUELTIG, email: 'x@mailinator.com' });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('disposable');
  });

  it('lehnt kaputtes JSON ab', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/free-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{kaputt',
    });
    expect(res.status).toBe(400);
  });

  it('antwortet bei Duplikaten identisch — keine Enumeration', async () => {
    const a = await post(GUELTIG);
    const b = await post({ ...GUELTIG, email: 'S.E.B.I+neu@googlemail.com' });
    expect(b.status).toBe(a.status);
    expect(await b.json()).toEqual(await a.json());
    // Und trotzdem nur EINE Zeile: der Duplikat-Schutz haelt.
    expect((await zeilen()).length).toBe(1);
  });

  it('legt bei belegtem Handle nichts an, verraet es aber nicht', async () => {
    const erste = await post(GUELTIG);
    await env.DB.prepare(
      "UPDATE free_leads SET confirmed_at = datetime('now'), status = 'confirmed'"
    ).run();

    const fremd = await post({ ...GUELTIG, email: 'wer.anders@firma.de' }, '8.8.8.8');
    expect(fremd.status).toBe(erste.status);
    expect(await fremd.json()).toEqual(await erste.json());
    expect((await zeilen()).length).toBe(1);
  });

  it('lehnt andere Methoden als POST ab', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/free-content');
    expect(res.status).toBe(405);
  });

  it('beantwortet den CORS-Preflight', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/free-content', {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://social2scale.com');
  });

  it('setzt CORS-Header auch auf der echten Antwort', async () => {
    const res = await post(GUELTIG);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://social2scale.com');
  });

  it('antwortet mit 429, wenn der Rate-Limit greift', async () => {
    for (let i = 0; i < 5; i++) {
      await post({ ...GUELTIG, email: `n${i}@gmail.com`, handle: `@n${i}.x` }, '7.7.7.7');
    }
    const res = await post({ ...GUELTIG, email: 'zuviel@gmail.com', handle: '@zu.viel' }, '7.7.7.7');
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('rate_limited');
  });

  it('kennt unbekannte Pfade nicht', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/gibtsnicht');
    expect(res.status).toBe(404);
  });
});
