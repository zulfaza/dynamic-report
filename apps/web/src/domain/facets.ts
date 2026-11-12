import * as Schema from "effect/Schema"

import { CollectionId, PropertyId, SelectOptionId } from "./ids"
import type { Filter, Query } from "./query"

/**
 * One active filter that a person picked from a facet list. Values inside a
 * facet combine with OR; facets combine with AND.
 *
 * - `options`: select property, any of the option ids.
 * - `checked`: checkbox property, any of true / false.
 * - `range`: number or date property, inclusive bounds; null is open.
 */
export const Facet = Schema.Union([
  Schema.TaggedStruct("options", {
    collectionId: CollectionId,
    propertyId: PropertyId,
    optionIds: Schema.Array(SelectOptionId).check(Schema.isMinLength(1)),
  }),
  Schema.TaggedStruct("checked", {
    collectionId: CollectionId,
    propertyId: PropertyId,
    values: Schema.Array(Schema.Boolean).check(Schema.isMinLength(1)),
  }),
  Schema.TaggedStruct("range", {
    collectionId: CollectionId,
    propertyId: PropertyId,
    min: Schema.NullOr(Schema.Union([Schema.Finite, Schema.String])),
    max: Schema.NullOr(Schema.Union([Schema.Finite, Schema.String])),
  }),
])

export type Facet = typeof Facet.Type

const facetFilters = (facet: Facet): ReadonlyArray<Filter> => {
  switch (facet._tag) {
    case "options":
      return [
        { _tag: "in", propertyId: facet.propertyId, values: facet.optionIds },
      ]
    case "checked":
      return [
        { _tag: "in", propertyId: facet.propertyId, values: facet.values },
      ]
    case "range":
      return [
        ...(facet.min === null
          ? []
          : [
              {
                _tag: "compare",
                propertyId: facet.propertyId,
                op: "gte",
                value: facet.min,
              } satisfies Filter,
            ]),
        ...(facet.max === null
          ? []
          : [
              {
                _tag: "compare",
                propertyId: facet.propertyId,
                op: "lte",
                value: facet.max,
              } satisfies Filter,
            ]),
      ]
  }
}

/** Query filters for every facet on one collection. */
export const filtersFor = (
  facets: ReadonlyArray<Facet>,
  collectionId: CollectionId
): ReadonlyArray<Filter> =>
  facets.flatMap((facet) =>
    facet.collectionId === collectionId ? facetFilters(facet) : []
  )

/** Adds the dashboard facets to a panel query on the same collection. */
export const withFacets = (query: Query, facets: ReadonlyArray<Facet>): Query =>
  facets.length === 0
    ? query
    : {
        ...query,
        filters: [...query.filters, ...filtersFor(facets, query.collectionId)],
      }

/** Replaces the facet on one property; `null` removes it. */
export const setFacet = (
  facets: ReadonlyArray<Facet>,
  propertyId: PropertyId,
  next: Facet | null
): ReadonlyArray<Facet> => [
  ...facets.filter((facet) => facet.propertyId !== propertyId),
  ...(next === null ? [] : [next]),
]
