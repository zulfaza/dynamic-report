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

import { requireOwner } from "./owner"

const input = <S extends Schema.Decoder<unknown>>(schema: S) =>
  Schema.toStandardSchemaV1(schema)

export const listCollections = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(({ context }) =>
    runServer(CollectionStore.use((store) => store.list(context.owner)))
  )

export const getCollection = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .validator(input(Schema.Struct({ collectionId: CollectionId })))
  .handler(({ data, context }) =>
    runServer(
      CollectionStore.use((store) =>
        store.get(context.owner, data.collectionId)
      )
    )
  )

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(input(Schema.Struct({ name: Schema.String })))
  .handler(({ data, context }) =>
    runServer(
      CollectionStore.use((store) =>
        store.create(context.owner, {
          name: data.name,
          properties: [
            { id: newId.property(), name: "Name", type: { _tag: "text" } },
          ],
        })
      )
    )
  )

export const renameCollection = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, name: Schema.String }))
  )
  .handler(({ data, context }) =>
    runServer(
      CollectionStore.use((store) =>
        store.rename(context.owner, data.collectionId, data.name)
      )
    )
  )

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(input(Schema.Struct({ collectionId: CollectionId })))
  .handler(({ data, context }) =>
    runServer(
      CollectionStore.use((store) =>
        store.remove(context.owner, data.collectionId)
      )
    )
  )

export const addProperty = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(
    input(
      Schema.Struct({
        collectionId: CollectionId,
        name: Schema.String,
        type: PropertyType,
      })
    )
  )
  .handler(({ data, context }) =>
    runServer(
      CollectionStore.use((store) =>
        store.addProperty(context.owner, data.collectionId, {
          name: data.name,
          type: data.type,
        })
      )
    )
  )

export const updateProperty = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, property: Property }))
  )
  .handler(({ data, context }) =>
    runServer(
      CollectionStore.use((store) =>
        store.updateProperty(context.owner, data.collectionId, data.property)
      )
    )
  )

export const removeProperty = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, propertyId: PropertyId }))
  )
  .handler(({ data, context }) =>
    runServer(
      CollectionStore.use((store) =>
        store.removeProperty(context.owner, data.collectionId, data.propertyId)
      )
    )
  )

const pageSize = 100

/** POST, because filters are a JSON document. */
export const listRows = createServerFn({ method: "POST" })
  .middleware([requireOwner])
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
  .handler(({ data, context }) =>
    runServer(
      Effect.gen(function* () {
        const collection = yield* CollectionStore.use((store) =>
          store.get(context.owner, data.collectionId)
        )

        return yield* RowStore.use((store) =>
          store.page(collection, data.filters, data.sort, data.offset, pageSize)
        )
      })
    )
  )

export const addRow = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(
    input(Schema.Struct({ collectionId: CollectionId, values: RowValues }))
  )
  .handler(({ data, context }) =>
    runServer(
      Effect.gen(function* () {
        const collection = yield* CollectionStore.use((store) =>
          store.get(context.owner, data.collectionId)
        )

        const [row] = yield* RowStore.use((store) =>
          store.insert(collection, [data.values])
        )

        return row
      })
    )
  )

export const setCell = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(
    input(
      Schema.Struct({ rowId: RowId, propertyId: PropertyId, value: CellValue })
    )
  )
  .handler(({ data, context }) =>
    runServer(
      RowStore.use((store) =>
        store.setCell(context.owner, data.rowId, data.propertyId, data.value)
      )
    )
  )

export const deleteRows = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .validator(
    input(
      Schema.Struct({
        rowIds: Schema.Array(RowId).check(Schema.isBetweenLength(1, 1000)),
      })
    )
  )
  .handler(({ data, context }) =>
    runServer(RowStore.use((store) => store.remove(context.owner, data.rowIds)))
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
