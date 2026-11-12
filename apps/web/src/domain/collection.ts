import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

import { CollectionId, PropertyId, RowId, SelectOptionId } from "./ids"

export const SelectColor = Schema.Literals([
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
])

export type SelectColor = typeof SelectColor.Type

export const SelectOption = Schema.Struct({
  id: SelectOptionId,
  name: Schema.String,
  color: SelectColor,
})

export type SelectOption = typeof SelectOption.Type

export const NumberFormat = Schema.Literals(["plain", "currency", "percent"])

export type NumberFormat = typeof NumberFormat.Type

/** The type of a property decides which cell values it accepts. */
export const PropertyType = Schema.Union([
  Schema.TaggedStruct("text", {}),
  Schema.TaggedStruct("number", { format: NumberFormat }),
  Schema.TaggedStruct("date", {}),
  Schema.TaggedStruct("checkbox", {}),
  Schema.TaggedStruct("select", { options: Schema.Array(SelectOption) }),
])

export type PropertyType = typeof PropertyType.Type

export type PropertyKind = PropertyType["_tag"]

export const Property = Schema.Struct({
  id: PropertyId,
  name: Schema.String,
  type: PropertyType,
})

export type Property = typeof Property.Type

export const Collection = Schema.Struct({
  id: CollectionId,
  name: Schema.String,
  properties: Schema.Array(Property),
})

export type Collection = typeof Collection.Type

/** Storage form of one cell. `null` is an empty cell. */
export const CellValue = Schema.Union([
  Schema.String,
  Schema.Finite,
  Schema.Boolean,
  Schema.Null,
])

export type CellValue = typeof CellValue.Type

/** Cell values keyed by property id. Missing keys are empty cells. */
export const RowValues = Schema.Record(Schema.String, CellValue)

export type RowValues = typeof RowValues.Type

export const Row = Schema.Struct({
  id: RowId,
  values: RowValues,
  createdAt: Schema.Finite,
})

export type Row = typeof Row.Type

/** One page of a collection, oldest row first. `nextOffset` is null on the last page. */
export interface RowPage {
  readonly rows: ReadonlyArray<Row>
  readonly total: number
  readonly nextOffset: number | null
}

/** Calendar date, `YYYY-MM-DD`. Lexical order is date order, so SQL can compare it. */
export const IsoDate = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)
)

const isText = Schema.is(Schema.String)
const isNumber = Schema.is(Schema.Finite)
const isDate = Schema.is(IsoDate)
const isBoolean = Schema.is(Schema.Boolean)

/**
 * Accepts a cell value when it fits the property type. Returns the
 * expected form when it does not fit.
 */
export const checkCell = (
  type: PropertyType,
  value: CellValue
): Option.Option<string> => {
  if (value === null) return Option.none()

  switch (type._tag) {
    case "text":
      return isText(value) ? Option.none() : Option.some("text")
    case "number":
      return isNumber(value) ? Option.none() : Option.some("a number")
    case "date":
      return isDate(value) ? Option.none() : Option.some("a YYYY-MM-DD date")
    case "checkbox":
      return isBoolean(value) ? Option.none() : Option.some("true or false")
    case "select":
      return type.options.some((option) => option.id === value)
        ? Option.none()
        : Option.some("one of the select options")
  }
}
