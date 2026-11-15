-- Reel-Check: Annahme (free-content/src/reel-check.js). Nur additiv.
-- Anwenden: npx wrangler d1 execute s2s-crm --remote --file migrationen/2026-11-15-reel-check.sql
CREATE TABLE IF NOT EXISTS reel_check (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  email_norm TEXT NOT NULL,
  zielgruppe TEXT NOT NULL,
  spricht TEXT NOT NULL,
  lage TEXT NOT NULL,
  sprache TEXT NOT NULL DEFAULT 'de',
  einwilligung_fassung TEXT NOT NULL,
  einwilligung_at TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  mime TEXT NOT NULL,
  upload_id TEXT,
  spam INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'laedt',
  fehler TEXT,
  zahl INTEGER,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  fertig_at TEXT,
  befund_mail_at TEXT,
  geloescht_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reel_check_status ON reel_check (status, updated_at);
CREATE INDEX IF NOT EXISTS reel_check_mail ON reel_check (email_norm, created_at);
