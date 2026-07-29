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
      //
      // WICHTIG: nicht die Stile ueberschreiben, sondern die .on-Klasse setzen,
      // die der echte Beobachter auch setzt. Nur so loesen auch die gestaffelten
      // Kinder (.stagger > *) und die Fuellbalken (.fillbar) auf — sie haengen
      // per CSS am umgebenden .reveal.on. Die frueher benutzte Variante setzte
      // nur opacity und transform und haette die neue Unschaerfe im Startzustand
      // in die Basisbilder gebacken.
      await page.evaluate(() => {
        const l = document.getElementById('loader');
        if (l) l.style.display = 'none';
        document.querySelectorAll('.reveal').forEach((e) => e.classList.add('on'));
        // Ueberschriften-Wisch hat einen EIGENEN Beobachter — ohne .on bliebe
        // die Ueberschrift abgeschnitten im Bild stehen.
        document.querySelectorAll('.wipe').forEach((e) => e.classList.add('on'));
        // Parallax stillegen: Playwright scrollt beim Vollseiten-Bild, das
        // wuerde den Hintergrund je nach Zeitpunkt anders verschieben und den
        // Vergleich launisch machen.
        document.querySelectorAll('[data-parallax]').forEach((e) => {
          e.removeAttribute('data-parallax');
          e.style.transform = 'none';
        });
        document.querySelectorAll('.r').forEach((e) => {
          e.style.opacity = '1';
          e.style.transform = 'none';
          e.style.animation = 'none';
        });
      });
      await page.waitForTimeout(600);

      await expect(page).toHaveScreenshot(`${seite.name}-${breite}.png`, {
        fullPage: true,
      });
    });
  }
}
