-- Reel-Check: freiwillige Handynummer für einen Rückruf von Phil (Sebi 21.11.2026). Nur additiv.
-- Anwenden VOR dem Deploy: npx wrangler d1 execute s2s-crm --remote --file migrationen/2026-11-21b-reel-check-telefon.sql
ALTER TABLE reel_check ADD COLUMN telefon TEXT NOT NULL DEFAULT '';
