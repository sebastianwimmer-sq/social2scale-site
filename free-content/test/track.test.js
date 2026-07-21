import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { track } from '../src/track.js';
import SCHEMA_SQL from './schema.sql?raw';
import { resetTables } from './helpers.js';

describe('track()', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, ['funnel_events']);
  });

  it('schreibt ein Event', async () => {
    await track(env, { event: 'entered', token: 'abc' });
    const row = await env.DB.prepare('SELECT COUNT(*) c FROM funnel_events WHERE event=?')
      .bind('entered')
      .first();
    expect(row.c).toBe(1);
  });

  it('speichert den Token mit', async () => {
    await track(env, { event: 'confirmed', token: 'deadbeef' });
    const row = await env.DB.prepare('SELECT token FROM funnel_events WHERE event=?')
      .bind('confirmed')
      .first();
    expect(row.token).toBe('deadbeef');
  });

  it('erlaubt einen leeren Token', async () => {
    await track(env, { event: 'ready' });
    const row = await env.DB.prepare('SELECT token FROM funnel_events WHERE event=?')
      .bind('ready')
      .first();
    expect(row.token).toBe('');
  });

  it('ist fail-open: ein DB-Fehler wirft NICHT', async () => {
    // Kaputtes env.DB simulieren — track() darf trotzdem nicht werfen.
    const kaputtesEnv = {
      DB: {
        prepare() {
          throw new Error('DB weg');
        },
      },
    };
    await expect(track(kaputtesEnv, { event: 'entered', token: 'x' })).resolves.toBeUndefined();
  });
});

describe('GET /api/track (Beacon-Endpunkt)', () => {
  beforeEach(async () => {
    await resetTables(env.DB, SCHEMA_SQL, ['funnel_events']);
  });

  async function alleEvents() {
    const { results } = await env.DB.prepare('SELECT event, token FROM funnel_events').all();
    return results;
  }

  it('liefert immer 204 und schreibt ein erlaubtes Event', async () => {
    const res = await SELF.fetch(
      'https://start.social2scale.com/api/track?e=cta_call&t=abc'
    );
    expect(res.status).toBe(204);
    const rows = await alleEvents();
    expect(rows).toEqual([{ event: 'cta_call', token: 'abc' }]);
  });

  it('liefert 204 fuer ein nicht erlaubtes Event, schreibt aber nichts', async () => {
    const res = await SELF.fetch(
      'https://start.social2scale.com/api/track?e=irgendwas_boeses&t=abc'
    );
    expect(res.status).toBe(204);
    expect(await alleEvents()).toEqual([]);
  });

  it('liefert 204 bei fehlenden Parametern, schreibt aber nichts', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/track');
    expect(res.status).toBe(204);
    expect(await alleEvents()).toEqual([]);
  });

  it('verwirft einen Token mit unerlaubten Zeichen, bleibt aber bei 204', async () => {
    const res = await SELF.fetch(
      'https://start.social2scale.com/api/track?e=ready&t=' +
        encodeURIComponent('<script>')
    );
    expect(res.status).toBe(204);
    expect(await alleEvents()).toEqual([]);
  });

  it('akzeptiert einen leeren Token', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/track?e=cta_save');
    expect(res.status).toBe(204);
    const rows = await alleEvents();
    expect(rows).toEqual([{ event: 'cta_save', token: '' }]);
  });
});
