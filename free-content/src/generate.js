/**
 * Orchestriert die Generierung. Kennt keine Interna — delegiert an
 * moderate/copy/palette/render.
 *
 * WIRFT NIE: sie hat gerade ihre Mail bestaetigt. Jeder Fehler landet in einem
 * ehrlichen Status, damit die Seite ihr sagen kann, was Sache ist (Spec §9).
 */

import { checkInput } from './moderate.js';
import { generateCopy } from './copy.js';
import { derivePalettes } from './palette.js';
import { renderAll } from './render.js';
import { findByToken } from './leads.js';
import { notifyFounders } from './mail.js';
import { FRAME_IDS } from './templates/frames.js';
import { RENDER_VERSUCHE, RENDER_BACKOFF_MS } from './constants.js';

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
 */
async function markiereFehler(db, token) {
  try {
    await db
      .prepare("UPDATE free_leads SET status='failed', build_step='', generated_at=NULL WHERE token = ?")
      .bind(token)
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
    await markiereFehler(env.DB, token);
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
    const copy = await generateCopy(env, clean);   // wirft nie, faellt zurueck

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.farben);
    const palettes = derivePalettes(lead.stimmung, lead.farbe);

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.rendern);
    await mitRetry(() => renderAll(env, token, clean, copy, palettes));

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
    await mirrorToCrm(env.DB, fertig);
    await notifyFounders(env, fertig, 'ready');

    return { ok: true };
  } catch (err) {
    // Nie still: ihre Stille verraet uns nichts, dieser Log schon.
    console.error('[generate] Generierung endgueltig fehlgeschlagen, Lead', lead.id, err);
    await markiereFehler(env.DB, token);
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
    const liste = await env.IMAGES.list({ prefix: `free/${token}/`, limit: FRAME_IDS.length });
    images = (liste.objects || []).map((o) => o.key).sort();
    done = images.length;
  } catch (err) {
    console.error('[generate] R2 nicht lesbar:', err);
  }

  const basis = { state: lead.status, step: lead.build_step || '', done, total: FRAME_IDS.length };
  return lead.status === 'ready' ? { ...basis, images } : basis;
}

/**
 * Spiegelt den Lead als submissions-Zeile ins CRM.
 *
 * Kein neues UI noetig: das CRM zeigt submissions bereits an — die Zeile taucht
 * automatisch im Eingang auf. Non-fatal: ein kaputter Spiegel darf ihre fertigen
 * Bilder nicht kosten.
 */
export async function mirrorToCrm(db, lead) {
  const md =
    '# Free-Content-Lead\n\n' +
    `- **Instagram:** @${lead.handle}\n` +
    `- **Thema:** ${lead.branche}\n` +
    `- **Ziel:** ${lead.ziel}\n` +
    `- **Stimmung:** ${lead.stimmung}\n` +
    (lead.farbe ? `- **Wunschfarbe:** ${lead.farbe}\n` : '') +
    (lead.source ? `- **Kam über:** ${lead.source}\n` : '') +
    `- **Bilder:** ${lead.r2_prefix || '(noch keine)'}\n`;

  try {
    await db
      .prepare(
        "INSERT INTO submissions (type, name, email, payload, data, status) VALUES ('free_content', ?, ?, ?, ?, 'new')"
      )
      .bind(
        lead.name,
        lead.email,
        md,
        JSON.stringify({
          handle: lead.handle, branche: lead.branche, ziel: lead.ziel,
          stimmung: lead.stimmung, farbe: lead.farbe, source: lead.source,
          token: lead.token, r2_prefix: lead.r2_prefix,
        })
      )
      .run();
  } catch (err) {
    console.error('[generate] CRM-Spiegel fehlgeschlagen, Lead', lead.id, err);
  }
}
