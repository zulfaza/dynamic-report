import * as Effect from "effect/Effect"

import type {
  Collection,
  Property,
  PropertyType,
  SelectColor,
} from "@/domain/collection"
import { InvalidQuery } from "@/domain/errors"
import type { PropertyId } from "@/domain/ids"
import type {
  CompareOp,
  Dimension,
  FieldKind,
  Filter,
  FrameField,
  FrameValue,
  Metric,
  Query,
  TimeBucket,
  TimeRange,
} from "@/domain/query"

type Param = string | number

/** SQL text with its bound parameters in text order. */
interface Fragment {
  readonly text: string
  readonly params: ReadonlyArray<Param>
}

const fragment = (text: string, ...params: ReadonlyArray<Param>): Fragment => ({
  text,
  params,
})

const join = (parts: ReadonlyArray<Fragment>, separator: string): Fragment => ({
  text: parts.map((part) => part.text).join(separator),
  params: parts.flatMap((part) => part.params),
})

/** Reads one property from the row JSON. The path is a bound parameter. */
const valueOf = (propertyId: PropertyId) =>
  fragment("json_extract(data, ?)", `$.${propertyId}`)

/** A frame column and how to turn its raw SQL value into a frame value. */
export interface Column {
  readonly field: FrameField
  readonly fromSql: (value: FrameValue) => FrameValue
}

export interface CompiledQuery {
  readonly sql: Fragment
  readonly columns: ReadonlyArray<Column>
}

const identity = (value: FrameValue) => value

const fieldKind = (type: PropertyType): FieldKind => {
  switch (type._tag) {
    case "number":
      return "number"
    case "date":
      return "time"
    case "checkbox":
      return "boolean"
    case "text":
    case "select":
      return "string"
  }
}

/**
 * SQLite returns JSON booleans as 1 and 0, and select cells hold option ids.
 * This maps both back to what a person reads.
 */
export const presentValue = (type: PropertyType) => {
  switch (type._tag) {
    case "checkbox":
      return (value: FrameValue): FrameValue =>
        value === null ? null : value === true || value === 1
    case "select": {
      const names = new Map<FrameValue, string>(
        type.options.map((option) => [option.id, option.name])
      )

      return (value: FrameValue): FrameValue =>
        value === null ? null : (names.get(value) ?? null)
    }

    case "text":
    case "number":
    case "date":
      return identity
  }
}

/** Select options keyed by the name a frame shows, so views can paint each option in its color. */
const tonesOf = (type: PropertyType): Record<string, SelectColor> =>
  type._tag === "select"
    ? Object.fromEntries(
        type.options.map((option) => [option.name, option.color])
      )
    : {}

const bucketExpression = (
  propertyId: PropertyId,
  bucket: TimeBucket
): Fragment => {
  const value = valueOf(propertyId)

  switch (bucket) {
    case "day":
      return fragment(`substr(${value.text}, 1, 10)`, ...value.params)
    case "week":
      // Monday on or before the date.
      return fragment(
        `date(${value.text}, '-6 days', 'weekday 1')`,
        ...value.params
      )
    case "month":
      return fragment(`substr(${value.text}, 1, 7) || '-01'`, ...value.params)
  }
}

const compareSql: Record<CompareOp, string> = {
  eq: "=",
  neq: "IS NOT",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
}

const daysIn: Record<Exclude<TimeRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
}

