CREATE TABLE IF NOT EXISTS listings (
  slug        TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'draft',
  type        TEXT NOT NULL,
  format      TEXT NOT NULL,
  title       TEXT NOT NULL,
  descriptor  TEXT NOT NULL DEFAULT '',
  price       TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT '',
  button_url  TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '[]',
  media       TEXT NOT NULL DEFAULT '[]',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
