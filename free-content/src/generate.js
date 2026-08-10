/**
 * Orchestriert die Generierung. Kennt keine Interna — delegiert an
 * moderate/copy/palette/render.
 *
 * WIRFT NIE: sie hat gerade ihre Mail bestaetigt. Jeder Fehler landet in einem
 * ehrlichen Status, damit die Seite ihr sagen kann, was Sache ist (Spec §9).
 */

import { checkInput } from './moderate.js';
import { generateCopy } from './copy.js';
import { ladeAvatar } from './avatar.js';
import { derivePalettes } from './palette.js';
import { renderAll } from './render.js';
import { findByToken } from './leads.js';
import { notifyFounders } from './mail.js';
import { FRAME_IDS } from './templates/frames.js';
import { RENDER_VERSUCHE, RENDER_BACKOFF_MS, RENDER_TIMEOUT_MS, FOLLOWUP_TAGE } from './constants.js';

/** Was sie waehrend des Bauens liest. Ehrlich, nicht dekorativ. */
const SCHRITTE = {
  marke:     'Wir lesen deine Marke …',
  texte:     'Deine Texte entstehen …',
  farben:    'Deine Farbwelten entstehen …',
  rendern:   'Wir setzen deinen Feed …',
  fertig:    'Fertig.',
};

/**
 * Retry mit Backoff (Spec §9). Browser Rendering hat eine Grenze fuer gleichzeitige
 * Sessions — bei einem Andrang scheitert der erste Versuch, der zweite klappt.
 * Ohne Retry verliert sie ihre Bilder, weil jemand anders zufaellig gleichzeitig da war.
 */
/**
 * Watchdog: ein haengender CDP-Call (Screenshot, fonts.ready) WIRFT nie — ohne
 * Zeitlimit steht der Lead ewig auf 'building' und mitRetry kann nie feuern
 * (live passiert 10.08.: ein Render-Bucket hing nach seinem ersten Frame).
 * Der haengende Lauf laeuft im Hintergrund weiter, bis die Runtime ihn reisst —
 * aber der Retry bekommt seine Chance, und das Ende ist ein ehrlicher Status
 * statt ewigem Warten.
 */
export function mitZeitlimit(promise, ms = RENDER_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`Render-Zeitlimit ${ms}ms ueberschritten (haengender Browser-Call)`)), ms)
    ),
  ]);
}

async function mitRetry(fn) {
  let letzter;
  for (let versuch = 1; versuch <= RENDER_VERSUCHE; versuch++) {
    try {
      return await fn();
    } catch (err) {
      letzter = err;
      console.error(`[generate] Render-Versuch ${versuch}/${RENDER_VERSUCHE} fehlgeschlagen:`, err);
      if (versuch < RENDER_VERSUCHE) {
        await new Promise((r) => setTimeout(r, RENDER_BACKOFF_MS * versuch));
      }
    }
  }
  throw letzter;
}

async function setzeSchritt(db, token, status, step) {
  try {
    await db
      .prepare('UPDATE free_leads SET status = ?, build_step = ? WHERE token = ?')
      .bind(status, step, token)
      .run();
  } catch (err) {
    console.error('[generate] Fortschritt konnte nicht geschrieben werden:', err);
  }
}

/**
 * Setzt den Lead auf 'failed' UND gibt den Riegel wieder frei (generated_at=NULL).
 * Der atomare Claim unten setzt generated_at schon zu Beginn — scheitert der Lauf,
 * muss die Sperre zurueck, sonst ist ein 'failed'-Lead fuer immer blockiert und
 * der Retry-Pfad (leads.js reenter: status='failed' -> neuer Token) liefe gegen
 * einen gesetzten Riegel und bekaeme nur 'bereits_erzeugt'.
 *
 * `grund` (Plan 3 Task 5) landet zusaetzlich in fail_reason (migrate-v14.sql):
 * ohne diese Spalte kollabieren Moderationsablehnung und Render-Fehler auf
 * denselben Status 'failed' und der Build-Screen kann eine Sackgassen-Kopie
 * ("nochmal versuchen") nicht von einer echten Ablehnung unterscheiden — bei
 * einer Ablehnung waere "nochmal" dasselbe Thema, also derselbe Reject: eine
 * Schleife statt eines Auswegs.
 */
