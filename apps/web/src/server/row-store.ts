import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Row as SqlRow } from "effect/sql/SqlConnection"

import { RowValues, checkCell } from "@/domain/collection"
import type { CellValue, Collection, Row, RowPage } from "@/domain/collection"
import {
  InvalidCellValue,
  InvalidQuery,
  PropertyNotFound,
  RowNotFound,
} from "@/domain/errors"
import type { CollectionNotFound, StorageError } from "@/domain/errors"
import { CollectionId, RowId, newId } from "@/domain/ids"
import type { PropertyId } from "@/domain/ids"
import type { Filter, SortSpec } from "@/domain/query"

import { CollectionStore } from "./collection-store"
import { compileWhere } from "./query-compiler"
import { decodeStored, now, withStorageError } from "./storage"

const RowValuesJson = Schema.fromJsonString(RowValues)
const encodeValues = Schema.encodeSync(RowValuesJson)

const decodeRow = decodeStored(
  Schema.Struct({ id: RowId, data: RowValuesJson, created_at: Schema.Finite })
)

const decodeOwner = decodeStored(Schema.Struct({ collection_id: CollectionId }))
const decodeCount = decodeStored(Schema.Struct({ total: Schema.Finite }))

/**
 * D1 binds at most 100 parameters per statement. A row insert binds 5, so
 * a batch of 20 rows stays under the limit.
 */
const insertBatchSize = 20

/** One bound parameter per id; stays under the D1 limit of 100. */
const deleteBatchSize = 90

export class RowStore extends Context.Service<
  RowStore,
  {
    /** One page of rows that match every filter, oldest first. */
    readonly page: (
      collection: Collection,
      filters: ReadonlyArray<Filter>,
      sort: SortSpec | null,
      offset: number,
      limit: number
    ) => Effect.Effect<RowPage, InvalidQuery | StorageError>
    /** Checks every value against the collection schema, then inserts the rows. */
    readonly insert: (
      collection: Collection,
      rows: ReadonlyArray<RowValues>
    ) => Effect.Effect<
      ReadonlyArray<Row>,
      InvalidCellValue | PropertyNotFound | StorageError
    >
    readonly setCell: (
      rowId: RowId,
      propertyId: PropertyId,
      value: CellValue
    ) => Effect.Effect<
      void,
      | RowNotFound
      | CollectionNotFound
      | PropertyNotFound
      | InvalidCellValue
      | StorageError
    >
    readonly remove: (
      rowIds: ReadonlyArray<RowId>
    ) => Effect.Effect<void, StorageError>
  }
>()("dynamic-report/RowStore") {}

const validate = (
  collection: Collection,
  propertyId: string,
  value: CellValue
) =>
  Effect.gen(function* () {
    const property = collection.properties.find(
      (candidate) => candidate.id === propertyId
    )

    if (property === undefined)
      return yield* new PropertyNotFound({ propertyId })

    const expected = checkCell(property.type, value)

    if (Option.isSome(expected)) {
      return yield* new InvalidCellValue({
        property: property.name,
        expected: expected.value,
      })
    }
  })

/** Sort by a property of the collection, then by insert order. */
const orderBy = (collection: Collection, sort: SortSpec | null) => {
  if (sort === null)
    return Effect.succeed({ text: "created_at, id", params: [] })

  const known = collection.properties.some(
    (property) => property.id === sort.propertyId
  )

  return known
    ? Effect.succeed({
        text: `json_extract(data, ?) ${sort.direction === "asc" ? "ASC" : "DESC"}, created_at, id`,
        params: [`$.${sort.propertyId}`],
      })
    : Effect.fail(
        new InvalidQuery({
          reason: "The sort uses a property that no longer exists.",
        })
      )
}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  const collections = yield* CollectionStore

  return RowStore.of({
    page: (collection, filters, sort, offset, limit) =>
      Effect.gen(function* () {
        const order = yield* orderBy(collection, sort)

        const where = yield* compileWhere({
          collection,
          filters,
          timeField: null,
          timeRange: "all",
          now: now(),
        })

        return yield* withStorageError(
          Effect.gen(function* () {
            const [countRow] = yield* sql.unsafe<SqlRow>(
              `SELECT count(*) AS total FROM rows WHERE ${where.text}`,
              where.params
            )

            const { total } = yield* decodeCount(countRow)

            const stored = yield* sql.unsafe<SqlRow>(
              `SELECT id, data, created_at FROM rows WHERE ${where.text}
               ORDER BY ${order.text} LIMIT ? OFFSET ?`,
              [...where.params, ...order.params, limit, offset]
            )

            const rows = yield* Effect.forEach(stored, (raw) =>
              decodeRow(raw).pipe(
                Effect.map(({ id, data, created_at }) => ({
                  id,
                  values: data,
                  createdAt: created_at,
                }))
              )
            )

            const nextOffset = offset + rows.length

            return {
              rows,
              total,
              nextOffset: nextOffset < total ? nextOffset : null,
            }
          })
        )
      }),
    insert: (collection, inputs) =>
      Effect.gen(function* () {
        for (const values of inputs) {
          for (const [propertyId, value] of Object.entries(values)) {
            yield* validate(collection, propertyId, value)
          }
        }

        const createdAt = now()

        const rows: ReadonlyArray<Row> = inputs.map((values, index) => ({
          id: newId.row(),
          values,
          // Keep insert order stable inside one batch.
          createdAt: createdAt + index,
        }))

        yield* withStorageError(
          Effect.forEach(
            Arr.chunksOf(rows, insertBatchSize),
            (batch) =>
              sql`INSERT INTO rows ${sql.insert(
                Arr.map(batch, (row) => ({
                  id: row.id,
                  collection_id: collection.id,
                  data: encodeValues(row.values),
                  created_at: row.createdAt,
                  updated_at: row.createdAt,
                }))
              )}`,
            { discard: true }
          )
        )

        return rows
      }),
    setCell: (rowId, propertyId, value) =>
      Effect.gen(function* () {
        const owner = (yield* withStorageError(
          sql`SELECT collection_id FROM rows WHERE id = ${rowId}`
        )).at(0)

        if (owner === undefined) return yield* new RowNotFound({ rowId })

        const { collection_id } = yield* decodeOwner(owner)
        const collection = yield* collections.get(collection_id)

        yield* validate(collection, propertyId, value)

        yield* withStorageError(
          sql`UPDATE rows
            SET data = json_set(data, ${`$.${propertyId}`}, json(${JSON.stringify(value)})),
                updated_at = ${now()}
            WHERE id = ${rowId}`
        )
      }),
    remove: (rowIds) =>
      withStorageError(
        Effect.forEach(
          Arr.chunksOf(rowIds, deleteBatchSize),
          (batch) => sql`DELETE FROM rows WHERE ${sql.in("id", batch)}`,
          { discard: true }
        )
      ),
  })
})

export const RowStoreLive = Layer.effect(RowStore, make)
