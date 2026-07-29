import { test, expect } from '@playwright/test';

const SEITEN = [
  { name: 'start', pfad: '/' },
  { name: 'about', pfad: '/about/' },
  { name: 'fuer-wen', pfad: '/for-you/' },
  { name: 'ergebnisse', pfad: '/results/' },
  { name: 'preise', pfad: '/preise/' },
];
const BREITEN = [390, 768, 1024, 1440];

for (const seite of SEITEN) {
  for (const breite of BREITEN) {
    test(`${seite.name} bei ${breite}px unveraendert`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: 900 });
      await page.goto(seite.pfad, { waitUntil: 'load' });

      // Loader wegblenden und Reveals aufloesen: beide sind zeitabhaengig und
      // wuerden sonst bei jedem Lauf ein anderes Bild ergeben.
      await page.evaluate(() => {
        const l = document.getElementById('loader');
        if (l) l.style.display = 'none';
        document.querySelectorAll('.reveal, .r').forEach((e) => {
          e.style.opacity = '1';
          e.style.transform = 'none';
        });
      });
      await page.waitForTimeout(600);

      await expect(page).toHaveScreenshot(`${seite.name}-${breite}.png`, {
        fullPage: true,
      });
    });
  }
}
