import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isHoneypotTripped,
  isTooFast,
  verifyTurnstile,
  hasMailServer,
  registerAttempt,
} from '../src/protect.js';
import { RATE_LIMIT_PER_IP_PER_HOUR, TOKEN_TTL_HOURS } from '../src/constants.js';
import SCHEMA_SQL from './schema.sql?raw';
import {
  buildConfirmMail,
  buildResultMail,
  sendConfirmMail,
  notifyFounders,
} from '../src/mail.js';

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

const T0 = new Date('2026-07-15T12:00:00Z');

/**
 * Zerlegt das Schema in einzeln ausfuehrbare Statements.
 * Kommentarzeilen MUESSEN vor dem Whitespace-Collapse raus — sonst frisst ein
 * einzeiliger `--`-Kommentar das gesamte folgende Statement.
 */
function splitSchema(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Sekunden vor T0 — fuer die Fenster-Grenze auf die Sekunde genau. */
const vorT0 = (sekunden) => new Date(T0.getTime() - sekunden * 1000);

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

describe('mail: Bestaetigungsmail', () => {
  const lead = { name: 'Sebi', token: 'abc123', handle: 'sebi.wimmer' };

  it('traegt Sebis Framing im Betreff', () => {
    const mail = buildConfirmMail(lead, 'https://start.social2scale.com');
    expect(mail.subject).toContain('Nur noch ein Klick');
  });

  it('enthaelt den korrekten Bestaetigungslink', () => {
    const mail = buildConfirmMail(lead, 'https://start.social2scale.com');
    expect(mail.htmlContent).toContain('https://start.social2scale.com/c/abc123');
  });

  it('spricht sie mit Vornamen an', () => {
    expect(buildConfirmMail(lead, 'https://x.de').htmlContent).toContain('Sebi');
  });

  it('escaped HTML im Namen (XSS)', () => {
    const boese = { ...lead, name: '<script>alert(1)</script>' };
    const html = buildConfirmMail(boese, 'https://x.de').htmlContent;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  /** Die Gueltigkeit steht in constants.js — der Text darf nicht davon wegdriften. */
  it('nennt die TTL aus constants.js statt einer hartkodierten Zahl', () => {
    const html = buildConfirmMail(lead, 'https://x.de').htmlContent;
    expect(html).toContain(`${TOKEN_TTL_HOURS} Stunden`);
  });
});

describe('mail: Ergebnismail', () => {
  const lead = { name: 'Sebi', token: 'abc123', handle: 'sebi.wimmer' };

  it('enthaelt den korrekten Ergebnislink', () => {
    const mail = buildResultMail(lead, 'https://start.social2scale.com');
    expect(mail.htmlContent).toContain('https://start.social2scale.com/r/abc123');
  });

  it('spricht sie mit Vornamen an', () => {
    expect(buildResultMail(lead, 'https://x.de').htmlContent).toContain('Sebi');
  });

  it('escaped HTML im Namen (XSS)', () => {
    const boese = { ...lead, name: '<script>alert(1)</script>' };
    const html = buildResultMail(boese, 'https://x.de').htmlContent;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

/**
 * send() ist der Mechanismus, den die Spec "Single Point of Failure" nennt.
 * Eine Mail, die nicht rausging, MUSS eine Spur hinterlassen — das Schweigen
 * der Besucherin hinterlaesst keine. Deshalb wird hier nicht nur der
 * Rueckgabewert geprueft, sondern auch, dass tatsaechlich geloggt wird.
 */
describe('mail: send() — der Pfad, auf dem der Funnel stirbt', () => {
  const lead = { name: 'Sebi', email: 'sebi@firma.de', token: 'abc123', handle: 'sebi.wimmer' };
  const envOk = {
    BREVO_API_KEY: 'key-123',
    NOTIFY_FROM: 'hallo@social2scale.com',
    NOTIFY_TO: 'team@social2scale.com',
    PUBLIC_ORIGIN: 'https://start.social2scale.com',
  };

  /** Brevo-Antwort-Stub — nur das, was send() tatsaechlich liest. */
  const brevoStub = ({ ok = true, status = 201, body = '{}' } = {}) => ({
    ok,
    status,
    text: async () => body,
  });

  let errorSpy;

  beforeEach(() => {
    // send() loggt bewusst — hier abfangen, damit die Testausgabe sauber bleibt.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('meldet true und schickt Betreff + Key an Brevo, wenn alles glattgeht', async () => {
    const fetchMock = vi.fn(async () => brevoStub());
    vi.stubGlobal('fetch', fetchMock);

    expect(await sendConfirmMail(envOk, lead)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['api-key']).toBe('key-123');
    expect(JSON.parse(init.body).subject).toContain('Nur noch ein Klick');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('meldet false und loggt, wenn der API-Key fehlt — ohne Brevo zu fragen', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await sendConfirmMail({ ...envOk, BREVO_API_KEY: '' }, lead)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('meldet false und loggt den Status, wenn Brevo einen Fehler zurueckgibt', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => brevoStub({ ok: false, status: 401, body: 'unauthorized' })));

    expect(await sendConfirmMail(envOk, lead)).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls.flat().map(String).join(' ')).toContain('401');
  });

  it('meldet false und loggt, wenn das Netz wegbricht', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('network error');
    }));

    expect(await sendConfirmMail(envOk, lead)).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('loggt niemals den API-Key selbst — nur sein Fehlen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => brevoStub({ ok: false, status: 500, body: 'boom' })));

    await sendConfirmMail(envOk, lead);
    expect(errorSpy.mock.calls.flat().map(String).join(' ')).not.toContain('key-123');
  });

  /**
   * Fire-and-forget unter ctx.waitUntil: wirft der Builder, greift die
   * Fehlerbehandlung in send() gar nicht erst — die Rejection verschwaende still.
   */
  it('meldet false und loggt, wenn der Lead malformt ist und der Builder wirft', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await sendConfirmMail(envOk, null)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('laesst notifyFounders nie werfen, loggt den Fehler aber', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('network error');
    }));

    await expect(notifyFounders(envOk, lead, 'confirmed')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});

/**
 * Der Betreff ist eine Klartext-Kopfzeile, kein HTML: die Gefahr heisst hier
 * Header-Injection, nicht XSS. validate.js saeubert bereits an der Grenze —
 * das hier nagelt die zweite Schicht fest, damit das naechste neue Feld nicht
 * davon abhaengt, dass jemand an die Validierung denkt.
 */
describe('mail: Betreffzeile haelt Steuerzeichen fern (Header-Injection)', () => {
  const lead = { name: 'Sebi', email: 'sebi@firma.de', token: 'abc123', handle: 'sebi.wimmer' };
  const envOk = {
    BREVO_API_KEY: 'key-123',
    NOTIFY_FROM: 'hallo@social2scale.com',
    NOTIFY_TO: 'team@social2scale.com',
    PUBLIC_ORIGIN: 'https://start.social2scale.com',
  };

  let fetchMock;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock = vi.fn(async () => ({ ok: true, status: 201, text: async () => '{}' }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const gesendeterBetreff = () => JSON.parse(fetchMock.mock.calls[0][1].body).subject;

  it('laesst kein CR/LF aus dem Namen in den Betreff', async () => {
    await notifyFounders(envOk, { ...lead, name: 'Sebi\r\nBcc: opfer@fremd.de' }, 'confirmed');
    expect(gesendeterBetreff()).not.toMatch(/[\r\n]/);
    expect(gesendeterBetreff()).toContain('Sebi Bcc: opfer@fremd.de');
  });

  it('laesst kein CR/LF aus der Aktion in den Betreff', async () => {
    await notifyFounders(envOk, lead, 'confirmed\r\nBcc: opfer@fremd.de');
    expect(gesendeterBetreff()).not.toMatch(/[\r\n]/);
  });

  it('laesst einen harmlosen Betreff unangetastet', async () => {
    await notifyFounders(envOk, { ...lead, name: 'Mueller & Co' }, 'confirmed');
    expect(gesendeterBetreff()).toBe('Free-Content-Lead: Mueller & Co (confirmed)');
  });
});