async function markiereFehler(db, token, grund = '') {
  try {
    await db
      .prepare(
        "UPDATE free_leads SET status='failed', build_step='', generated_at=NULL, fail_reason=? WHERE token = ?"
      )
      .bind(grund, token)
      .run();
  } catch (err) {
    console.error('[generate] Fehlerstatus konnte nicht geschrieben werden:', err);
  }
}

/**
 * @returns {Promise<{ok: boolean, grund?: string}>} wirft nie
 */
export async function generateFor(env, token) {
  let lead;
  try {
    lead = await findByToken(env.DB, token);
  } catch (err) {
    console.error('[generate] Lead nicht lesbar:', err);
    return { ok: false, grund: 'db' };
  }

  if (!lead) return { ok: false, grund: 'not_found' };
  if (!lead.confirmed_at) return { ok: false, grund: 'not_confirmed' };
  // Billiger Kurzschluss (KEIN Riegel): schon erzeugt -> raus, ohne die DB
  // anzufassen. Die echte Sperre ist der atomare Claim direkt darunter.
  if (lead.generated_at) return { ok: false, grund: 'bereits_erzeugt' };

  // DER RIEGEL, atomar (Muster: leads.js reenter/confirmLead — check-and-claim in
  // EINEM UPDATE, dann meta.changes pruefen). Der Read oben ist nur ein Kurzschluss;
  // die echte Sperre ist dieses eine Statement: GENAU EINE nebenlaeufige Invocation
  // setzt generated_at, jede weitere sieht changes=0 und geht raus — BEVOR ein
  // Browser oder Claude startet. Ohne diese Atomaritaet laufen bei einem
  // Doppel-Trigger zwei Browser gegen genau das Session-Limit, gegen das der Retry
  // ueberhaupt existiert (zwei Browser, zwei Claude-Calls). SCHRITTE.marke ist der
  // erste echte Schritt: er umklammert die Moderation, die gleich darunter laeuft.
  let claim;
  try {
    claim = await env.DB
      .prepare(
        "UPDATE free_leads SET status='building', build_step=?, generated_at=datetime('now')" +
        ' WHERE token=? AND generated_at IS NULL'
      )
      .bind(SCHRITTE.marke, token)
      .run();
  } catch (err) {
    console.error('[generate] Riegel-Claim fehlgeschlagen:', err);
    return { ok: false, grund: 'db' };
  }
  if ((claim.meta?.changes ?? 0) === 0) {
    // Eine parallele Invocation war schneller — sie baut bereits. Nichts tun.
    return { ok: false, grund: 'bereits_erzeugt' };
  }

  const clean = {
    name: lead.name, handle: lead.handle, branche: lead.branche,
    ziel: lead.ziel, stimmung: lead.stimmung, farbe: lead.farbe,
  };

  // Schicht 1 der Marken-Sicherung (Spec §5a): unser Logo, unsere Verantwortung.
  // Echte Arbeit unter SCHRITTE.marke, das der Claim gerade gesetzt hat.
  const moderation = checkInput(clean);
  if (!moderation.ok) {
    console.error('[generate] Thema abgelehnt:', moderation.grund, 'Lead', lead.id);
    await markiereFehler(env.DB, token, 'moderation');
    // Founder-Alarm (Spec §5a) — und er ist NICHT optional: der Filter ist bewusst
    // streng, weil eine Wortliste `Drogen-Praevention` nicht von `Drogen-Verkauf`
    // trennen kann. Diese Strenge ist nur vertretbar, WEIL ein Mensch jede Ablehnung
    // sieht und sich bei einer zu Unrecht Abgelehnten melden kann. Ohne den Alarm
    // ist der Filter kein strenger Filter, sondern eine stille Leadvernichtung.
    try {
      await notifyFounders(env, lead, `ABGELEHNT (${moderation.grund}) — bitte pruefen`);
    } catch (err) {
      console.error('[generate] Founder-Alarm zur Ablehnung ging nicht raus:', err);
    }
    return { ok: false, grund: 'moderation' };
  }

  try {
    // Jeder Schritt = echte Arbeit dahinter, die ein Poller sehen kann (Spec §6).
    await setzeSchritt(env.DB, token, 'building', SCHRITTE.texte);
    // Parallel zur Copy (ladeAvatar wirft nie): ihr hochgeladenes Foto aus R2 —
    // bis die Texte stehen, ist es laengst da. Kostet keine Wartezeit.
    const avatarVersprechen = ladeAvatar(env, token);
    const copy = await generateCopy(env, clean);   // wirft nie, faellt zurueck

    // Ist Claude die Ursache des Fallbacks (Guthaben leer / API-Fehler / falsch
    // konfiguriert), bekommt die Kundin STILL generische Copy — das darf nicht
    // unbemerkt bleiben. Founder-Alarm, damit Sebi das Guthaben/den Key pruefen kann.
    // (ablehnen/falsche Form markiert copy.js bewusst NICHT — das ist kein Billing-Problem.)
    if (copy?._fallback === 'no_key' || copy?._fallback === 'claude_error') {
      console.error('[generate] Copy-Fallback wegen Claude:', copy._fallback, 'Lead', lead.id);
      try {
        await notifyFounders(env, lead, `⚠️ CLAUDE-FALLBACK (${copy._fallback}) — Kundin bekommt GENERISCHE Copy. Anthropic-Guthaben/API/Key pruefen!`);
      } catch (e) {
        console.error('[generate] Founder-Alarm (Claude-Fallback) ging nicht raus:', e);
      }
    }

    // TEILausfall: das Profil kam durch, aber einzelne Posts fielen auf den Fallback.
    // Der Alarm oben feuert dafuer NICHT — genau so blieb am 27.07. unbemerkt, dass die
    // erste echte Interessentin 2 von 3 Posts als Platzhalter bekam ("Der naechste Post
    // ist schon in Arbeit."). Sie sah es fuenfmal an und klickte nichts.
    if (Array.isArray(copy?._backfilled) && copy._backfilled.length) {
      console.error('[generate] Teil-Fallback bei Posts', copy._backfilled.join(','), 'Lead', lead.id);
      try {
        await notifyFounders(
          env,
          lead,
          `⚠️ TEIL-FALLBACK — Post ${copy._backfilled.join(', ')} generisch. Feed pruefen, ggf. neu erzeugen.`
        );
      } catch (e) {
        console.error('[generate] Founder-Alarm (Teil-Fallback) ging nicht raus:', e);
      }
    }

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.farben);
    const palettes = derivePalettes(lead.stimmung, lead.farbe);

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.rendern);
    // Foto einsammeln (null = Initial-Fallback im Frame, frames.js entscheidet).
    const avatarUrl = await avatarVersprechen;
    const zumRendern = avatarUrl ? { ...clean, avatarUrl } : clean;
    await mitRetry(() => mitZeitlimit(renderAll(env, token, zumRendern, copy, palettes)));

    // Captions (farbwelt-unabhaengig) neben die Bilder legen — der Reveal holt sie
    // einmal von /api/content/:token. Struktur bleibt { captions: [3 strings] }
    // (die Form, an der /api/content und der Reveal haengen), jetzt aber gefuellt
    // aus posts[i].caption statt der frueheren Top-Level-captions. Non-fatal:
    // fehlende Captions duerfen die fertigen Bilder nicht kosten.
    const captions = Array.isArray(copy.posts)
      ? copy.posts.map((post) => (typeof post?.caption === 'string' ? post.caption : ''))
      : [];
    try {
      await env.IMAGES.put(
        `free/${token}/content.json`,
        JSON.stringify({ captions }),
        { httpMetadata: { contentType: 'application/json' } }
      );
    } catch (err) {
      console.error('[generate] Captions konnten nicht gespeichert werden:', err);
    }

    // generated_at ist bereits vom Claim gesetzt — hier nur der Abschluss.
    // r2_prefix EINMAL berechnen und in UPDATE und Spiegel gleich verwenden,
    // damit die beiden nie auseinanderdriften.
    const r2Prefix = `free/${token}/`;
    await env.DB
      .prepare("UPDATE free_leads SET status='ready', build_step=?, r2_prefix=? WHERE token=?")
      .bind(SCHRITTE.fertig, r2Prefix, token)
      .run();

    // KEIN Re-Fetch: 'ready' ist bereits committed. Ein erneutes findByToken hier
    // ist ein bares db.prepare().first() ohne eigenen Schutz — wirft es bei einem
    // transienten D1-Ruckler, faellt der Lauf in den aeusseren catch, markiereFehler
    // kippt die Zeile auf 'failed' zurueck und feuert einen falschen Alarm, obwohl
    // ihre 8 Bilder laengst in R2 liegen. Genau die Falle, die dieser Task vermeiden
    // soll. Alle Felder liegen bereits vor: lead (oben gelesen) + die zwei, die wir
    // gerade selbst gesetzt haben.
    const fertig = { ...lead, status: 'ready', r2_prefix: r2Prefix };
    await mirrorToCrm(env.DB, fertig, env.PUBLIC_ORIGIN);
    await notifyFounders(env, fertig, 'ready');

    return { ok: true };
  } catch (err) {
    // Nie still: ihre Stille verraet uns nichts, dieser Log schon.
    console.error('[generate] Generierung endgueltig fehlgeschlagen, Lead', lead.id, err);
    await markiereFehler(env.DB, token, 'render');
    // Founder-Alarm (Spec §9): sie hat bestaetigt und bekommt nichts. Wenn WIR das
    // nicht erfahren, erfaehrt es niemand — sie meldet sich nicht, sie hoert auf.
    try {
      await notifyFounders(env, lead, 'GENERIERUNG FEHLGESCHLAGEN');
    } catch (mailErr) {
      console.error('[generate] Founder-Alarm ging auch nicht raus:', mailErr);
    }
    return { ok: false, grund: 'render' };
  }
}

