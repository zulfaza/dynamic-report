-- Row values live in one JSON column keyed by property id. A schema change
-- (add, rename, retype a property) touches no rows. Queries read values with
-- `json_extract`; add an expression index for a hot property when a
-- collection grows.
--
-- `IF NOT EXISTS` keeps this safe on databases that the old runtime
-- bootstrap already created.

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  properties TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rows (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rows_by_collection ON rows (collection_id, created_at);

CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  spec TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
