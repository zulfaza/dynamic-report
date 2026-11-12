import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Row as SqlRow } from "effect/sql/SqlConnection"

import { RowValues } from "@/domain/collection"
import type {
  CollectionNotFound,
  InvalidQuery,
  StorageError,
} from "@/domain/errors"
import { FrameValue } from "@/domain/query"
import type { OwnerId } from "@/domain/ids"
import type { Frame, Query, TimeRange } from "@/domain/query"

import { CollectionStore } from "./collection-store"
import { compileQuery } from "./query-compiler"
import { decodeStored, now, withStorageError } from "./storage"

const decodeDataRows = decodeStored(
  Schema.Array(Schema.Struct({ data: Schema.fromJsonString(RowValues) }))
)

const decodeValues = decodeStored(Schema.Array(Schema.Array(FrameValue)))

export class QueryEngine extends Context.Service<
  QueryEngine,
  {
    /** Runs the query on a collection of the owner. */
    readonly run: (
      owner: OwnerId,
      query: Query,
      timeRange: TimeRange
    ) => Effect.Effect<Frame, CollectionNotFound | InvalidQuery | StorageError>
  }
>()("dynamic-report/QueryEngine") {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  const collections = yield* CollectionStore

  return QueryEngine.of({
    run: (owner, query, timeRange) =>
      Effect.gen(function* () {
        const collection = yield* collections.get(owner, query.collectionId)

        const compiled = yield* compileQuery(query, {
          collection,
          timeRange,
          now: now(),
        })

        const statement = sql.unsafe<SqlRow>(
          compiled.sql.text,
          compiled.sql.params
        )

        const fields = compiled.columns.map((column) => column.field)

        if (query._tag === "rows") {
          const stored = yield* decodeDataRows(
            yield* withStorageError(statement)
          )

          return {
            fields,
            rows: stored.map(({ data }) =>
              collection.properties.map(
                (property, index) =>
                  compiled.columns[index]?.fromSql(data[property.id] ?? null) ??
                  null
              )
            ),
          }
        }

        const values = yield* decodeValues(
          yield* withStorageError(statement.values)
        )

        return {
          fields,
          rows: values.map((row) =>
            row.map(
              (value, index) => compiled.columns[index]?.fromSql(value) ?? value
            )
          ),
        }
      }),
  })
})

export const QueryEngineLive = Layer.effect(QueryEngine, make)
