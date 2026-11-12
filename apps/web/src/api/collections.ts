import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import {
  CellValue,
  Property,
  PropertyType,
  RowValues,
} from "@/domain/collection"
import { CollectionId, PropertyId, RowId, newId } from "@/domain/ids"
import { Filter, SortSpec } from "@/domain/query"
import { CollectionStore, RowStore, runServer } from "@/server/runtime"

const input = <S extends Schema.Decoder<unknown>>(schema: S) =>
  Schema.toStandardSchemaV1(schema)

export const listCollections = createServerFn({ method: "GET" }).handler(() =>
  runServer(CollectionStore.use((store) => store.list))
)

export const getCollection = createServerFn({ method: "GET" })
  .validator(input(Schema.Struct({ collectionId: CollectionId })))
  .handler(({ data }) =>
    runServer(CollectionStore.use((store) => store.get(data.collectionId)))
  )

export const createCollection = createServerFn({ method: "POST" })
  .validator(input(Schema.Struct({ name: Schema.String })))
  .handler(({ data }) =>
    runServer(
      CollectionStore.use((store) =>
        store.create({
          name: data.name,
          properties: [
            { id: newId.property(), name: "Name", type: { _tag: "text" } },
          ],
        })
      )
    )
  )

export const renameCollection = createServerFn({ method: "POST" })
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, name: Schema.String }))
  )
  .handler(({ data }) =>
    runServer(
      CollectionStore.use((store) => store.rename(data.collectionId, data.name))
    )
  )

export const deleteCollection = createServerFn({ method: "POST" })
  .validator(input(Schema.Struct({ collectionId: CollectionId })))
  .handler(({ data }) =>
    runServer(CollectionStore.use((store) => store.remove(data.collectionId)))
  )

export const addProperty = createServerFn({ method: "POST" })
  .validator(
    input(
      Schema.Struct({
        collectionId: CollectionId,
        name: Schema.String,
        type: PropertyType,
      })
    )
  )
  .handler(({ data }) =>
    runServer(
      CollectionStore.use((store) =>
        store.addProperty(data.collectionId, {
          name: data.name,
          type: data.type,
        })
      )
    )
  )

export const updateProperty = createServerFn({ method: "POST" })
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, property: Property }))
  )
  .handler(({ data }) =>
    runServer(
      CollectionStore.use((store) =>
        store.updateProperty(data.collectionId, data.property)
      )
    )
  )

export const removeProperty = createServerFn({ method: "POST" })
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, propertyId: PropertyId }))
  )
  .handler(({ data }) =>
    runServer(
      CollectionStore.use((store) =>
        store.removeProperty(data.collectionId, data.propertyId)
      )
    )
  )

const pageSize = 100

/** POST, because filters are a JSON document. */
export const listRows = createServerFn({ method: "POST" })
  .validator(
    input(
      Schema.Struct({
        collectionId: CollectionId,
        filters: Schema.Array(Filter),
        sort: Schema.NullOr(SortSpec),
        offset: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
      })
    )
  )
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        const collection = yield* CollectionStore.use((store) =>
          store.get(data.collectionId)
        )

        return yield* RowStore.use((store) =>
          store.page(collection, data.filters, data.sort, data.offset, pageSize)
        )
      })
    )
  )

export const addRow = createServerFn({ method: "POST" })
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, values: RowValues }))
  )
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        const collection = yield* CollectionStore.use((store) =>
          store.get(data.collectionId)
        )

        const [row] = yield* RowStore.use((store) =>
          store.insert(collection, [data.values])
        )

        return row
      })
    )
  )

export const setCell = createServerFn({ method: "POST" })
  .validator(
    input(
      Schema.Struct({ rowId: RowId, propertyId: PropertyId, value: CellValue })
    )
  )
  .handler(({ data }) =>
    runServer(
      RowStore.use((store) =>
        store.setCell(data.rowId, data.propertyId, data.value)
      )
    )
  )

export const deleteRows = createServerFn({ method: "POST" })
  .validator(
    input(
      Schema.Struct({
        rowIds: Schema.Array(RowId).check(Schema.isBetweenLength(1, 1000)),
      })
    )
  )
  .handler(({ data }) =>
    runServer(RowStore.use((store) => store.remove(data.rowIds)))
  )

export const collectionKeys = {
  all: ["collections"] as const,
  one: (collectionId: CollectionId) => ["collections", collectionId] as const,
  rows: (collectionId: CollectionId) =>
    ["collections", collectionId, "rows"] as const,
}

export const collectionsQuery = queryOptions({
  queryKey: collectionKeys.all,
  queryFn: () => listCollections(),
})

export const collectionQuery = (collectionId: CollectionId) =>
  queryOptions({
    queryKey: collectionKeys.one(collectionId),
    queryFn: () => getCollection({ data: { collectionId } }),
  })
