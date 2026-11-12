import { D1Client } from "@effect/sql-d1"
import { env } from "cloudflare:workers"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as SqlClient from "effect/sql/SqlClient"

/**
 * Schema bootstrap. Each statement is idempotent, so it is safe to run on
 * every isolate start. Replace with versioned migrations after the PoC.
 *
 * CI applies `migrations/*.sql` to the remote database before each deploy.
 * Keep this list in sync with them until local dev also uses migrations.
 *
 * Row values live in one JSON column keyed by property id. A schema change
 * (add, rename, retype a property) touches no rows. Queries read values
 * with `json_extract`; add an expression index for a hot property when a
 * collection grows.
 */
const statements = [
  `CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    properties TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rows (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS rows_by_collection ON rows (collection_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS dashboards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    spec TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
]

const migrate = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  for (const statement of statements) {
    yield* sql.unsafe(statement).raw
  }
})

/** SQL client on the `DB` binding, with the schema in place. */
export const DatabaseLive = Layer.effectDiscard(migrate).pipe(
  Layer.provideMerge(D1Client.layer({ db: env.DB })),
  Layer.orDie
)
