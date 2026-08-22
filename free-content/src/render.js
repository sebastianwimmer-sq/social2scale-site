/**
 * Browser Rendering → R2. Der einzige Ort, der beide kennt.
 *
 * EIN Browser-Start (mehrere Kaltstarts waeren teuer), aber die 21 Frames werden
 * auf MEHRERE Seiten (Tabs) verteilt und PARALLEL geschossen — die Screenshots
 * (CDP-Roundtrip + JPEG-Encode je Frame) sind der Flaschenhals, seriell dauerten
 * sie ~50-70s. Zusaetzlich werden die R2-Uploads NICHT einzeln abgewartet, sondern
 * gesammelt und am Ende gebuendelt (sie ueberlappen so mit den naechsten Shots).
 * Ziel: die Wartezeit unter der Absprung-Schwelle halten (Sebi: 2min = Abbruch).
 */

import puppeteer from '@cloudflare/puppeteer';
import { buildPage, FRAME_IDS } from './templates/frames.js';

const BILD_TYP = 'image/jpeg';
const QUALITAET = 90;
// Wie viele Seiten (Tabs) parallel schiessen. 3 teilt 21 Frames in ~7er-Buckets;
// hoeher = mehr Speicher/Seite gegen die Browser-Rendering-Grenze. Bewusst moderat.
const PARALLEL_SEITEN = 3;

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
  // shareUrl = Funnel-Einstieg fuer den QR auf der Share-Card (viraler Loop).
  const shareUrl = env.PUBLIC_ORIGIN || 'https://social2scale.com';
  let browser;
  const keys = [];
  const uploads = [];   // R2-Puts gesammelt, am Ende gebuendelt abgewartet
  let fertig = 0;

  // Frames per Round-Robin auf N Buckets verteilen -> jede Seite ~gleich viele.
  const buckets = Array.from({ length: PARALLEL_SEITEN }, () => []);
  FRAME_IDS.forEach((id, i) => buckets[i % PARALLEL_SEITEN].push(id));

  // Eine Seite: baut NUR ihre eigenen Frames (kleines DOM statt 3× das volle —
  // sonst Speicher-Ueberlauf/Ausfall der Browser-Rendering-Instanz), wartet auf
  // Fonts, schiesst ihren Bucket.
  async function schiesseBucket(browserRef, ids) {
    const bucketHtml = buildPage(clean, copy, palettes, shareUrl, new Set(ids));
    const page = await browserRef.newPage();
    try {
      await page.setViewport({ width: 1200, height: 1400 });
      await page.setContent(bucketHtml, { waitUntil: 'networkidle0' });
      // Ohne das rendert Chrome die Fallback-Schrift — und Look B ohne Space
      // Grotesk ist nicht Look B. Steht so in design/README.md.
      await page.evaluate(() => document.fonts.ready);

      for (const id of ids) {
        const el = await page.$('#' + id);
        if (!el) throw new Error(`Frame ${id} fehlt in der gebauten Seite`);

        const bild = await el.screenshot({ type: 'jpeg', quality: QUALITAET });
        const key = r2Key(token, id);
        keys.push(key);
        // NICHT inline awaiten: der Upload laeuft, waehrend der naechste Screenshot
        // schon entsteht. Fehler eines Uploads schlaegt beim finalen Promise.all durch.
        uploads.push(env.IMAGES.put(key, bild, { httpMetadata: { contentType: BILD_TYP } }));

        if (onProgress) onProgress(++fertig, FRAME_IDS.length);
      }
    } finally {
      try { await page.close(); } catch (err) { console.error('[render] Seite liess sich nicht schliessen:', err); }
    }
  }

  try {
    browser = await puppeteer.launch(env.BROWSER);
    // Alle Buckets gleichzeitig -> die Screenshots der Seiten ueberlappen.
    await Promise.all(buckets.map((ids) => schiesseBucket(browser, ids)));
    // Erst wenn ALLE Bilder wirklich in R2 liegen, ist der Lauf fertig — 'ready'
    // (generate.js) haengt daran, und buildStatus zaehlt echte R2-Objekte.
    await Promise.all(uploads);
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
