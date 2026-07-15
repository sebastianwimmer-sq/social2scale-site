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
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // Lokale D1 im Test — die produktive DB wird NIE angefasst.
          d1Databases: { DB: 'test-db' },
        },
      },
    },
  },
});
