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
import type { OwnerId, PropertyId } from "@/domain/ids"

import { decodeStored, now, withStorageError } from "./storage"

const PropertiesJson = Schema.fromJsonString(Schema.Array(Property))

const StoredCollection = Schema.Struct({
  id: CollectionId,
  name: Schema.String,
  properties: PropertiesJson,
})

const decodeCollection = decodeStored(StoredCollection)
const encodeProperties = Schema.encodeSync(PropertiesJson)

/**
 * The collections of one owner. Every method takes the owner id; a
 * collection of another owner is not found.
 */
export class CollectionStore extends Context.Service<
  CollectionStore,
  {
    readonly list: (
      owner: OwnerId
    ) => Effect.Effect<ReadonlyArray<Collection>, StorageError>
    readonly get: (
      owner: OwnerId,
      id: CollectionId
    ) => Effect.Effect<Collection, CollectionNotFound | StorageError>
    readonly create: (
      owner: OwnerId,
      input: {
        readonly name: string
        readonly properties: ReadonlyArray<Property>
      }
    ) => Effect.Effect<Collection, StorageError>
    readonly rename: (
      owner: OwnerId,
      id: CollectionId,
      name: string
    ) => Effect.Effect<Collection, CollectionNotFound | StorageError>
    readonly addProperty: (
      owner: OwnerId,
      id: CollectionId,
      input: { readonly name: string; readonly type: PropertyType }
    ) => Effect.Effect<Collection, CollectionNotFound | StorageError>
    readonly updateProperty: (
      owner: OwnerId,
      id: CollectionId,
      property: Property
    ) => Effect.Effect<
      Collection,
      CollectionNotFound | PropertyNotFound | StorageError
    >
    /** Drops the property from the schema and its values from every row. */
    readonly removeProperty: (
      owner: OwnerId,
      id: CollectionId,
      propertyId: PropertyId
    ) => Effect.Effect<
      Collection,
      CollectionNotFound | PropertyNotFound | StorageError
    >
    readonly remove: (
      owner: OwnerId,
      id: CollectionId
    ) => Effect.Effect<void, StorageError>
  }
>()("dynamic-report/CollectionStore") {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const list = (owner: OwnerId) =>
    withStorageError(
      Effect.gen(function* () {
        const rows =
          yield* sql`SELECT id, name, properties FROM collections WHERE owner_id = ${owner} ORDER BY created_at`

        return yield* Effect.forEach(rows, decodeCollection)
      })
    )

  const get = (owner: OwnerId, id: CollectionId) =>
    Effect.gen(function* () {
      const rows = yield* withStorageError(
        sql`SELECT id, name, properties FROM collections WHERE id = ${id} AND owner_id = ${owner}`
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
    create: (owner, { name, properties }) => {
      const collection: Collection = {
        id: newId.collection(),
        name,
        properties,
      }

      return withStorageError(
        sql`INSERT INTO collections (id, name, properties, created_at, owner_id)
            VALUES (${collection.id}, ${name}, ${encodeProperties(properties)}, ${now()}, ${owner})`.pipe(
          Effect.as(collection)
        )
      )
    },
    rename: (owner, id, name) =>
      Effect.gen(function* () {
        const collection = yield* get(owner, id)

        yield* withStorageError(
          sql`UPDATE collections SET name = ${name} WHERE id = ${id}`
        )

        return { ...collection, name }
      }),
    addProperty: (owner, id, input) =>
      Effect.gen(function* () {
        const collection = yield* get(owner, id)
        const property: Property = { id: newId.property(), ...input }

        return yield* writeProperties(collection, [
          ...collection.properties,
          property,
        ])
      }),
    updateProperty: (owner, id, next) =>
      Effect.gen(function* () {
        const collection = yield* get(owner, id)

        yield* findProperty(collection, next.id)

        return yield* writeProperties(
          collection,
          collection.properties.map((property) =>
            property.id === next.id ? next : property
          )
        )
      }),
    removeProperty: (owner, id, propertyId) =>
      Effect.gen(function* () {
        const collection = yield* get(owner, id)

        yield* findProperty(collection, propertyId)

        yield* withStorageError(
          sql`UPDATE rows SET data = json_remove(data, ${`$.${propertyId}`}) WHERE collection_id = ${id}`
        )

        return yield* writeProperties(
          collection,
          collection.properties.filter((property) => property.id !== propertyId)
        )
      }),
    remove: (owner, id) =>
      withStorageError(
        Effect.gen(function* () {
          yield* sql`DELETE FROM rows WHERE collection_id IN
            (SELECT id FROM collections WHERE id = ${id} AND owner_id = ${owner})`
          yield* sql`DELETE FROM collections WHERE id = ${id} AND owner_id = ${owner}`
        })
      ),
  })
})

export const CollectionStoreLive = Layer.effect(CollectionStore, make)
