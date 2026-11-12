import * as Schema from "effect/Schema"

/**
 * Every id is `<prefix>_<32 hex chars>`. The fixed alphabet lets the query
 * compiler use a property id inside a JSON path without escaping.
 */
const idPattern = (prefix: string) =>
  Schema.isPattern(new RegExp(`^${prefix}_[a-f0-9]{32}$`))

export const CollectionId = Schema.String.check(idPattern("col")).pipe(
  Schema.brand("CollectionId")
)

export type CollectionId = typeof CollectionId.Type

export const PropertyId = Schema.String.check(idPattern("prop")).pipe(
  Schema.brand("PropertyId")
)

export type PropertyId = typeof PropertyId.Type

export const SelectOptionId = Schema.String.check(idPattern("opt")).pipe(
  Schema.brand("SelectOptionId")
)

export type SelectOptionId = typeof SelectOptionId.Type

export const RowId = Schema.String.check(idPattern("row")).pipe(
  Schema.brand("RowId")
)

export type RowId = typeof RowId.Type

export const DashboardId = Schema.String.check(idPattern("dash")).pipe(
  Schema.brand("DashboardId")
)

export type DashboardId = typeof DashboardId.Type

export const PanelId = Schema.String.check(idPattern("panel")).pipe(
  Schema.brand("PanelId")
)

export type PanelId = typeof PanelId.Type

export const LayoutRowId = Schema.String.check(idPattern("lrow")).pipe(
  Schema.brand("LayoutRowId")
)

export type LayoutRowId = typeof LayoutRowId.Type

const token = () => crypto.randomUUID().replaceAll("-", "")

export const newId = {
  collection: () => CollectionId.make(`col_${token()}`),
  property: () => PropertyId.make(`prop_${token()}`),
  selectOption: () => SelectOptionId.make(`opt_${token()}`),
  row: () => RowId.make(`row_${token()}`),
  dashboard: () => DashboardId.make(`dash_${token()}`),
  panel: () => PanelId.make(`panel_${token()}`),
  layoutRow: () => LayoutRowId.make(`lrow_${token()}`),
}
