import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Input } from "@workspace/ui/components/input"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  FilterHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { Fragment, useState } from "react"

import { collectionQuery } from "@/api/collections"
import { dashboardKeys, saveDashboard } from "@/api/dashboards"
import type { Facet } from "@/domain/facets"
import { DashboardFacetsProvider } from "@/features/filters/dashboard-facets"
import { FacetChips } from "@/features/filters/facet-chips"
import { FacetPanel } from "@/features/filters/facet-panel"
import { Choice } from "@/components/choice"
import type { Dashboard, LayoutRow, Panel } from "@/domain/dashboard"
import type { TimeRange } from "@/domain/query"
import { timeRangeLabel } from "@/domain/query"

import {
  addCell,
  addRow,
  moveCell,
  moveRow,
  removeCell,
  replacePanel,
  resizeCells,
  resizeRows,
  structureKey,
} from "./layout"
import { useMediaQuery } from "@/hooks/use-media-query"

import { PanelBody } from "./panel-body"
import { PanelEditor } from "./panel-editor"

const timeRanges: ReadonlyArray<TimeRange> = ["7d", "30d", "90d", "1y", "all"]

type Mode =
  | { readonly _tag: "view" }
  | { readonly _tag: "edit"; readonly editing: Panel | null }

function IconButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string
  icon: typeof Add01Icon
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <HugeiconsIcon icon={icon} />
    </Button>
  )
}

/** One panel as a white sheet on the canvas. `children` holds edit actions. */
function PanelSheet({
  panel,
  timeRange,
  editing,
  children,
}: {
  panel: Panel
  timeRange: TimeRange
  editing: boolean
  children?: React.ReactNode
}) {
  return (
    <section
      data-editing={editing}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-md bg-card px-4 pt-3 pb-4 shadow-xs outline-offset-2 data-[editing=true]:outline-1 data-[editing=true]:outline-border data-[editing=true]:outline-dashed"
    >
      <header className="flex h-7 items-center gap-1">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
          {panel.title}
        </h2>
        {children}
      </header>
      <div className="mt-3 min-h-0 flex-1">
        <PanelBody panel={panel} timeRange={timeRange} />
      </div>
    </section>
  )
}

/** Stats and text read in a short sheet; charts and tables need height. */
const isShort = (panel: Panel) =>
  panel._tag === "text" || panel.viz._tag === "stat"

/**
 * Phone layout: one column of panels in reading order, without resize.
 */
function StackedDashboard({
  dashboard,
  timeRange,
}: {
  dashboard: Dashboard
  timeRange: TimeRange
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      {dashboard.rows.flatMap((row) =>
        row.cells.map((cell) => (
          <div
            key={cell.panel.id}
            data-short={isShort(cell.panel)}
            className="h-80 data-[short=true]:h-36"
          >
            <PanelSheet
              panel={cell.panel}
              timeRange={timeRange}
              editing={false}
            />
          </div>
        ))
      )}
    </div>
  )
}

