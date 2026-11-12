import * as Schema from "effect/Schema"

import { DashboardId, LayoutRowId, PanelId } from "./ids"
import { Query, TimeRange } from "./query"

/**
 * How a panel draws its frame. Each kind reads frame fields by role, so a
 * visualization needs no field mapping:
 *
 * - `stat`: the first measure of the last row.
 * - `timeseries`: time dimension on x, first measure on y, other dimension as series.
 * - `bar`: first dimension as category, first measure as value, other dimension as series.
 * - `pie`: first dimension as slice, first measure as value.
 * - `table`: all fields.
 */
export const Viz = Schema.Union([
  Schema.TaggedStruct("stat", {}),
  Schema.TaggedStruct("timeseries", {
    style: Schema.Literals(["line", "area"]),
  }),
  Schema.TaggedStruct("bar", {}),
  Schema.TaggedStruct("pie", {}),
  Schema.TaggedStruct("table", {}),
])

export type Viz = typeof Viz.Type

export type VizKind = Viz["_tag"]

/** A text panel has no query, so a query panel without data cannot exist. */
export const Panel = Schema.Union([
  Schema.TaggedStruct("query", {
    id: PanelId,
    title: Schema.String,
    query: Query,
    viz: Viz,
  }),
  Schema.TaggedStruct("text", {
    id: PanelId,
    title: Schema.String,
    body: Schema.String,
  }),
])

export type Panel = typeof Panel.Type

/** Percent of the parent group, as react-resizable-panels reports it. */
const Percent = Schema.Finite.check(
  Schema.isBetween({ minimum: 1, maximum: 100 })
)

export const LayoutCell = Schema.Struct({ size: Percent, panel: Panel })

export type LayoutCell = typeof LayoutCell.Type

/**
 * The layout owns the panels: a dashboard is rows of cells, and each cell
 * holds one panel. There is no separate panel list that can drift.
 */
export const LayoutRow = Schema.Struct({
  id: LayoutRowId,
  size: Percent,
  cells: Schema.Array(LayoutCell),
})

export type LayoutRow = typeof LayoutRow.Type

export const Dashboard = Schema.Struct({
  id: DashboardId,
  name: Schema.String,
  timeRange: TimeRange,
  rows: Schema.Array(LayoutRow),
})

export type Dashboard = typeof Dashboard.Type

export const DashboardSummary = Schema.Struct({
  id: DashboardId,
  name: Schema.String,
})

export type DashboardSummary = typeof DashboardSummary.Type
