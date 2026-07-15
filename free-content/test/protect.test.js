import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isHoneypotTripped,
  isTooFast,
  verifyTurnstile,
  hasMailServer,
  registerAttempt,
} from '../src/protect.js';
import { RATE_LIMIT_PER_IP_PER_HOUR } from '../src/constants.js';
import SCHEMA_SQL from './schema.sql?raw';
import { splitSchema } from './helpers.js';

const T0 = new Date('2026-07-15T12:00:00Z');

/** Sekunden vor T0 — fuer die Fenster-Grenze auf die Sekunde genau. */
const vorT0 = (sekunden) => new Date(T0.getTime() - sekunden * 1000);

describe('protect: Honeypot', () => {
  it('schlaegt an, wenn das versteckte Feld gefuellt ist', () => {
    expect(isHoneypotTripped({ website: 'http://spam.example' })).toBe(true);
  });

  it('schlaegt bei leerem/fehlendem Feld nicht an', () => {
    expect(isHoneypotTripped({ website: '' })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
  });

  it('schlaegt auch bei reinen Leerzeichen an (Feld ist versteckt, kein Mensch tippt da rein)', () => {
    expect(isHoneypotTripped({ website: '   ' })).toBe(true);
  });
});

describe('protect: Mindest-Ausfuellzeit', () => {
  it('weist zu schnelle Eingaben ab', () => {
    expect(isTooFast({ elapsed: 200 })).toBe(true);
  });

  it('laesst menschliche Geschwindigkeit durch', () => {
    expect(isTooFast({ elapsed: 9000 })).toBe(false);
  });

  it('laesst eine fehlende Messung durch (fail-open)', () => {
    expect(isTooFast({})).toBe(false);
  });
});

/**
 * Die Asymmetrie in den beiden folgenden Bloecken ist ABSICHT, kein Bug:
 * Turnstile ist das Bot-Gate und faellt im Zweifel ZU.
 * Der DNS-Check ist nur eine Plausibilitaets-Pruefung und faellt im Zweifel AUF.
 */

/** Antwort-Stub fuer fetch — nur das, was protect.js tatsaechlich liest. */
const stubResponse = (data, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => data,
});

describe('protect: Turnstile faellt ZU (Schicht 1, Bot-Gate)', () => {
  let errorSpy;

  beforeEach(() => {
    // Der catch-Zweig loggt bewusst — hier abfangen, damit die Testausgabe sauber bleibt.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('laesst durch, wenn Cloudflare success:true meldet (der eine echte Ja-Fall)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stubResponse({ success: true })));
    expect(await verifyTurnstile('token-123', '1.2.3.4', 'secret')).toBe(true);
  });

  it('faellt zu, wenn Cloudflare success:false meldet', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stubResponse({ success: false })));
    expect(await verifyTurnstile('token-123', '1.2.3.4', 'secret')).toBe(false);
  });

  it('faellt bei Netzwerkfehler zu (im Zweifel kein Durchlass)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('network error');
    }));
    expect(await verifyTurnstile('token-123', '1.2.3.4', 'secret')).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('faellt bei HTTP-Fehler zu — auch wenn der Body success:true behauptet', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stubResponse({ success: true }, { ok: false, status: 500 })));
    expect(await verifyTurnstile('token-123', '1.2.3.4', 'secret')).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('faellt zu, wenn die Antwort kein JSON ist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    })));
    expect(await verifyTurnstile('token-123', '1.2.3.4', 'secret')).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('faellt ohne Token zu, ohne Cloudflare ueberhaupt zu fragen', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('', '1.2.3.4', 'secret')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('faellt ohne Secret zu, ohne Cloudflare ueberhaupt zu fragen', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('token-123', '1.2.3.4', '')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('protect: MX-Check faellt AUF (Schicht 4, nur Plausibilitaet)', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('faellt bei DNS-Panne offen (eine echte Kundin darf nie abgewiesen werden)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('network error');
    }));
    expect(await hasMailServer('kundin@example.com')).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('akzeptiert eine Domain mit MX-Record', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stubResponse({ Answer: [{ data: '10 mx.example.com' }] })));
    expect(await hasMailServer('kundin@example.com')).toBe(true);
  });

  it('akzeptiert eine Domain ohne MX, aber mit A-Record (Fallback)', async () => {
    const fetchMock = vi.fn(async (url) =>
      String(url).includes('type=MX')
        ? stubResponse({ Answer: [] })
        : stubResponse({ Answer: [{ data: '93.184.216.34' }] })
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await hasMailServer('kundin@example.com')).toBe(true);
  });

  it('weist eine Domain ohne MX und ohne A ab', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stubResponse({ Answer: [] })));
    expect(await hasMailServer('kundin@example.invalid')).toBe(false);
  });

  it('weist eine Adresse ohne @ ab, ohne DNS zu fragen', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await hasMailServer('keine-mail-adresse')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});



