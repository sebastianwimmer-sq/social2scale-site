/**
 * Rendering-Smoke fuer die Free-Content-Erlebnis-Seiten (Plan 3).
 * Rendert das echte `formPage(env)`-HTML (keine wrangler-dev-Bindings noetig,
 * die Seite selbst ist statisch) in eine Temp-Datei, laedt sie bei 390px und
 * 1440px mit Playwright und prueft: Logo sichtbar, Handy-Vorschau sichtbar,
 * keine Konsolen-Fehler, kein horizontaler Overflow. Screenshots landen unter
 * design/prototypes/_smoke-form-{390,1440}.png fuer die manuelle Kontrolle.
 *
 * Aufruf: node test/render-pages.mjs
 */

import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formPage } from '../src/pages/form.js';

// Robuster Playwright-Resolver: lokal → Homebrew → graceful skip
let chromium;
try {
  // Versuche lokale Installation
  const pw = await import('playwright');
  chromium = pw.chromium;
} catch (err1) {
  try {
    // Fallback auf Homebrew-Installation
    const pw = await import('/opt/homebrew/lib/node_modules/playwright/index.js');
    chromium = pw.default.chromium;
  } catch (err2) {
    // Beide fehlgeschlagen — graceful skip
    console.warn('[smoke] playwright nicht gefunden — Rendering-Smoke uebersprungen. Optional installieren: npm i -D playwright');
    process.exit(0);
  }
}

const VIEWPORTS = [
  { width: 390, height: 844, label: '390' },
  { width: 1440, height: 900, label: '1440' },
];

const SCREENSHOT_DIR = new URL('../design/prototypes/', import.meta.url);

// Cloudflares dokumentierter Dummy-Sitekey fuer Tests (rendert ueberall, auch
// file://, immer "bestanden") — NUR fuer diesen Smoke-Test. Der echte
// Sitekey aus wrangler.toml ist domain-gebunden (social2scale.com/*) und
// wirft ausserhalb davon TurnstileError 110200 (kein Produktbug, nur Testumfeld).
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const SMOKE_TEST_TURNSTILE_KEY = '1x00000000000000000000AA';

async function buildTempHtmlFile() {
  const env = { TURNSTILE_SITE_KEY: SMOKE_TEST_TURNSTILE_KEY };
  const res = formPage(env);
  const html = await res.text();
  const dir = await mkdtemp(join(tmpdir(), 'free-content-smoke-'));
  const filePath = join(dir, 'form.html');
  await writeFile(filePath, html, 'utf-8');
  return filePath;
}

async function checkViewport(browser, fileUrl, viewport) {
  const consoleErrors = [];
  const pageErrors = [];

  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(fileUrl);
  // Intro-Animationen (rise/pop) sind kurz — kurz warten, bis der erste Schritt steht.
  await page.waitForTimeout(500);

  const logo = page.locator('.wm-logo');
  const logoVisible = await logo.isVisible();
  const logoBox = await logo.boundingBox();
  const logoInBounds =
    !!logoBox &&
    logoBox.x >= 0 &&
    logoBox.y >= 0 &&
    logoBox.x + logoBox.width <= viewport.width + 1 &&
    logoBox.y + logoBox.height <= viewport.height + 1;

  const device = page.locator('.device');
  const deviceVisible = await device.isVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );

  const screenshotPath = fileURLToPath(new URL(`_smoke-form-${viewport.label}.png`, SCREENSHOT_DIR));
  await page.screenshot({ path: screenshotPath, fullPage: false });

  await page.close();

  const problems = [];
  if (!logoVisible || !logoInBounds) problems.push('Logo nicht sichtbar/abgeschnitten');
  if (!deviceVisible) problems.push('Handy-Vorschau nicht sichtbar');
  if (hasOverflow) problems.push('horizontaler Overflow');
  if (consoleErrors.length) problems.push(`Konsolen-Fehler: ${consoleErrors.join(' | ')}`);
  if (pageErrors.length) problems.push(`Seiten-Fehler: ${pageErrors.join(' | ')}`);

  return { viewport: viewport.label, problems, screenshotPath };
}

async function main() {
  const filePath = await buildTempHtmlFile();
  const fileUrl = `file://${filePath}`;

  const browser = await chromium.launch();
  try {
    const results = [];
    for (const viewport of VIEWPORTS) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await checkViewport(browser, fileUrl, viewport));
    }

    let failed = false;
    for (const r of results) {
      if (r.problems.length) {
        failed = true;
        console.error(`[render-pages] ${r.viewport}px FAIL: ${r.problems.join('; ')}`);
      } else {
        console.log(`[render-pages] ${r.viewport}px ok — Screenshot: ${r.screenshotPath}`);
      }
    }

    if (failed) {
      console.error('[render-pages] FAIL');
      process.exitCode = 1;
    } else {
      console.log('ok');
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[render-pages] Abbruch:', err);
  process.exitCode = 1;
});