/**
 * Treibt den Build-Screen. `done` wird aus den TATSAECHLICH in R2 liegenden
 * Bildern gezaehlt — ein geschaetzter Balken ist ein geloger Balken.
 */
export async function buildStatus(env, token) {
  const lead = await findByToken(env.DB, token);
  if (!lead) return { state: 'not_found', step: '', done: 0, total: FRAME_IDS.length };

  let done = 0;
  let images = [];
  try {
    // +5 Puffer, damit auch bei allen Frames + content.json nichts abgeschnitten wird.
    const liste = await env.IMAGES.list({ prefix: `free/${token}/`, limit: FRAME_IDS.length + 5 });
    // NUR .jpg-Frames zaehlen: content.json (die Captions) liegt im selben Prefix und
    // wuerde den Fortschritt sonst faelschlich hochzaehlen (z. B. 21/21 bei 20 Bildern).
    images = (liste.objects || []).map((o) => o.key).filter((k) => k.endsWith('.jpg')).sort();
    done = images.length;
  } catch (err) {
    console.error('[generate] R2 nicht lesbar:', err);
  }

  // handle/vorname treiben die Personalisierung des Vorschau-Chromes (@handle statt
// "dein.profil", Vorname im Reveal). Nur diese zwei: der Handle ist ohnehin
// oeffentlich, der Vorname ist ihr eigener — beides bekommt nur, wer ihren Token
// hat (die Besucherin selbst, aus dem Mail-Redirect). E-Mail/Thema bleiben draussen.
  // handle/vorname personalisieren das Chrome; name/email fuellen (nur ihre eigenen
  // Angaben, hinter ihrem Token) den Erstgespraech-CTA vor, damit sie sie nicht
  // erneut tippen muss.
  const vorname = String(lead.name || '').trim().split(/\s+/)[0] || '';
  // Leit-Welt (erste Palette) fuer den Build-Screen: die Platzhalter-Kacheln
  // waren hart auf Creme/Terracotta verdrahtet — wer "mutig" + eigene Farbe
  // waehlte, sah beim Warten die FALSCHEN Farben und dann einen Sprung, sobald
  // die echten Frames landeten. derivePalettes ist rein und billig.
  const [welt] = derivePalettes(lead.stimmung, lead.farbe);
  const basis = {
    state: lead.status, step: lead.build_step || '', done, total: FRAME_IDS.length,
    handle: lead.handle || '', vorname, name: lead.name || '', email: lead.email || '',
    welt: { paper: welt.paper, ink: welt.ink, inkSoft: welt.inkSoft, accent: welt.accent },
  };
  if (lead.status === 'ready') return { ...basis, images };
  // grund (Moderation vs. Render, siehe markiereFehler oben) macht den Build-Screen
  // faehig, eine Sackgasse ("nochmal" bei abgelehntem Thema = derselbe Reject) von
  // einem echten Retry-Fall zu unterscheiden (Plan 3 Task 5).
  if (lead.status === 'failed') return { ...basis, grund: lead.fail_reason || '' };
  return basis;
}

