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
  stand         TEXT DEFAULT '',
  consent       INTEGER NOT NULL DEFAULT 0,
  testimonial_consent INTEGER NOT NULL DEFAULT 0,
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
  reported_at   TEXT,
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

-- Kundenkarten. Aus der PRODUKTION uebernommen (27.07.2026), damit der Spiegel
-- gegen dieselbe Form testet, die er live beschreibt. Nur die Spalten, die der
-- Funnel anfasst, plus die NOT-NULL-Pflichtfelder.
-- accounts:   JSON [{ "label": "...", "path": "...", "note": "..." }]
-- deck_paths: JSON [{ "label": "...", "href": "..." }]
CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  niche      TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'briefing',
  accounts   TEXT DEFAULT '[]',
  password   TEXT DEFAULT '',
  deck_paths TEXT DEFAULT '[]',
  contact    TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  package     TEXT DEFAULT '',
  service     TEXT DEFAULT '',
  upsell      TEXT DEFAULT '',
  upsell_flag INTEGER DEFAULT 0,
  logo_key    TEXT DEFAULT ''
);

-- Wiedervorlagen und Verlauf. Aus der PRODUKTION uebernommen (27.07.2026).
-- events.type kennt: call | follow_up | deadline | note; date ist YYYY-MM-DD
-- (das Portal validiert das per Regex, siehe _worker.js:3171).
CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  title     TEXT NOT NULL,
  date      TEXT NOT NULL,
  time      TEXT DEFAULT '',
  type      TEXT NOT NULL DEFAULT 'note',
  note      TEXT DEFAULT '',
  done      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
