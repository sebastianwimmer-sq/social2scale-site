-- v10 · Free-Content-Funnel: oeffentliche Leads (Spec docs/free-content-funnel-spec.md §8)
-- Additiv + idempotent. Ruehrt bestehende Tabellen NICHT an.

CREATE TABLE IF NOT EXISTS free_leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  email_norm    TEXT NOT NULL,
  handle        TEXT DEFAULT '',
  handle_norm   TEXT DEFAULT '',
  branche       TEXT DEFAULT '',
  ziel          TEXT DEFAULT '',
  stimmung      TEXT DEFAULT '',
  farbe         TEXT DEFAULT '',
  consent       INTEGER NOT NULL DEFAULT 0,
  source        TEXT DEFAULT '',
  token         TEXT NOT NULL,
  token_expires TEXT NOT NULL,
  token_used_at TEXT,
  resend_count  INTEGER NOT NULL DEFAULT 0,
  last_sent_at  TEXT,
  confirmed_at  TEXT,
  generated_at  TEXT,
  chosen_look   TEXT DEFAULT '',
  r2_prefix     TEXT DEFAULT '',
  ip            TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',
  build_step    TEXT NOT NULL DEFAULT '',
  fail_reason   TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mail: hart unique ueber ALLE Zustaende -> erneutes Eintragen updated die Zeile
-- und schickt den Link neu, legt nie eine zweite an (Spec §7 "Wiedereintritt").
CREATE UNIQUE INDEX IF NOT EXISTS idx_free_email ON free_leads(email_norm);

-- Handle: erst ab confirmed sperren, sonst blockiert man fremde Handles mutwillig.
CREATE UNIQUE INDEX IF NOT EXISTS idx_free_handle ON free_leads(handle_norm)
  WHERE handle_norm != '' AND confirmed_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_free_token   ON free_leads(token);
CREATE INDEX        IF NOT EXISTS idx_free_cleanup ON free_leads(status, created_at);

-- Rate-Limiting des oeffentlichen Free-Content-Eingangs (Muster: intake_log)
CREATE TABLE IF NOT EXISTS free_intake_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_free_log_created ON free_intake_log(created_at);
CREATE INDEX IF NOT EXISTS idx_free_log_ip      ON free_intake_log(ip);

-- Der CRM-Eingang. Task 9 spiegelt Leads hierher, damit sie ohne neues UI im CRM
-- auftauchen. Hier bewusst OHNE den FOREIGN KEY auf clients: die Fixture kennt
-- keine clients-Tabelle, und der Fremdschluessel ist nicht das, was wir testen.
-- Die produktive Definition steht in _portal/schema.sql und bleibt unberuehrt.
CREATE TABLE IF NOT EXISTS submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL DEFAULT 'briefing',
  client_id  INTEGER,
  name       TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  payload    TEXT DEFAULT '',
  data       TEXT DEFAULT '{}',
  logo_key   TEXT DEFAULT '',
  rating     INTEGER,
  status     TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- v15 · Free-Content: leichtes Funnel-Tracking (entered/confirmed/ready/cta)
-- Minimal: nur Event-Name, Lead-Token als lose Referenz, Zeitstempel.
CREATE TABLE IF NOT EXISTS funnel_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT NOT NULL,
  token      TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_funnel_event ON funnel_events(event);
