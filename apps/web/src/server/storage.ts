import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type { Row as SqlRow } from "effect/sql/SqlConnection"
import type { SqlError } from "effect/sql/SqlError"

import { StorageError } from "@/domain/errors"

/** Translates SQL failures into the store error vocabulary. */
export const withStorageError = <A, R>(
  effect: Effect.Effect<A, SqlError, R>
): Effect.Effect<A, StorageError, R> =>
  Effect.mapError(effect, (cause) => new StorageError({ cause }))

/**
 * Decodes a value the app wrote itself. A failure means the stored data
 * broke an invariant, so it is a defect and not a domain error.
 */
export const decodeStored = <S extends Schema.Decoder<unknown>>(schema: S) => {
  const decode = Schema.decodeUnknownEffect(schema)

  return (input: StoredValue): Effect.Effect<S["Type"]> =>
    decode(input).pipe(Effect.orDie)
}

/** What the SQL client returns: one row, a list of rows, or value tuples. */
export type StoredValue =
  | SqlRow
  | ReadonlyArray<SqlRow>
  | ReadonlyArray<ReadonlyArray<SqlValue>>

type SqlValue = SqlRow[string]

export const now = () => Date.now()
