import { test, expect } from '@playwright/test';

const SEITEN = [
  { name: 'start', pfad: '/' },
  { name: 'ablauf', pfad: '/ablauf/' },
  { name: 'about', pfad: '/about/' },
  { name: 'fuer-wen', pfad: '/for-you/' },
  { name: 'ergebnisse', pfad: '/results/' },
  { name: 'preise', pfad: '/preise/' },
  // Beide haengen bewusst NICHT an der geteilten Shell: /onboarding/ ist ein
  // Formular mit 20 Feldern und /anfrage/ genauso — weniger Fluchtwege heisst
  // mehr Abschluesse. /danke/ steht hinter dem Kauf. Sie sind hier trotzdem
  // aufgenommen, weil ihre kopierten Fusszeilen auseinanderlaufen koennen: am
  // 04.08.2026 zeigte /danke/ noch auf /#ablauf, obwohl es die Seite /ablauf/
  // laengst gab. Ohne Basisbilder faellt so etwas erst einer Kundin auf.
  { name: 'danke', pfad: '/danke/' },
  { name: 'onboarding', pfad: '/onboarding/' },
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
        // Angepinnte Szenen aufloesen: Playwright scrollt beim Vollseiten-Bild
        // durch den 300vh hohen Track, und je nach Zeitpunkt waere eine andere
        // Tafel aktiv. Aufgeloest sieht die Szene aus wie auf dem Handy —
        // alle Tafeln gestapelt, deterministisch.
        document.querySelectorAll('[data-scene]').forEach((szene) => {
          const track = szene.querySelector('[data-scene-track]');
          if (track) track.style.height = 'auto';
          const pin = szene.querySelector('.pr-scene-pin');
          if (pin) {
            pin.style.position = 'static';
            pin.style.height = 'auto';
            pin.style.display = 'block';
            pin.style.overflow = 'visible';
          }
          const grid = szene.querySelector('.pr-scene-grid');
          if (grid) grid.style.display = 'block';
          const nav = szene.querySelector('.pr-scene-nav');
          if (nav) nav.style.display = 'none';
          const panels = szene.querySelector('.pr-scene-panels');
          if (panels) {
            panels.style.position = 'static';
            panels.style.height = 'auto';
            panels.style.display = 'grid';
            panels.style.gap = '16px';
          }
          szene.querySelectorAll('[data-scene-panel]').forEach((t) => {
            t.style.position = 'static';
            t.style.opacity = '1';
            t.style.transform = 'none';
            t.style.overflow = 'visible';
          });
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
