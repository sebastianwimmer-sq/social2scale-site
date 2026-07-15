import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
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
