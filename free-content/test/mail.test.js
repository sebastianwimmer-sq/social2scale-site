import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildConfirmMail,
  buildResultMail,
  sendConfirmMail,
  notifyFounders,
} from '../src/mail.js';
import { TOKEN_TTL_HOURS } from '../src/constants.js';

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

  /**
   * Produktions-Template (design/prototypes/confirm-email.html): gehostete
   * Bilder statt base64 (Gmail zeigt kein base64-Inline-Bild), Impressum-Pflicht
   * im Footer, Platzhalter vollstaendig ersetzt.
   */
  it('Bestaetigungsmail: gehostete Bilder, Confirm-Link, Vorname, kein base64', () => {
    const { htmlContent } = buildConfirmMail({ name: 'Sabine', token: 'abc123' }, 'https://start.social2scale.com');
    expect(htmlContent).toContain('Sabine');
    expect(htmlContent).toContain('https://start.social2scale.com/c/abc123');
    expect(htmlContent).toContain('social2scale.com/assets/sig-wordmark.png'); // gehostet
    expect(htmlContent).not.toContain('base64');
    expect(htmlContent).toContain('Philipp Libowicz'); // Impressum-Pflicht
    expect(htmlContent).not.toContain('{{VORNAME}}'); // Platzhalter ersetzt
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
