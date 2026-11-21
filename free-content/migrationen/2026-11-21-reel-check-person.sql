-- Reel-Check: Vorname und Plattform (Sebi 21.11.2026: ein Eingabeschirm, persönlicher Befund). Nur additiv.
-- Anwenden VOR dem Deploy: npx wrangler d1 execute s2s-crm --remote --file migrationen/2026-11-21-reel-check-person.sql
ALTER TABLE reel_check ADD COLUMN vorname TEXT NOT NULL DEFAULT '';
ALTER TABLE reel_check ADD COLUMN plattform TEXT NOT NULL DEFAULT 'instagram';
