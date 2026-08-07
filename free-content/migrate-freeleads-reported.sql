-- Eskalations-Knopf (07.08.): Missbrauchs-Meldung direkt aus dem Reveal.
-- reported_at = wann gemeldet; der Claim (WHERE reported_at IS NULL) macht die
-- Meldung idempotent. Ausfuehren auf s2s-crm (remote):
--   npx wrangler d1 execute s2s-crm --remote --file=migrate-freeleads-reported.sql
ALTER TABLE free_leads ADD COLUMN reported_at TEXT;
