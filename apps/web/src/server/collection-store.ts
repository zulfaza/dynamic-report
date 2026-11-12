import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { Property } from "@/domain/collection"
import type { PropertyType, Collection } from "@/domain/collection"
import { CollectionNotFound, PropertyNotFound } from "@/domain/errors"
import type { StorageError } from "@/domain/errors"
import { CollectionId, newId } from "@/domain/ids"
import type { PropertyId } from "@/domain/ids"

import { decodeStored, now, withStorageError } from "./storage"

const PropertiesJson = Schema.fromJsonString(Schema.Array(Property))

const StoredCollection = Schema.Struct({
  id: CollectionId,
  name: Schema.String,
  properties: PropertiesJson,
})

const decodeCollection = decodeStored(StoredCollection)
const encodeProperties = Schema.encodeSync(PropertiesJson)

export class CollectionStore extends Context.Service<
  CollectionStore,
  {
    readonly list: Effect.Effect<ReadonlyArray<Collection>, StorageError>
    readonly get: (
      id: CollectionId
    ) => Effect.Effect<Collection, CollectionNotFound | StorageError>
    readonly create: (input: {
      readonly name: string
      readonly properties: ReadonlyArray<Property>
    }) => Effect.Effect<Collection, StorageError>
    readonly rename: (
      id: CollectionId,
      name: string
    ) => Effect.Effect<Collection, CollectionNotFound | StorageError>
    readonly addProperty: (
      id: CollectionId,
      input: { readonly name: string; readonly type: PropertyType }
    ) => Effect.Effect<Collection, CollectionNotFound | StorageError>
    readonly updateProperty: (
      id: CollectionId,
      property: Property
    ) => Effect.Effect<
      Collection,
      CollectionNotFound | PropertyNotFound | StorageError
    >
    /** Drops the property from the schema and its values from every row. */
    readonly removeProperty: (
      id: CollectionId,
      propertyId: PropertyId
    ) => Effect.Effect<
      Collection,
      CollectionNotFound | PropertyNotFound | StorageError
    >
    readonly remove: (id: CollectionId) => Effect.Effect<void, StorageError>
  }
>()("dynamic-report/CollectionStore") {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const list = withStorageError(
    Effect.gen(function* () {
      const rows =
        yield* sql`SELECT id, name, properties FROM collections ORDER BY created_at`

      return yield* Effect.forEach(rows, decodeCollection)
    })
  )

  const get = (id: CollectionId) =>
    Effect.gen(function* () {
      const rows = yield* withStorageError(
        sql`SELECT id, name, properties FROM collections WHERE id = ${id}`
      )

      const row = rows.at(0)

      if (row === undefined)
        return yield* new CollectionNotFound({ collectionId: id })

      return yield* decodeCollection(row)
    })

  const writeProperties = (
    collection: Collection,
    properties: ReadonlyArray<Property>
  ) =>
    withStorageError(
      sql`UPDATE collections SET properties = ${encodeProperties(properties)} WHERE id = ${collection.id}`.pipe(
        Effect.as({ ...collection, properties })
      )
    )

  const findProperty = (collection: Collection, propertyId: PropertyId) =>
    collection.properties.some((property) => property.id === propertyId)
      ? Effect.void
      : Effect.fail(new PropertyNotFound({ propertyId }))

  return CollectionStore.of({
    list,
    get,
    create: ({ name, properties }) => {
      const collection: Collection = {
        id: newId.collection(),
        name,
        properties,
      }

      return withStorageError(
        sql`INSERT INTO collections (id, name, properties, created_at)
            VALUES (${collection.id}, ${name}, ${encodeProperties(properties)}, ${now()})`.pipe(
          Effect.as(collection)
        )
      )
    },
    rename: (id, name) =>
      Effect.gen(function* () {
        const collection = yield* get(id)

        yield* withStorageError(
          sql`UPDATE collections SET name = ${name} WHERE id = ${id}`
        )

        return { ...collection, name }
      }),
    addProperty: (id, input) =>
      Effect.gen(function* () {
        const collection = yield* get(id)
        const property: Property = { id: newId.property(), ...input }

        return yield* writeProperties(collection, [
          ...collection.properties,
          property,
        ])
      }),
    updateProperty: (id, next) =>
      Effect.gen(function* () {
        const collection = yield* get(id)

        yield* findProperty(collection, next.id)

        return yield* writeProperties(
          collection,
          collection.properties.map((property) =>
            property.id === next.id ? next : property
          )
        )
      }),
    removeProperty: (id, propertyId) =>
      Effect.gen(function* () {
        const collection = yield* get(id)

        yield* findProperty(collection, propertyId)

        yield* withStorageError(
          sql`UPDATE rows SET data = json_remove(data, ${`$.${propertyId}`}) WHERE collection_id = ${id}`
        )

        return yield* writeProperties(
          collection,
          collection.properties.filter((property) => property.id !== propertyId)
        )
      }),
    remove: (id) =>
      withStorageError(
        Effect.gen(function* () {
          yield* sql`DELETE FROM rows WHERE collection_id = ${id}`
          yield* sql`DELETE FROM collections WHERE id = ${id}`
        })
      ),
  })
})

export const CollectionStoreLive = Layer.effect(CollectionStore, make)
