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
import { createServer } from 'node:http';

import { formPage } from '../src/pages/form.js';
import { resultPage } from '../src/pages/result.js';

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

/**
 * Build-Screen-Smoke (`/r/:token`, Plan 3 Task 3): laedt die echte
 * `resultPage(token)`-Seite ueber einen lokalen HTTP-Server (KEIN file://
 * — der Poller macht einen echten `fetch()`, und file://-Seiten duerfen aus
 * Browser-Sicherheitsgruenden keine anderen file://-URLs fetchen), faengt
 * `/api/status/:token` mit Playwright `route` ab und fuettert es durch die
 * States 0→8 (building → ready), dann `/img/...` mit einem winzigen echten
 * JPEG. Prueft: Kacheln fuellen sich mit echten Bildern, showReveal() feuert.
 */
const RESULT_TOKEN = 'smoketest0123456789abcdef01';
const TOTAL_FRAMES = 8;
// Kleinstes gueltiges 1x1-JPEG (weit verbreitetes Test-Fixture) — nur fuer
// diesen lokalen Smoke-Test, landet nie im ausgelieferten Seiten-HTML.
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

function statusPayload(pollIndex) {
  const done = Math.min(pollIndex, TOTAL_FRAMES);
  if (done >= TOTAL_FRAMES) {
    return {
      state: 'ready',
      step: 'Fertig.',
      done: TOTAL_FRAMES,
      total: TOTAL_FRAMES,
      images: [
        `free/${RESULT_TOKEN}/f-0-profil.jpg`,
        `free/${RESULT_TOKEN}/f-0-s1.jpg`,
        `free/${RESULT_TOKEN}/f-0-s2.jpg`,
        `free/${RESULT_TOKEN}/f-0-s3.jpg`,
      ],
    };
  }
  return { state: 'building', step: `Baue … (${done}/${TOTAL_FRAMES})`, done, total: TOTAL_FRAMES };
}

/** Startet einen lokalen HTTP-Server nur fuer die Dauer von `fn` und gibt seine Basis-URL mit. */
async function withLocalServer(html, fn) {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    return await fn(`http://127.0.0.1:${port}/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function checkBuildScreen(browser) {
  const html = await resultPage(RESULT_TOKEN).text();
  const consoleErrors = [];
  const pageErrors = [];

  return withLocalServer(html, async (baseUrl) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    let pollIndex = 0;
    await page.route('**/api/status/**', async (route) => {
      const body = statusPayload(pollIndex);
      pollIndex++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route('**/img/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from(TINY_JPEG_BASE64, 'base64') });
    });

    await page.goto(baseUrl);

    const problems = [];
    try {
      // Kacheln fuellen sich mit echten Bildern (das Grid pollt alle 1.5s,
      // 8 States brauchen also ~12s — grosszuegiges Timeout).
      await page.waitForFunction(
        () => document.querySelectorAll('.tile.done[data-real="1"]').length >= 3,
        { timeout: 25000 }
      );
    } catch (err) {
      problems.push(`Kacheln fuellten sich nicht mit echten Bildern: ${err.message}`);
    }

    try {
      await page.waitForFunction(() => document.getElementById('bloom').classList.contains('fire'), {
        timeout: 5000,
      });
    } catch (err) {
      problems.push(`showReveal() feuerte nicht: ${err.message}`);
    }

    const screenshotPath = fileURLToPath(new URL('_smoke-build-390.png', SCREENSHOT_DIR));
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await page.close();

    if (consoleErrors.length) problems.push(`Konsolen-Fehler: ${consoleErrors.join(' | ')}`);
    if (pageErrors.length) problems.push(`Seiten-Fehler: ${pageErrors.join(' | ')}`);

    return { viewport: 'build-390', problems, screenshotPath };
  });
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
    results.push(await checkBuildScreen(browser));

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
