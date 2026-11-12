-- Each collection and dashboard has an owner: the WorkOS user id. Rows
-- belong to a collection, so they get their owner from it.
--
-- Rows from before this migration get the empty owner. No user has that
-- id, so these rows are hidden. To give them to a user, run:
--   UPDATE collections SET owner_id = '<user id>' WHERE owner_id = '';
--   UPDATE dashboards SET owner_id = '<user id>' WHERE owner_id = '';

ALTER TABLE collections ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE dashboards ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS collections_by_owner ON collections (owner_id, created_at);

CREATE INDEX IF NOT EXISTS dashboards_by_owner ON dashboards (owner_id, name);
