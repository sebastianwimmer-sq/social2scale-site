import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isHoneypotTripped,
  isTooFast,
  verifyTurnstile,
  hasMailServer,
} from '../src/protect.js';

describe('health', () => {
  it('antwortet mit ok', async () => {
    const res = await SELF.fetch('https://start.social2scale.com/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

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
