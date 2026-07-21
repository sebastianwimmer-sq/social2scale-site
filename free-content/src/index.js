/**
 * s2s Free-Content-Funnel — Router.
 * Kennt keine Interna: delegiert an validate/protect/leads/mail.
 */

import { validateSubmission } from './validate.js';
import {
  verifyTurnstile,
  isHoneypotTripped,
  isTooFast,
  hasMailServer,
  registerAttempt,
} from './protect.js';
import { upsertLead, confirmLead, cleanupExpired, sweepStaleBuilding } from './leads.js';
import { sendConfirmMail, sendResultMail, notifyFounders } from './mail.js';
import { generateFor, buildStatus } from './generate.js';
import { r2Key } from './render.js';
import { track } from './track.js';
import { formPage } from './pages/form.js';
import { resultPage } from './pages/result.js';

const ANFRAGE_URL = 'https://social2scale.com/anfrage/';

// Beacon-Events (Spec Plan 3 Task 6): 'cta_call' wird bereits von reveal.js per
// navigator.sendBeacon geschickt (Task 4) — die Allowlist MUSS ihn kennen.
const TRACK_EVENTS = ['entered', 'confirmed', 'ready', 'cta_call', 'cta_save'];
// Derselbe Zeichensatz/Laengenrahmen wie /api/status/:token — ein Token ist hier
// nur eine lose Referenz, kein Datenzugriffs-Schluessel.
const TOKEN_RE = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * EINE Antwort fuer JEDEN Lead-Ausgang — created, resent, renewed, retry, ready,
 * building, throttled, handle_taken. Wer hier unterscheidet, verraet welche Adressen
 * registriert sind (Enumeration).
 * Der Spam-Hinweis steht drin, weil die Mail der Punkt ist, an dem der Funnel
 * lautlos stirbt: kommt sie nicht an, ist die Besucherin weg und niemand erfaehrt es.
 */
const NEUTRAL = {
  ok: true,
  message: 'Schau in dein Postfach — und wirf auch einen Blick in den Spam-Ordner.',
};

function corsHeaders(allow) {
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'anon';
}