function DashboardRow({
  row,
  rowIndex,
  rowCount,
  draft,
  editing,
  timeRange,
  onChange,
  onEditPanel,
}: {
  row: LayoutRow
  rowIndex: number
  rowCount: number
  draft: Dashboard
  editing: boolean
  timeRange: TimeRange
  onChange: (dashboard: Dashboard) => void
  onEditPanel: (panel: Panel) => void
}) {
  return (
    <div className="flex size-full flex-col">
      {editing && (
        <div className="flex items-center gap-1 px-1.5 pt-1 text-xs text-muted-foreground">
          <span className="pr-1">Row {rowIndex + 1}</span>
          <IconButton
            label="Move row up"
            icon={ArrowUp01Icon}
            disabled={rowIndex === 0}
            onClick={() => onChange(moveRow(draft, row.id, -1))}
          />
          <IconButton
            label="Move row down"
            icon={ArrowDown01Icon}
            disabled={rowIndex === rowCount - 1}
            onClick={() => onChange(moveRow(draft, row.id, 1))}
          />
          <IconButton
            label="Add panel to row"
            icon={Add01Icon}
            onClick={() => onChange(addCell(draft, row.id))}
          />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup
          key={structureKey([
            String(editing),
            ...row.cells.map((cell) => cell.panel.id),
          ])}
          orientation="horizontal"
          disabled={!editing}
          onLayoutChanged={(layout) =>
            onChange(resizeCells(draft, row.id, layout))
          }
        >
          {row.cells.map((cell, cellIndex) => (
            <Fragment key={cell.panel.id}>
              {cellIndex > 0 && editing && <ResizableHandle withHandle />}
              <ResizablePanel
                id={cell.panel.id}
                defaultSize={`${cell.size}%`}
                minSize="10%"
              >
                <div className="size-full p-1.5">
                  <PanelSheet
                    panel={cell.panel}
                    timeRange={timeRange}
                    editing={editing}
                  >
                    {editing && (
                      <>
                        <IconButton
                          label="Move panel left"
                          icon={ArrowLeft01Icon}
                          disabled={cellIndex === 0}
                          onClick={() =>
                            onChange(moveCell(draft, row.id, cell.panel.id, -1))
                          }
                        />
                        <IconButton
                          label="Move panel right"
                          icon={ArrowRight01Icon}
                          disabled={cellIndex === row.cells.length - 1}
                          onClick={() =>
                            onChange(moveCell(draft, row.id, cell.panel.id, 1))
                          }
                        />
                        <IconButton
                          label="Edit panel"
                          icon={PencilEdit02Icon}
                          onClick={() => onEditPanel(cell.panel)}
                        />
                        <IconButton
                          label="Delete panel"
                          icon={Delete02Icon}
                          onClick={() =>
                            onChange(removeCell(draft, row.id, cell.panel.id))
                          }
                        />
                      </>
                    )}
                  </PanelSheet>
                </div>
              </ResizablePanel>
            </Fragment>
          ))}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

/** The collections that the dashboard's query panels read, in panel order. */
function useDashboardCollections(dashboard: Dashboard) {
  const ids = [
    ...new Set(
      dashboard.rows.flatMap((row) =>
        row.cells.flatMap((cell) =>
          cell.panel._tag === "query" ? [cell.panel.query.collectionId] : []
        )
      )
    ),
  ]

  const results = useQueries({
    queries: ids.map((collectionId) => collectionQuery(collectionId)),
  })

  return results.flatMap((result) =>
    result.data === undefined ? [] : [result.data]
  )
}

/**
 * A dashboard is a vertical group of rows; each row is a horizontal group of
 * panels. Edits go to a local draft until "Save".
 */
export function DashboardView({
  dashboard,
  timeRange,
  onTimeRangeChange,
  facets,
  onFacetsChange,
}: {
  dashboard: Dashboard
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  facets: ReadonlyArray<Facet>
  onFacetsChange: (facets: ReadonlyArray<Facet>) => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(dashboard)
  const [mode, setMode] = useState<Mode>({ _tag: "view" })
  const dirty = draft !== dashboard

  const save = useMutation({
    mutationFn: (next: Dashboard) =>
      saveDashboard({ data: { dashboard: next } }),
    onSuccess: (saved) => {
      queryClient.setQueryData(dashboardKeys.one(saved.id), saved)
      void queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
        exact: true,
      })
      setDraft(saved)
      setMode({ _tag: "view" })
    },
  })

  const editing = mode._tag === "edit"
  // Resizable rows need room; below md the dashboard reads as one column.
  const wide = useMediaQuery("(min-width: 48rem)", true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const collections = useDashboardCollections(draft)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-2 px-4 pt-1 pb-2 md:px-6">
        {editing ? (
          <div className="w-64">
            <Input
              aria-label="Dashboard name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </div>
        ) : (
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {draft.name}
          </h1>
        )}
        <div className="flex-1" />
        <div className="w-40">
          <Choice
            label="Time range"
            value={timeRange}
            options={timeRanges.map((range) => ({
              value: range,
              label: timeRangeLabel[range],
            }))}
            onChange={(range) => {
              onTimeRangeChange(range)
              setDraft({ ...draft, timeRange: range })
            }}
          />
        </div>
        <Button
          variant={filtersOpen ? "secondary" : "outline"}
          size="sm"
          aria-expanded={filtersOpen}
          aria-controls="dashboard-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} data-icon="inline-start" />
          {facets.length > 0 ? `Filters (${facets.length})` : "Filters"}
        </Button>
        {editing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(addRow(draft))}
            >
              <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
              Row
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(dashboard)
                setMode({ _tag: "view" })
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate(draft)}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </>
        ) : (
          wide && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode({ _tag: "edit", editing: null })}
            >
              Edit
            </Button>
          )
        )}
      </header>
      {save.isError && (
        <p className="px-6 pb-2 text-sm text-destructive">
          {save.error.message}
        </p>
      )}

      <div className="px-4 pb-2 empty:hidden md:px-6">
        <FacetChips
          facets={facets}
          collections={collections}
          onRemove={(facet) =>
            onFacetsChange(
              facets.filter(
                (item) =>
                  item.collectionId !== facet.collectionId ||
                  item.propertyId !== facet.propertyId
              )
            )
          }
          onClear={() => onFacetsChange([])}
        />
      </div>

      <DashboardFacetsProvider value={facets}>
        <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {draft.rows.length === 0 ? (
              <div className="flex flex-1 flex-col items-start gap-3 px-6 pt-10 text-sm text-muted-foreground">
                <p>
                  No panels yet. Add a row, then choose data for each panel.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setDraft(addRow(draft))
                    setMode({ _tag: "edit", editing: null })
                  }}
                >
                  Add a row
                </Button>
              </div>
            ) : !wide ? (
              <StackedDashboard dashboard={draft} timeRange={timeRange} />
            ) : (
              <div className="min-h-0 flex-1 px-4.5 pb-4.5">
                <ResizablePanelGroup
                  key={structureKey([
                    String(editing),
                    ...draft.rows.map((row) => row.id),
                  ])}
                  orientation="vertical"
                  disabled={!editing}
                  onLayoutChanged={(layout) =>
                    setDraft((current) => resizeRows(current, layout))
                  }
                >
                  {draft.rows.map((row, rowIndex) => (
                    <Fragment key={row.id}>
                      {rowIndex > 0 && editing && (
                        <ResizableHandle withHandle />
                      )}
                      <ResizablePanel
                        id={row.id}
                        defaultSize={`${row.size}%`}
                        minSize="12%"
                      >
                        <DashboardRow
                          row={row}
                          rowIndex={rowIndex}
                          rowCount={draft.rows.length}
                          draft={draft}
                          editing={editing}
                          timeRange={timeRange}
                          onChange={setDraft}
                          onEditPanel={(panel) =>
                            setMode({ _tag: "edit", editing: panel })
                          }
                        />
                      </ResizablePanel>
                    </Fragment>
                  ))}
                </ResizablePanelGroup>
              </div>
            )}
          </div>
          {filtersOpen && (
            <aside
              id="dashboard-filters"
              aria-label="Dashboard filters"
              className="mx-4 mb-3 shrink-0 overflow-hidden rounded-md bg-card shadow-xs md:mr-4.5 md:mb-4.5 md:ml-0 md:w-72"
            >
              <ScrollArea>
                <div className="px-4 py-1">
                  {collections.length === 0 && (
                    <p className="py-3 text-sm text-muted-foreground">
                      Add a panel with data to filter this dashboard.
                    </p>
                  )}
                  {collections.map((collection) => (
                    <div key={collection.id}>
                      {collections.length > 1 && (
                        <h2 className="pt-3 text-xs text-muted-foreground">
                          {collection.name}
                        </h2>
                      )}
                      <FacetPanel
                        collection={collection}
                        facets={facets}
                        scope={{
                          timeField:
                            collection.properties.find(
                              (property) => property.type._tag === "date"
                            )?.id ?? null,
                          timeRange,
                        }}
                        onChange={onFacetsChange}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </aside>
          )}
        </div>
        {mode._tag === "edit" && mode.editing !== null && (
          <PanelEditor
            panel={mode.editing}
            timeRange={timeRange}
            onClose={() => setMode({ _tag: "edit", editing: null })}
            onApply={(panel) => {
              setDraft(replacePanel(draft, panel))
              setMode({ _tag: "edit", editing: null })
            }}
          />
        )}
      </DashboardFacetsProvider>
    </div>
  )
}
