import type {
  Dashboard,
  LayoutCell,
  LayoutRow,
  Panel,
} from "@/domain/dashboard"
import { newId } from "@/domain/ids"
import type { LayoutRowId, PanelId } from "@/domain/ids"

/**
 * Pure edits on a dashboard layout. Each returns a new dashboard, so the
 * editor can keep the saved version for "dirty" checks and undo.
 */

const equalSizes = <T extends { readonly size: number }>(
  items: ReadonlyArray<T>
): Array<T> => items.map((item) => ({ ...item, size: 100 / items.length }))

export const newTextPanel = (): Panel => ({
  _tag: "text",
  id: newId.panel(),
  title: "New panel",
  body: "Press the pencil to choose data and a visualization.",
})

const mapRow = (
  dashboard: Dashboard,
  rowId: LayoutRowId,
  update: (row: LayoutRow) => LayoutRow
): Dashboard => ({
  ...dashboard,
  rows: dashboard.rows.map((row) => (row.id === rowId ? update(row) : row)),
})

const swap = <T>(
  items: ReadonlyArray<T>,
  index: number,
  offset: -1 | 1
): ReadonlyArray<T> => {
  const target = index + offset
  const current = items[index]
  const other = items[target]

  if (current === undefined || other === undefined) return items

  const next = [...items]

  next[index] = other
  next[target] = current

  return next
}

export const addRow = (dashboard: Dashboard): Dashboard => ({
  ...dashboard,
  rows: equalSizes([
    ...dashboard.rows,
    {
      id: newId.layoutRow(),
      size: 100,
      cells: [{ size: 100, panel: newTextPanel() }],
    },
  ]),
})

export const removeRow = (
  dashboard: Dashboard,
  rowId: LayoutRowId
): Dashboard => ({
  ...dashboard,
  rows: equalSizes(dashboard.rows.filter((row) => row.id !== rowId)),
})

export const moveRow = (
  dashboard: Dashboard,
  rowId: LayoutRowId,
  offset: -1 | 1
): Dashboard => ({
  ...dashboard,
  rows: swap(
    dashboard.rows,
    dashboard.rows.findIndex((row) => row.id === rowId),
    offset
  ),
})

export const addCell = (dashboard: Dashboard, rowId: LayoutRowId): Dashboard =>
  mapRow(dashboard, rowId, (row) => ({
    ...row,
    cells: equalSizes([...row.cells, { size: 100, panel: newTextPanel() }]),
  }))

/** Removes the panel. A row left without panels goes too. */
export const removeCell = (
  dashboard: Dashboard,
  rowId: LayoutRowId,
  panelId: PanelId
): Dashboard => {
  const row = dashboard.rows.find((candidate) => candidate.id === rowId)

  if (row === undefined) return dashboard

  if (row.cells.length === 1) return removeRow(dashboard, rowId)

  return mapRow(dashboard, rowId, (current) => ({
    ...current,
    cells: equalSizes(
      current.cells.filter((cell) => cell.panel.id !== panelId)
    ),
  }))
}

export const moveCell = (
  dashboard: Dashboard,
  rowId: LayoutRowId,
  panelId: PanelId,
  offset: -1 | 1
): Dashboard =>
  mapRow(dashboard, rowId, (row) => ({
    ...row,
    cells: swap(
      row.cells,
      row.cells.findIndex((cell) => cell.panel.id === panelId),
      offset
    ),
  }))

export const replacePanel = (
  dashboard: Dashboard,
  panel: Panel
): Dashboard => ({
  ...dashboard,
  rows: dashboard.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell): LayoutCell =>
      cell.panel.id === panel.id ? { ...cell, panel } : cell
    ),
  })),
})

/** Sizes from react-resizable-panels, keyed by the panel element id. */
export type GroupLayout = { readonly [id: string]: number }

export const resizeRows = (
  dashboard: Dashboard,
  layout: GroupLayout
): Dashboard => ({
  ...dashboard,
  rows: dashboard.rows.map((row) => ({
    ...row,
    size: layout[row.id] ?? row.size,
  })),
})

export const resizeCells = (
  dashboard: Dashboard,
  rowId: LayoutRowId,
  layout: GroupLayout
): Dashboard =>
  mapRow(dashboard, rowId, (row) => ({
    ...row,
    cells: row.cells.map((cell) => ({
      ...cell,
      size: layout[cell.panel.id] ?? cell.size,
    })),
  }))

/** Changes when the group structure changes, so the group remounts with new default sizes. */
export const structureKey = (ids: ReadonlyArray<string>) => ids.join(":")
