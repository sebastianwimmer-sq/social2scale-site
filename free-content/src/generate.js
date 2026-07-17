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
  // Der Riegel: ein Doppelklick auf den Bestaetigungslink darf nicht zwei
  // Browser starten.
  if (lead.generated_at) return { ok: false, grund: 'bereits_erzeugt' };

  const clean = {
    name: lead.name, handle: lead.handle, branche: lead.branche,
    ziel: lead.ziel, stimmung: lead.stimmung, farbe: lead.farbe,
  };

  // Schicht 1 der Marken-Sicherung (Spec §5a): unser Logo, unsere Verantwortung.
  const moderation = checkInput(clean);
  if (!moderation.ok) {
    console.error('[generate] Thema abgelehnt:', moderation.grund, 'Lead', lead.id);
    await setzeSchritt(env.DB, token, 'failed', '');
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
    await setzeSchritt(env.DB, token, 'building', SCHRITTE.marke);

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.texte);
    const copy = await generateCopy(env, clean);   // wirft nie, faellt zurueck

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.farben);
    const palettes = derivePalettes(lead.stimmung, lead.farbe);

    await setzeSchritt(env.DB, token, 'building', SCHRITTE.rendern);
    await mitRetry(() => renderAll(env, token, clean, copy, palettes));

    await env.DB
      .prepare("UPDATE free_leads SET status='ready', build_step=?, generated_at=datetime('now'), r2_prefix=? WHERE token=?")
      .bind(SCHRITTE.fertig, `free/${token}/`, token)
      .run();

    return { ok: true };
  } catch (err) {
    // Nie still: ihre Stille verraet uns nichts, dieser Log schon.
    console.error('[generate] Generierung endgueltig fehlgeschlagen, Lead', lead.id, err);
    await setzeSchritt(env.DB, token, 'failed', '');
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
    const liste = await env.IMAGES.list({ prefix: `free/${token}/`, limit: 20 });
    images = (liste.objects || []).map((o) => o.key).sort();
    done = images.length;
  } catch (err) {
    console.error('[generate] R2 nicht lesbar:', err);
  }

  const basis = { state: lead.status, step: lead.build_step || '', done, total: FRAME_IDS.length };
  return lead.status === 'ready' ? { ...basis, images } : basis;
}
