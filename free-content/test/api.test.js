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
    expect((await res.json()).ok).toBe(true);
  });

  it('meldet, ob die scharfen Schichten konfiguriert sind', async () => {
    // Ein vergessenes Secret darf nicht still bleiben — das Live-Gate prueft genau das.
    // Im Test sind beide Secrets bewusst nicht gesetzt, also muessen beide false sein.
    const body = await (await SELF.fetch('https://start.social2scale.com/api/health')).json();
    expect(body).toHaveProperty('turnstile');
    expect(body).toHaveProperty('mail');
    expect(body.turnstile).toBe(false);
    expect(body.mail).toBe(false);
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

describe('GET /c/:token — Bestaetigung', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, TABELLEN);
  });

  async function tokenAnlegen() {
    await post(GUELTIG);
    const row = await env.DB.prepare('SELECT token FROM free_leads').first();
    return row.token;
  }

  const hole = (token) =>
    SELF.fetch(`https://start.social2scale.com/c/${token}`, { redirect: 'manual' });

  it('bestaetigt und leitet auf die Ergebnisseite weiter', async () => {
    const token = await tokenAnlegen();
    const res = await hole(token);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(`/r/${token}`);

    const lead = await env.DB.prepare('SELECT * FROM free_leads WHERE token = ?').bind(token).first();
    expect(lead.status).toBe('confirmed');
    expect(lead.confirmed_at).toBeTruthy();
    expect(lead.token_used_at).toBeTruthy();
  });

  it('lehnt denselben Token beim zweiten Mal ab, ohne Sackgasse', async () => {
    const token = await tokenAnlegen();
    await hole(token);
    const zweiter = await hole(token);
    expect(zweiter.status).toBe(200);
    const html = await zweiter.text();
    expect(html).toContain('schon benutzt');
    // Spec §9: jede Fehlerseite bietet einen Ausweg.
    expect(html).toContain('/free-content/');
  });

  it('lehnt einen abgelaufenen Token ab und bietet einen neuen an', async () => {
    const token = await tokenAnlegen();
    await env.DB.prepare("UPDATE free_leads SET token_expires = '2020-01-01 00:00:00'").run();
    const res = await hole(token);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nicht mehr g');
    expect(html).toContain('/free-content/');
  });

  it('lehnt einen unbekannten Token ab', async () => {
    const res = await hole('gibtsnichtabc123');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('kennen wir nicht');
    expect(html).toContain('/free-content/');
  });

  it('zeigt eine echte Seite statt 500, wenn der Handle schon bestaetigt ist', async () => {
    // Zwei pending Leads duerfen denselben Handle haben (kein Griefing) — bestaetigt
    // aber nur einer. Der Zweite darf KEINEN 500 sehen.
    const ersterToken = await tokenAnlegen();
    await post({ ...GUELTIG, email: 'zweite@firma.de' }, '8.8.8.8');
    const zweiterToken = (
      await env.DB.prepare("SELECT token FROM free_leads WHERE email_norm = 'zweite@firma.de'").first()
    ).token;

    expect(await (await hole(ersterToken)).status).toBe(302);

    const res = await hole(zweiterToken);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Account');
    expect(html).not.toContain('Internal');
  });

  it('escaped nichts Fremdes in die Fehlerseite', async () => {
    const res = await hole('%3Cscript%3Ealert(1)%3C/script%3E');
    const html = await res.text();
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('liefert eine Platzhalter-Ergebnisseite unter /r/:token', async () => {
    const token = await tokenAnlegen();
    const res = await SELF.fetch(`https://start.social2scale.com/r/${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
  });
});

describe('GET /api/status/:token', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, TABELLEN);
  });

  it('meldet unbekannte Token, ohne zu kippen', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/status/gibtsnicht');
    expect(res.status).toBe(200);
    expect((await res.json()).state).toBe('not_found');
  });

  it('liefert den Stand mit echtem Zaehler', async () => {
    await post(GUELTIG);
    const { token } = await env.DB.prepare('SELECT token FROM free_leads').first();
    const s = await (await SELF.fetch(`https://start.social2scale.com/api/status/${token}`)).json();
    expect(s.total).toBe(8);
    expect(s.done).toBe(0);
    expect(s).toHaveProperty('step');
  });
});

describe('GET /img/:token/:name', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, TABELLEN);
  });

  it('liefert ein abgelegtes Bild aus', async () => {
    await env.IMAGES.put('free/abc123/f-0-profil.jpg', 'BILD');
    const res = await SELF.fetch('https://start.social2scale.com/img/abc123/f-0-profil.jpg');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('image/jpeg');
  });

  it('meldet fehlende Bilder als 404 statt zu kippen', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/img/abc123/gibtsnicht.jpg');
    expect(res.status).toBe(404);
  });

  it('laesst niemanden aus dem eigenen Ordner ausbrechen', async () => {
    await env.IMAGES.put('free/geheim/f-0-profil.jpg', 'FREMD');
    const res = await SELF.fetch('https://start.social2scale.com/img/abc/..%2F..%2Fgeheim%2Ff-0-profil.jpg');
    expect(res.status).toBe(404);
  });
});