/**
 * Spiegelt den Lead als submissions-Zeile ins CRM.
 *
 * Kein neues UI noetig: das CRM zeigt submissions bereits an — die Zeile taucht
 * automatisch im Eingang auf. Non-fatal: ein kaputter Spiegel darf ihre fertigen
 * Bilder nicht kosten.
 */
/** Instagram-Handle ohne fuehrendes @ — die Karte speichert ihn als Profil-URL. */
function handlePur(lead) {
  return String(lead.handle || '').replace(/^@+/, '');
}

/**
 * Feldformate der CRM-Oberflaeche (`_portal/admin.js`): `accounts` wird als
 * {label,path,note} gelesen, `deck_paths` als {label,href}. Nackte Strings ergeben
 * dort leere, kaputt aussehende Zeilen — am 27.07. beim Anlegen der ersten Karte
 * von Hand aufgefallen.
 */
function kontoListe(lead) {
  const h = handlePur(lead);
  return h ? [{ label: 'Instagram', path: `https://instagram.com/${h}`, note: `@${h}` }] : [];
}

function linkListe(lead, feedUrl) {
  const h = handlePur(lead);
  return [
    ...(feedUrl ? [{ label: '🎁 Ihr Free-Content-Feed', href: feedUrl }] : []),
    ...(h ? [{ label: '📸 Instagram', href: `https://instagram.com/${h}` }] : []),
  ];
}

