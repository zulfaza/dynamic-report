import * as Schema from "effect/Schema"

import { SelectColor } from "./collection"
import { CollectionId, PropertyId } from "./ids"

export const TimeRange = Schema.Literals(["7d", "30d", "90d", "1y", "all"])

export type TimeRange = typeof TimeRange.Type

export const timeRangeLabel: Record<TimeRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last year",
  all: "All time",
}

export const TimeBucket = Schema.Literals(["day", "week", "month"])

export type TimeBucket = typeof TimeBucket.Type

export const CompareOp = Schema.Literals([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
])

export type CompareOp = typeof CompareOp.Type

export const Filter = Schema.Union([
  Schema.TaggedStruct("compare", {
    propertyId: PropertyId,
    op: CompareOp,
    value: Schema.Union([Schema.String, Schema.Finite, Schema.Boolean]),
  }),
  /** Matches any of the values (OR). Select filters use option ids. */
  Schema.TaggedStruct("in", {
    propertyId: PropertyId,
    values: Schema.Array(
      Schema.Union([Schema.String, Schema.Finite, Schema.Boolean])
    ).check(Schema.isMinLength(1)),
  }),
  Schema.TaggedStruct("isEmpty", { propertyId: PropertyId }),
  Schema.TaggedStruct("isNotEmpty", { propertyId: PropertyId }),
])

export type Filter = typeof Filter.Type

/** One grouping key of an aggregate query. */
export const Dimension = Schema.Union([
  Schema.TaggedStruct("property", { propertyId: PropertyId }),
  Schema.TaggedStruct("time", { propertyId: PropertyId, bucket: TimeBucket }),
])

export type Dimension = typeof Dimension.Type

export const AggregateOp = Schema.Literals(["sum", "avg", "min", "max"])

export type AggregateOp = typeof AggregateOp.Type

export const Metric = Schema.Union([
  Schema.TaggedStruct("count", {}),
  Schema.TaggedStruct("aggregate", { op: AggregateOp, propertyId: PropertyId }),
])

export type Metric = typeof Metric.Type

const Limit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1000 }))

const SortDirection = Schema.Literals(["asc", "desc"])

/** Order rows by one property. Ties keep insert order. */
export const SortSpec = Schema.Struct({
  propertyId: PropertyId,
  direction: SortDirection,
})

export type SortSpec = typeof SortSpec.Type

/**
 * What data a panel wants. The server compiles it to parameterised SQL;
 * the client never sends SQL.
 *
 * - `rows`: raw rows, for tables.
 * - `aggregate`: up to two dimensions and one to four metrics, for charts.
 *
 * `timeField` is the date property the dashboard time range filters on.
 */
export const Query = Schema.Union([
  Schema.TaggedStruct("rows", {
    collectionId: CollectionId,
    filters: Schema.Array(Filter),
    timeField: Schema.NullOr(PropertyId),
    sort: Schema.NullOr(SortSpec),
    limit: Limit,
  }),
  Schema.TaggedStruct("aggregate", {
    collectionId: CollectionId,
    filters: Schema.Array(Filter),
    timeField: Schema.NullOr(PropertyId),
    dimensions: Schema.Array(Dimension).check(Schema.isMaxLength(2)),
    metrics: Schema.Array(Metric).check(Schema.isBetweenLength(1, 4)),
    order: Schema.Literals(["dimension", "measure-desc"]),
    limit: Limit,
  }),
])

export type Query = typeof Query.Type

export const FieldKind = Schema.Literals([
  "string",
  "number",
  "time",
  "boolean",
])

export type FieldKind = typeof FieldKind.Type

/**
 * `tones` maps a value to its select option color, so every view paints
 * the same option in the same color. It is empty for non-select fields.
 */
export const FrameField = Schema.Struct({
  label: Schema.String,
  kind: FieldKind,
  role: Schema.Literals(["dimension", "measure"]),
  tones: Schema.Record(Schema.String, SelectColor),
})

export type FrameField = typeof FrameField.Type

export const FrameValue = Schema.Union([
  Schema.String,
  Schema.Finite,
  Schema.Boolean,
  Schema.Null,
])

export type FrameValue = typeof FrameValue.Type

/**
 * The one result form every visualization reads. `rows[i][j]` is the value
 * of `fields[j]`. Time values are `YYYY-MM-DD` strings.
 */
export const Frame = Schema.Struct({
  fields: Schema.Array(FrameField),
  rows: Schema.Array(Schema.Array(FrameValue)),
})

export type Frame = typeof Frame.Type
