// Visueller Regressionsschutz fuer den Shell-Port.
// Es gibt bewusst keine lokale Installation: @playwright/test liegt global.
// Aufruf: NODE_PATH=/opt/homebrew/lib/node_modules npx --no-install playwright test
export default {
  testDir: './tests',
  // Basisbilder neben den Tests, nach Browser getrennt.
  snapshotPathTemplate: '{testDir}/basis/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: {
      // 0,1 % — deckt Schrift-Rasterung ab, schlaegt bei echter Verschiebung an.
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    },
  },
  // Eigener Server, damit der Test nicht von einem laufenden Terminal abhaengt.
  //
  // Port 8899 war hier bis zum 03.08.2026 eingetragen — und wurde am 03.08. von
  // einem Server der zweiten Session belegt, der ~/s2s-kunden/_portal auslieferte.
  // Zusammen mit reuseExistingServer:true hat Playwright diesen Fremdserver
  // uebernommen und haette die Basisbilder gegen ein voellig anderes Projekt
  // verglichen — ohne eine einzige Warnung. Zwei Konsequenzen:
  //   1. Eigener, unverwechselbarer Port statt der naheliegenden 88xx-Reihe.
  //   2. reuseExistingServer:false — ist der Port belegt, soll der Lauf laut
  //      abbrechen. Ein lauter Abbruch ist besser als ein gruener Vergleich
  //      gegen die falsche Seite.
  webServer: {
    command: 'python3 -m http.server 8917',
    url: 'http://localhost:8917/',
    reuseExistingServer: false,
    timeout: 20000,
  },
  use: { baseURL: 'http://localhost:8917' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
};