/** Sekunden vor T0 — fuer die Fenster-Grenze auf die Sekunde genau. */

/** Deckel gerade so ausschoepfen: N Versuche, alle erlaubt. */
async function schoepfeAus(ip, zeitpunkt) {
  for (let i = 0; i < RATE_LIMIT_PER_IP_PER_HOUR; i++) {
    await registerAttempt(env.DB, ip, zeitpunkt);
  }
}

const zaehleLog = async () =>
  (await env.DB.prepare('SELECT COUNT(*) AS c FROM free_intake_log').first()).c;

describe('protect: Rate-Limit', () => {
  beforeEach(async () => {
    await env.DB.exec('DROP TABLE IF EXISTS free_intake_log');
    for (const stmt of splitSchema(SCHEMA_SQL)) await env.DB.exec(stmt);
  });

  it('laesst die ersten Versuche einer IP durch', async () => {
    expect((await registerAttempt(env.DB, '1.1.1.1', T0)).ok).toBe(true);
  });

  it('laesst genau RATE_LIMIT_PER_IP_PER_HOUR Versuche durch', async () => {
    for (let i = 0; i < RATE_LIMIT_PER_IP_PER_HOUR; i++) {
      expect((await registerAttempt(env.DB, '1.1.1.1', T0)).ok).toBe(true);
    }
  });

  it('blockt ab dem 6. Versuch derselben IP innerhalb einer Stunde', async () => {
    await schoepfeAus('1.1.1.1', T0);
    const res = await registerAttempt(env.DB, '1.1.1.1', T0);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('ip');
  });

  it('laesst eine andere IP unbehelligt', async () => {
    await schoepfeAus('1.1.1.1', T0);
    expect((await registerAttempt(env.DB, '2.2.2.2', T0)).ok).toBe(true);
  });

  it('vergisst alte Versuche nach einer Stunde', async () => {
    await schoepfeAus('1.1.1.1', T0);
    const spaeter = new Date('2026-07-15T13:30:00Z');
    expect((await registerAttempt(env.DB, '1.1.1.1', spaeter)).ok).toBe(true);
  });

  /**
   * Der Grund fuer "erst schreiben, dann zaehlen": mit "erst zaehlen, dann
   * schreiben" lesen alle 20 denselben veralteten Zaehler und kommen ALLE durch.
   * Genau dieser Burst ist der Verkehr, gegen den ein Deckel existiert.
   */
  it('laesst bei 20 parallelen Anfragen derselben IP hoechstens den Deckel durch', async () => {
    const res = await Promise.all(
      Array.from({ length: 20 }, () => registerAttempt(env.DB, '1.1.1.1', T0))
    );
    expect(res.filter((r) => r.ok).length).toBeLessThanOrEqual(RATE_LIMIT_PER_IP_PER_HOUR);
  });

  it('protokolliert auch abgewiesene Versuche (ein Burst soll sichtbar bleiben)', async () => {
    await schoepfeAus('1.1.1.1', T0);
    expect((await registerAttempt(env.DB, '1.1.1.1', T0)).ok).toBe(false);
    expect(await zaehleLog()).toBe(RATE_LIMIT_PER_IP_PER_HOUR + 1);
  });

  /**
   * Die Fenster-Grenze in BEIDE Richtungen festnageln — einseitig getestet
   * driftet die Konvention zurueck. Gleiche Konvention wie leads.js:
   * exakt eine Stunde alt = ausserhalb des Fensters.
   */
  it('zaehlt Versuche von exakt 60 Minuten nicht mehr mit (Grenze wie leads.js)', async () => {
    await schoepfeAus('1.1.1.1', vorT0(60 * 60));
    expect((await registerAttempt(env.DB, '1.1.1.1', T0)).ok).toBe(true);
  });

  it('zaehlt Versuche von 59:59 noch mit', async () => {
    await schoepfeAus('1.1.1.1', vorT0(59 * 60 + 59));
    const res = await registerAttempt(env.DB, '1.1.1.1', T0);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('ip');
  });
});
