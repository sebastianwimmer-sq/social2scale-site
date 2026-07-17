import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import { buildPage, FRAME_IDS } from '../src/templates/frames.js';
import { derivePalettes } from '../src/palette.js';
import { buildFallback } from '../src/copy.js';

const clean = { name: 'Dorothea Beekman', handle: 'praxisfunke', branche: 'Coaching für Coaches', ziel: 'Mehr Anfragen', stimmung: 'ruhig' };
const html = buildPage(clean, buildFallback(clean), derivePalettes('ruhig', ''));
writeFileSync('/tmp/vorschau.html', html);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 1400 } });
await p.goto('file:///tmp/vorschau.html', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);   // sonst rendert Chrome die Fallback-Schrift
await p.waitForTimeout(500);
for (const id of FRAME_IDS) {
  const el = await p.$('#' + id);
  const box = await el.boundingBox();
  console.log(id.padEnd(12), Math.round(box.width) + '×' + Math.round(box.height));
  await el.screenshot({ path: `/tmp/vorschau-${id}.png` });
}
await b.close();
