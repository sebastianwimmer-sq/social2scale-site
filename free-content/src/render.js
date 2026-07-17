/**
 * Browser Rendering → R2. Der einzige Ort, der beide kennt.
 *
 * ALLE 8 Frames in EINEM Browser-Durchlauf (Muster: kit-build/make-pdfs.cjs):
 * Seite laden → document.fonts.ready → element.screenshot() je Frame.
 * Acht Browser-Starts waeren acht Kaltstarts.
 */

import puppeteer from '@cloudflare/puppeteer';
import { buildPage, FRAME_IDS } from './templates/frames.js';

const BILD_TYP = 'image/jpeg';
const QUALITAET = 92;

/** Nur was wir selbst erzeugen darf in den Key — der Token kommt von aussen. */
function sauber(v) {
  return String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
}

export function r2Key(token, frameId) {
  return `free/${sauber(token)}/${sauber(frameId)}.jpg`;
}

/**
 * @param {Function} [onProgress] (fertig, gesamt) — nach JEDEM Frame.
 * @returns {Promise<string[]>} R2-Keys in Render-Reihenfolge
 */
export async function renderAll(env, token, clean, copy, palettes, onProgress) {
  const html = buildPage(clean, copy, palettes);
  let browser;
  const keys = [];

  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1400 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ohne das rendert Chrome die Fallback-Schrift — und Look B ohne Space
    // Grotesk ist nicht Look B. Steht so in design/README.md.
    await page.evaluate(() => document.fonts.ready);

    for (let i = 0; i < FRAME_IDS.length; i++) {
      const id = FRAME_IDS[i];
      const el = await page.$('#' + id);
      if (!el) throw new Error(`Frame ${id} fehlt in der gebauten Seite`);

      const bild = await el.screenshot({ type: 'jpeg', quality: QUALITAET });
      const key = r2Key(token, id);
      await env.IMAGES.put(key, bild, { httpMetadata: { contentType: BILD_TYP } });
      keys.push(key);

      if (onProgress) onProgress(i + 1, FRAME_IDS.length);
    }
    return keys;
  } finally {
    // Ein nicht geschlossener Browser blockiert eine Session, bis sie ausläuft —
    // und die naechste Besucherin wartet dann auf nichts.
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('[render] Browser liess sich nicht schliessen:', err);
      }
    }
  }
}