/** First calendar day inside the range, as `YYYY-MM-DD`. */
export const rangeStart = (
  range: Exclude<TimeRange, "all">,
  nowMillis: number
) =>
  new Date(nowMillis - (daysIn[range] - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10)

const bucketLabel: Record<TimeBucket, string> = {
  day: "day",
  week: "week",
  month: "month",
}

const opLabel = { sum: "Sum", avg: "Average", min: "Min", max: "Max" }

export interface CompileContext {
  readonly collection: Collection
  readonly timeRange: TimeRange
  readonly now: number
}

/**
 * Compiles a structured query into one parameterised statement. Fails with
 * `InvalidQuery` when the query names a missing property or applies a
 * metric to the wrong property type.
 */
const findProperty = (
  collection: Collection,
  propertyId: PropertyId
): Effect.Effect<Property, InvalidQuery> => {
  const found = collection.properties.find(
    (candidate) => candidate.id === propertyId
  )

  return found === undefined
    ? Effect.fail(
        new InvalidQuery({
          reason: "The query uses a property that no longer exists.",
        })
      )
    : Effect.succeed(found)
}

/** SQL for one filter value: booleans are stored as JSON 1 and 0. */
const operandOf = (value: string | number | boolean) =>
  value === true ? 1 : value === false ? 0 : value

export interface WhereContext {
  readonly collection: Collection
  readonly filters: ReadonlyArray<Filter>
  readonly timeField: PropertyId | null
  readonly timeRange: TimeRange
  readonly now: number
}

/**
 * The WHERE clause shared by panel queries and the collection table:
 * the collection, every filter (AND), and the time range.
 */
export const compileWhere = (context: WhereContext) =>
  Effect.gen(function* () {
    const { collection } = context

    const property = (propertyId: PropertyId) =>
      findProperty(collection, propertyId)

    const filterSql = (filter: Filter) =>
      Effect.gen(function* () {
        const target = yield* property(filter.propertyId)
        const value = valueOf(target.id)

        switch (filter._tag) {
          case "isEmpty":
            return fragment(
              `(${value.text} IS NULL OR ${value.text} = '')`,
              ...value.params,
              ...value.params
            )
          case "isNotEmpty":
            return fragment(
              `(${value.text} IS NOT NULL AND ${value.text} != '')`,
              ...value.params,
              ...value.params
            )
          case "compare":
            return fragment(
              `${value.text} ${compareSql[filter.op]} ?`,
              ...value.params,
              operandOf(filter.value)
            )
          case "in":
            return fragment(
              `${value.text} IN (${filter.values.map(() => "?").join(", ")})`,
              ...value.params,
              ...filter.values.map(operandOf)
            )
        }
      })

    const timeFilter = Effect.gen(function* () {
      if (context.timeField === null || context.timeRange === "all") return []

      const target = yield* property(context.timeField)

      if (target.type._tag !== "date") {
        return yield* new InvalidQuery({
          reason: `"${target.name}" is not a date property.`,
        })
      }

      const value = valueOf(target.id)

      return [
        fragment(
          `${value.text} >= ?`,
          ...value.params,
          rangeStart(context.timeRange, context.now)
        ),
      ]
    })

    return join(
      [
        fragment("collection_id = ?", collection.id),
        ...(yield* Effect.forEach(context.filters, filterSql)),
        ...(yield* timeFilter),
      ],
      " AND "
    )
  })

export const compileQuery = (query: Query, context: CompileContext) =>
  Effect.gen(function* () {
    const { collection } = context

    const property = (propertyId: PropertyId) =>
      findProperty(collection, propertyId)

    const sortSql = (sort: {
      readonly propertyId: PropertyId
      readonly direction: "asc" | "desc"
    }) =>
      Effect.gen(function* () {
        const value = valueOf((yield* property(sort.propertyId)).id)
        const direction = sort.direction === "asc" ? "ASC" : "DESC"

        return fragment(
          `${value.text} ${direction}, created_at DESC`,
          ...value.params
        )
      })

    const where = yield* compileWhere({
      collection,
      filters: query.filters,
      timeField: query.timeField,
      timeRange: context.timeRange,
      now: context.now,
    })

    if (query._tag === "rows") {
      const order =
        query.sort === null
          ? fragment("created_at DESC")
          : yield* sortSql(query.sort)

      return {
        sql: join(
          [
            fragment("SELECT data FROM rows WHERE"),
            where,
            fragment("ORDER BY"),
            order,
            fragment("LIMIT ?", query.limit),
          ],
          " "
        ),
        columns: collection.properties.map((item) => ({
          field: {
            label: item.name,
            kind: fieldKind(item.type),
            role: item.type._tag === "number" ? "measure" : "dimension",
            tones: tonesOf(item.type),
          },
          fromSql: presentValue(item.type),
        })),
      } satisfies CompiledQuery
    }

    const dimensionColumn = (dimension: Dimension) =>
      Effect.gen(function* () {
        const target = yield* property(dimension.propertyId)

        if (dimension._tag === "time") {
          if (target.type._tag !== "date") {
            return yield* new InvalidQuery({
              reason: `"${target.name}" is not a date property.`,
            })
          }

          return {
            select: bucketExpression(target.id, dimension.bucket),
            column: {
              field: {
                label: `${target.name} (${bucketLabel[dimension.bucket]})`,
                kind: "time",
                role: "dimension",
                tones: {},
              },
              fromSql: identity,
            } satisfies Column,
          }
        }

        return {
          select: valueOf(target.id),
          column: {
            field: {
              label: target.name,
              kind: fieldKind(target.type),
              role: "dimension",
              tones: tonesOf(target.type),
            },
            fromSql: presentValue(target.type),
          } satisfies Column,
        }
      })

    const metricColumn = (metric: Metric) =>
      Effect.gen(function* () {
        if (metric._tag === "count") {
          return {
            select: fragment("count(*)"),
            column: {
              field: {
                label: "Count",
                kind: "number",
                role: "measure",
                tones: {},
              },
              fromSql: identity,
            } satisfies Column,
          }
        }

        const target = yield* property(metric.propertyId)

        if (target.type._tag !== "number") {
          return yield* new InvalidQuery({
            reason: `"${target.name}" is not a number property.`,
          })
        }

        const value = valueOf(target.id)

        return {
          select: fragment(`${metric.op}(${value.text})`, ...value.params),
          column: {
            field: {
              label: `${opLabel[metric.op]} of ${target.name}`,
              kind: "number",
              role: "measure",
              tones: {},
            },
            fromSql: identity,
          } satisfies Column,
        }
      })

    const dimensions = yield* Effect.forEach(query.dimensions, dimensionColumn)
    const metrics = yield* Effect.forEach(query.metrics, metricColumn)
    const selected = [...dimensions, ...metrics]
    const dimensionPositions = dimensions.map((_, index) => String(index + 1))

    const groupBy =
      dimensions.length === 0
        ? []
        : [fragment(`GROUP BY ${dimensionPositions.join(", ")}`)]

    const orderBy =
      query.order === "measure-desc"
        ? fragment(`ORDER BY ${dimensions.length + 1} DESC`)
        : dimensions.length === 0
          ? fragment("")
          : fragment(`ORDER BY ${dimensionPositions.join(", ")}`)

    return {
      sql: join(
        [
          fragment("SELECT"),
          join(
            selected.map((item) => item.select),
            ", "
          ),
          fragment("FROM rows WHERE"),
          where,
          ...groupBy,
          orderBy,
          fragment("LIMIT ?", query.limit),
        ],
        " "
      ),
      columns: selected.map((item) => item.column),
    } satisfies CompiledQuery
  })