async function handleSubmit(request, env, ctx, cors) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[submit] Body ist kein JSON:', err);
    return json({ ok: false, error: 'bad_json' }, 400, cors);
  }

  // Billige Schichten zuerst — ein Bot soll keine DB- oder DNS-Arbeit ausloesen.
  // Honeypot und Zu-schnell antworten bewusst wie ein Erfolg: der Bot soll nicht
  // lernen, woran er gescheitert ist.
  if (isHoneypotTripped(body)) return json(NEUTRAL, 200, cors);
  if (isTooFast(body)) return json(NEUTRAL, 200, cors);

  const ip = clientIp(request);

  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET);
    if (!ok) return json({ ok: false, error: 'captcha' }, 403, cors);
  } else {
    // Ohne Secret ist Schicht 1 — das eigentliche Bot-Gate — AUS. Ein vergessenes
    // `wrangler secret put TURNSTILE_SECRET` darf nicht still passieren: dann kaeme
    // jeder Bot durch, der den Honeypot meidet und lang genug wartet.
    // /api/health meldet das mit, damit ein Fehl-Deploy beweisbar auffaellt.
    console.error('[submit] TURNSTILE_SECRET fehlt — Bot-Gate ist AUS, Anfrage ungeprueft!');
  }

  const checked = validateSubmission(body);
  if (!checked.ok) return json({ ok: false, error: checked.error }, 422, cors);

  // registerAttempt schreibt ZUERST und urteilt dann — nur so haelt der Deckel gegen
  // einen parallelen Burst. Es zaehlt auch abgelehnte Versuche mit; das ist gewollt,
  // ein Angriff soll in der Tabelle sichtbar sein.
  let limited;
  try {
    limited = await registerAttempt(env.DB, ip);
  } catch (err) {
    // Fail-closed: ohne Zaehlung gibt es keinen Deckel.
    console.error('[submit] Rate-Limit-Zaehlung fehlgeschlagen:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }
  if (!limited.ok) return json({ ok: false, error: 'rate_limited' }, 429, cors);

  if (!(await hasMailServer(checked.value.emailNorm))) {
    return json({ ok: false, error: 'email_domain' }, 422, cors);
  }

  let lead;
  let action;
  let mail;
  try {
    ({ lead, action, mail } = await upsertLead(env.DB, checked.value, ip));
  } catch (err) {
    console.error('[submit] Lead konnte nicht gespeichert werden:', err);
    return json({ ok: false, error: 'backend' }, 503, cors);
  }

  // Mailversand und Aufraeumen duerfen die Antwort nicht aufhalten.
  if (mail === 'confirm') {
    ctx.waitUntil(
      sendConfirmMail(env, lead).then((sent) => {
        if (!sent) console.error('[submit] Bestaetigungsmail nicht zugestellt, Lead', lead.id);
      })
    );
  } else if (mail === 'result') {
    ctx.waitUntil(sendResultMail(env, lead));
  }
  if (action === 'created') {
    ctx.waitUntil(notifyFounders(env, lead, action));
    ctx.waitUntil(track(env, { event: 'entered', token: lead.token }));
  }

  ctx.waitUntil(
    cleanupExpired(env.DB).catch((err) =>
      console.error('[submit] TTL-Aufraeumen fehlgeschlagen:', err)
    )
  );
  // Opportunistisch bei jeder Anfrage: keine Cron-Route noetig, um die eine
  // Spec-§9-Sackgasse (hart gekillter Worker laesst eine Zeile bei 'building'
  // haengen) zu schliessen — der naechste Formular-Submit reicht.
  ctx.waitUntil(
    sweepStaleBuilding(env.DB).catch((err) =>
      console.error('[submit] Stale-Building-Sweep fehlgeschlagen:', err)
    )
  );

  return json(NEUTRAL, 200, cors);
}

function htmlPage(title, body) {
  return new Response(
    '<!doctype html><html lang="de"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<title>${title}</title></head><body><main><h1>${title}</h1>${body}</main></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/**
 * Sackgassen sind verboten (Spec §9): sie hat gerade ihre Mail bestaetigt, jeder
 * Fehlerfall muss ihr sagen was sie JETZT tun kann — nicht was schiefging.
 * Die Texte nennen die Handlung, nicht die Ursache (Spec §6, Zielgruppen-Haertung).
 * Als Funktion statt Konstante: das Formular liegt jetzt am Worker selbst
 * (`/`, env.PUBLIC_ORIGIN) statt an der frueheren statischen `/free-content/`-Seite.
 */
function confirmFehler(formularUrl, anfrageUrl) {
  return {
    used: {
      title: 'Diesen Link hast du schon benutzt',
      body:
        '<p>Kein Problem — trag dich einfach nochmal ein, dann schicken wir dir einen frischen Link.</p>' +
        `<p><a href="${formularUrl}">Nochmal eintragen</a></p>`,
    },
    expired: {
      title: 'Dieser Link ist nicht mehr gültig',
      body:
        '<p>Links gelten 24 Stunden. Trag dich nochmal ein, dann bekommst du sofort einen neuen.</p>' +
        `<p><a href="${formularUrl}">Neuen Link holen</a></p>`,
    },
    not_found: {
      title: 'Diesen Link kennen wir nicht mehr',
      body:
        '<p>Vielleicht ein Tippfehler beim Kopieren? Trag dich einfach nochmal ein.</p>' +
        `<p><a href="${formularUrl}">Nochmal eintragen</a></p>`,
    },
    // Zwei noch unbestaetigte Leads duerfen denselben Handle haben (kein Griefing) —
    // bestaetigt aber nur einer. Der Zweite darf KEINEN 500 sehen.
    handle_taken: {
      title: 'Diesen Account hat schon jemand angemeldet',
      body:
        '<p>Für <strong>diesen Instagram-Account</strong> läuft bereits ein Free Content. ' +
        'Wenn das dein Account ist, melde dich kurz bei uns — wir klären das in zwei Minuten.</p>' +
        `<p><a href="${anfrageUrl}">Kurz melden</a></p>`,
    },
  };
}

async function handleConfirm(token, env, ctx) {
  const formularUrl = `${env.PUBLIC_ORIGIN || 'https://start.social2scale.com'}/`;
  const fehlerSeiten = confirmFehler(formularUrl, ANFRAGE_URL);

  let res;
  try {
    res = await confirmLead(env.DB, token);
  } catch (err) {
    console.error('[confirm] Bestaetigung fehlgeschlagen:', err);
    return htmlPage(fehlerSeiten.not_found.title, fehlerSeiten.not_found.body);
  }

  if (!res.ok) {
    const fehler = fehlerSeiten[res.reason] ?? fehlerSeiten.not_found;
    return htmlPage(fehler.title, fehler.body);
  }

  ctx.waitUntil(track(env, { event: 'confirmed', token }));

  // Nicht blockieren: Claude + 8 Renderings dauern 20-40 s. Sie sieht sofort den
  // Build-Screen, der Fortschritt kommt ueber /api/status (Spec §6).
  ctx.waitUntil(
    generateFor(env, token).then((r) => {
      if (!r.ok) console.error('[confirm] Generierung nicht gelaufen:', r.grund, token);
    })
  );

  return new Response(null, { status: 302, headers: { Location: `/r/${token}` } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(env.ALLOW_ORIGIN || 'https://social2scale.com');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // health meldet mit, ob die scharfen Schichten wirklich konfiguriert sind.
    // Sonst kann ein Fehl-Deploy (vergessenes Secret) nicht auffallen — und genau
    // das soll beweisbar sein, nicht Vertrauenssache. Das Live-Gate prueft es.
    if (url.pathname === '/api/health') {
      return json(
        { ok: true, turnstile: !!env.TURNSTILE_SECRET, mail: !!env.BREVO_API_KEY },
        200,
        cors
      );
    }

    if (url.pathname === '/api/free-content') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
      return handleSubmit(request, env, ctx, cors);
    }

    // Beacon-Endpunkt (navigator.sendBeacon, siehe reveal.js). IMMER 204 — ein
    // Beacon hat keine Antwort-Behandlung, und ein Fehlercode hier wuerde nur in
    // der Konsole der Besucherin landen, ohne dass irgendjemand reagieren kann.
    // Unbekanntes 'e'/'t' wird verworfen statt geschrieben, aber die Antwort bleibt
    // gleich — sonst koennte man per Statuscode erraten, welche Events existieren.
    if (url.pathname === '/api/track') {
      const e = url.searchParams.get('e') || '';
      const t = url.searchParams.get('t') || '';
      if (TRACK_EVENTS.includes(e) && (t === '' || TOKEN_RE.test(t))) {
        ctx.waitUntil(track(env, { event: e, token: t }));
      }
      return new Response(null, { status: 204 });
    }

    // Formular-Seite: der Worker liefert sie jetzt selbst statt an eine
    // statische Seite zu verweisen (Plan 3).
    if (url.pathname === '/' && request.method === 'GET') {
      return formPage(env);
    }

    // Token ist server-generierter Hex — alles andere ist gar kein Token von uns.
    // Das Muster haelt zugleich Fremdes aus dem HTML der Fehlerseiten.
    const confirmMatch = url.pathname.match(/^\/c\/([a-f0-9]{8,128})$/);
    if (confirmMatch) return handleConfirm(confirmMatch[1], env, ctx);
    if (url.pathname.startsWith('/c/')) {
      const formularUrl = `${env.PUBLIC_ORIGIN || 'https://start.social2scale.com'}/`;
      const nichtGefunden = confirmFehler(formularUrl, ANFRAGE_URL).not_found;
      return htmlPage(nichtGefunden.title, nichtGefunden.body);
    }

    // Anders als /c/: hier ist ein unbekannter oder falsch geformter Token kein
    // Fehlerfall, sondern ein legitimes 'not_found' (der Build-Screen pollt das,
    // bevor er weiss ob der Token echt ist) — daher bewusst kein striktes Hex-Muster,
    // nur ein sicherer Zeichensatz mit Laengengrenze gegen ReDoS/Muell.
    const statusMatch = url.pathname.match(/^\/api\/status\/([a-zA-Z0-9_-]{1,128})$/);
    if (statusMatch) {
      try {
        return json(await buildStatus(env, statusMatch[1]), 200, cors);
      } catch (err) {
        console.error('[status] Stand nicht lesbar:', err);
        return json({ ok: false, error: 'backend' }, 503, cors);
      }
    }

    // Bilder. Zeichensatz haelt Schraegstriche/Punkte/Prozent-Encoding fern (die
    // Escape-Versuche matchen den Pfad erst gar nicht), r2Key saeubert zusaetzlich
    // Token und Namen — niemand bricht aus seinem eigenen Ordner aus.
    const imgMatch = url.pathname.match(/^\/img\/([a-zA-Z0-9_-]{1,128})\/([a-zA-Z0-9_-]{1,64})\.jpg$/);
    if (imgMatch) {
      try {
        const obj = await env.IMAGES.get(r2Key(imgMatch[1], imgMatch[2]));
        if (!obj) return new Response('Nicht gefunden', { status: 404 });
        // Buffern statt obj.body streamen: ein einzelner Screenshot ist klein, und
        // ein ungelesener R2-Stream ueber die Service-Binding-Grenze bleibt sonst
        // offen (Test-Harness meckert dann beim Aufraeumen der isolierten Storage).
        return new Response(await obj.arrayBuffer(), {
          headers: {
            'Content-Type': 'image/jpeg',
            // Bilder aendern sich nach dem Rendern nie — ein Jahr ist ehrlich.
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (err) {
        console.error('[img] Bild nicht lesbar:', err);
        return new Response('Nicht gefunden', { status: 404 });
      }
    }

    // Build-/Ergebnisseite (Plan 3): pollt /api/status/:token selbst,
    // kein Server-seitiger Datenzugriff hier noetig.
    const resultMatch = url.pathname.match(/^\/r\/([a-f0-9]{8,128})$/);
    if (resultMatch) return resultPage(resultMatch[1]);

    return json({ ok: false, error: 'not_found' }, 404, cors);
  },
};
