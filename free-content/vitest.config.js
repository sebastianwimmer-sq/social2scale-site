import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.js'],
      // Schwellen sind ein Boden, keine Zielmarke. Wenn ein Lauf sie reisst:
      // Tests ergaenzen, NICHT die Schwelle senken.
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
    poolOptions: {
      workers: {
        // Test-Config = wrangler.toml OHNE [[queues.consumers]]. Grund: mit Consumer
        // liefert Miniflare die im Confirm-Pfad gesendete Queue-Nachricht NACH dem
        // Testlauf an queue() aus → generateFor laeuft gegen die abgeraeumte Test-D1
        // ("no such table") und reisst das Isolated-Storage. So wird nur produziert
        // (Nachricht abgelegt), nicht verarbeitet; die queue()-Logik testen wir separat.
        wrangler: { configPath: './wrangler.test.toml' },
        miniflare: {
          // Lokale D1 im Test — lenkt die database_id aus wrangler.toml auf eine
          // Test-DB um. DIESE Zeile ist noetig: ohne sie zeigt das Binding auf die
          // produktive s2s-crm.
          d1Databases: { DB: 'test-db' },
          // Bewusst KEIN r2Buckets-Eintrag: vitest-pool-workers materialisiert die
          // Bindings automatisch aus wrangler.toml, und Miniflare simuliert R2
          // immer lokal. Ein Eintrag hier waere tote Konfiguration, die so aussieht,
          // als wuerde sie schuetzen. (Verifiziert gegen die Cloudflare-Doku, 15.07.)
        },
      },
    },
  },
});
