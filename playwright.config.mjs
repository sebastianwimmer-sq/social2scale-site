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
  webServer: {
    command: 'python3 -m http.server 8899',
    url: 'http://localhost:8899/',
    reuseExistingServer: true,
    timeout: 20000,
  },
  use: { baseURL: 'http://localhost:8899' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
};