export async function mirrorToCrm(db, lead, publicOrigin = '') {
  const feedUrl = publicOrigin ? `${publicOrigin}/r/${lead.token}` : '';
  const md =
    '# Free-Content-Lead\n\n' +
    `- **Instagram:** @${handlePur(lead)}\n` +
    `- **Thema:** ${lead.branche}\n` +
    `- **Ziel:** ${lead.ziel}\n` +
    (lead.stand ? `- **Wo sie heute steht:** ${lead.stand}\n` : '') +
    `- **Stimmung:** ${lead.stimmung}\n` +
    (lead.farbe ? `- **Wunschfarbe:** ${lead.farbe}\n` : '') +
    (lead.testimonial_consent ? `- **✅ Testimonial-Einverständnis:** ja (Vorschau darf öffentlich gezeigt werden)\n` : '') +
    (lead.source ? `- **Kam über:** ${lead.source}\n` : '') +
    (feedUrl ? `- **Ihr Feed:** ${feedUrl}\n` : '') +
    `- **Bilder:** ${lead.r2_prefix || '(noch keine)'}\n`;

  // Kundenkarte: ohne sie ist der Lead im CRM unauffindbar (nur eine lose Zeile im
  // Eingang) UND die Closing-KI kann nicht laufen — sie haengt an der Karte. Muster
  // aus `_portal/_worker.js:1084`, wo das Portal dasselbe fuer Briefings tut, damit
  // die Zeile aussieht wie jede andere. Stufe bewusst 'briefing': die Oberflaeche
  // kennt keine Stufe davor und wuerde Unbekanntes beim ersten Speichern zurueckwerfen.
  // Nicht-fatal: scheitert es, bleibt wenigstens der Eingang.
  let clientId = null;
  try {
    const vorhanden = await db.prepare('SELECT id FROM clients WHERE contact=?').bind(lead.email).first();
    if (vorhanden) {
      clientId = vorhanden.id;
    } else {
      const notiz =
        'Automatisch aus Free-Content-Funnel' +
        (lead.ziel ? ` · Ziel: ${lead.ziel}` : '') +
        (lead.stimmung ? ` · Stimmung: ${lead.stimmung}` : '');
      const angelegt = await db
        .prepare(
          `INSERT INTO clients (name, niche, status, accounts, password, deck_paths, contact, notes,
                                package, service, upsell, upsell_flag, logo_key, updated_at)
           VALUES (?, ?, 'briefing', ?, '', ?, ?, ?, '', '', '', 0, '', datetime('now'))`
        )
        .bind(
          lead.name,
          lead.branche || '',
          JSON.stringify(kontoListe(lead)),
          JSON.stringify(linkListe(lead, feedUrl)),
          lead.email,
          notiz
        )
        .run();
      clientId = angelegt.meta?.last_row_id ?? null;
    }
  } catch (err) {
    console.error('[generate] Kundenkarte konnte nicht angelegt werden, Lead', lead.id, err);
  }

  const daten = JSON.stringify({
    handle: lead.handle, branche: lead.branche, ziel: lead.ziel,
    stimmung: lead.stimmung, farbe: lead.farbe, stand: lead.stand,
    testimonial_consent: lead.testimonial_consent, source: lead.source,
    token: lead.token, r2_prefix: lead.r2_prefix,
  });

  // Eine ERNEUTE Generierung (Retry, manueller Neu-Anstoss) darf den Eingang nicht
  // doppeln — am 27.07. live passiert, die Dublette musste von Hand geloescht werden.
  //
  // Schluessel ist die E-Mail, NICHT der Token im data-JSON: `data LIKE '%"token":"…"%'`
  // scheitert auf D1 mit "LIKE or GLOB pattern too complex" (der 64-stellige Token
  // sprengt die Musterlaenge). Der Fehler landete im catch, und angelegt wurde
  // trotzdem — ein Schutz, der still nichts tut. free_leads hat einen eindeutigen
  // Index auf die Mail, zwei Leads koennen sich also keine teilen.
  try {
    const schonDa = await db
      .prepare("SELECT id FROM submissions WHERE type='free_content' AND email=?")
      .bind(lead.email)
      .first();
    if (schonDa) {
      await db
        .prepare('UPDATE submissions SET payload=?, data=?, client_id=COALESCE(client_id, ?) WHERE id=?')
        .bind(md, daten, clientId, schonDa.id)
        .run();
      return;
    }
  } catch (err) {
    // Nicht-fatal: im Zweifel lieber eine Zeile zu viel als gar keine.
    console.error('[generate] Dublettenpruefung fehlgeschlagen, lege neu an:', err);
  }

  try {
    await db
      .prepare(
        "INSERT INTO submissions (type, client_id, name, email, payload, data, status) VALUES ('free_content', ?, ?, ?, ?, ?, 'new')"
      )
      .bind(clientId, lead.name, lead.email, md, daten)
      .run();
  } catch (err) {
    console.error('[generate] CRM-Spiegel fehlgeschlagen, Lead', lead.id, err);
  }

  // Ohne diese zwei Zeilen endet der Funnel im Nichts: der erste echte Lead lag
  // einen ganzen Tag unangetastet im Eingang, weil niemand und nichts darauf
  // reagierte. Das CRM hat beide Bausteine seit jeher — `activity` als Verlauf und
  // `events` mit dem Typ 'follow_up' als Wiedervorlage. Sie wurden nur nie befuellt.
  // Bewusst NUR beim ersten Mal (der Aktualisierungs-Zweig oben kehrt vorher um):
  // eine Neu-Generierung ist kein neuer Lead und braucht keine zweite Wiedervorlage.
  if (clientId) {
    const wann = new Date(Date.now() + FOLLOWUP_TAGE * 86400000).toISOString().slice(0, 10);
    try {
      await db
        .prepare('INSERT INTO activity (client_id, text) VALUES (?, ?)')
        .bind(
          clientId,
          `Gratis-Vorschau erstellt${lead.branche ? ` · Thema: ${lead.branche}` : ''}` +
            (feedUrl ? ` · ${feedUrl}` : '')
        )
        .run();
    } catch (err) {
      console.error('[generate] Verlaufseintrag fehlgeschlagen, Lead', lead.id, err);
    }
    try {
      await db
        .prepare(
          "INSERT INTO events (client_id, title, date, time, type, note, done) VALUES (?, ?, ?, '', 'follow_up', ?, 0)"
        )
        .bind(
          clientId,
          `Nachfassen: Gratis-Vorschau ${lead.name}`,
          wann,
          `Hat sie ihre Vorschau angesehen? Feed: ${feedUrl || '(kein Link)'}`
        )
        .run();
    } catch (err) {
      console.error('[generate] Wiedervorlage fehlgeschlagen, Lead', lead.id, err);
    }
  }
}
