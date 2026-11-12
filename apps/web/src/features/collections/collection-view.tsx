import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  FilterHorizontalIcon,
  LayoutTable01Icon,
} from "@hugeicons/core-free-icons"
import type {
  ColumnVisibilityState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table"
import { useCallback, useMemo, useState } from "react"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import {
  addProperty,
  addRow,
  collectionKeys,
  deleteCollection,
  deleteRows,
  listRows,
  removeProperty,
  renameCollection,
  setCell,
} from "@/api/collections"
import type {
  CellValue,
  Collection,
  Property,
  RowPage,
} from "@/domain/collection"
import type { PropertyId, RowId } from "@/domain/ids"

import { filtersFor, setFacet } from "@/domain/facets"
import type { Facet } from "@/domain/facets"
import { FacetChips } from "@/features/filters/facet-chips"
import { FacetPanel } from "@/features/filters/facet-panel"
import type { CountScope } from "@/features/filters/facet-panel"
import { useMediaQuery } from "@/hooks/use-media-query"

import type { SortSpec } from "@/domain/query"

import { CollectionTable } from "./collection-table"
import { PropertyDialog } from "./property-dialog"

type RowPages = InfiniteData<RowPage, number>

/** Applies a cell change to the cached pages before the server answers. */
const withCell = (
  pages: RowPages | undefined,
  rowId: RowId,
  propertyId: PropertyId,
  value: CellValue
) =>
  pages === undefined
    ? pages
    : {
        ...pages,
        pages: pages.pages.map((page) => ({
          ...page,
          rows: page.rows.map((row) =>
            row.id === rowId
              ? { ...row, values: { ...row.values, [propertyId]: value } }
              : row
          ),
        })),
      }

/** Counts in a collection cover every row; it has no time window. */
const allTime: CountScope = { timeField: null, timeRange: "all" }

/** Notion-style table: typed columns, inline edit, pages of 100 rows. */
export function CollectionView({ collection }: { collection: Collection }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [addingProperty, setAddingProperty] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [facets, setFacets] = useState<ReadonlyArray<Facet>>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({})

  const [deletingProperty, setDeletingProperty] = useState<Property | null>(
    null
  )

  const wide = useMediaQuery("(min-width: 48rem)", true)
  const [filtersShown, setFiltersShown] = useState<boolean | null>(null)
  // Open by default where there is room; a phone opens it on demand.
  const filtersOpen = filtersShown ?? wide

  // The table reports a column id; the server needs a known property.
  const sort: SortSpec | null = useMemo(() => {
    const first = sorting.at(0)

    const property = collection.properties.find(
      (candidate) => candidate.id === first?.id
    )

    return first === undefined || property === undefined
      ? null
      : { propertyId: property.id, direction: first.desc ? "desc" : "asc" }
  }, [sorting, collection.properties])

  const rowsKey = [...collectionKeys.rows(collection.id), facets, sort] as const

  const changeFacets = useCallback((next: ReadonlyArray<Facet>) => {
    setFacets(next)
    setRowSelection({})
  }, [])

  const rows = useInfiniteQuery({
    queryKey: rowsKey,
    queryFn: ({ pageParam }) =>
      listRows({
        data: {
          collectionId: collection.id,
          filters: filtersFor(facets, collection.id),
          sort,
          offset: pageParam,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  })

  const refreshCollection = (next: Collection) => {
    queryClient.setQueryData(collectionKeys.one(collection.id), next)
    void queryClient.invalidateQueries({
      queryKey: collectionKeys.all,
      exact: true,
    })
  }

  const invalidateFrames = () =>
    queryClient.invalidateQueries({ queryKey: ["frame"] })

  const editCell = useMutation({
    mutationFn: (input: {
      rowId: RowId
      propertyId: PropertyId
      value: CellValue
    }) => setCell({ data: input }),
    onMutate: async ({ rowId, propertyId, value }) => {
      await queryClient.cancelQueries({ queryKey: rowsKey })
      const previous = queryClient.getQueryData<RowPages>(rowsKey)

      queryClient.setQueryData<RowPages>(rowsKey, (pages) =>
        withCell(pages, rowId, propertyId, value)
      )

      return { previous }
    },
    onError: (_error, _input, context) =>
      queryClient.setQueryData(rowsKey, context?.previous),
    onSettled: invalidateFrames,
  })

  const createRow = useMutation({
    mutationFn: () =>
      addRow({ data: { collectionId: collection.id, values: {} } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rowsKey })
      void invalidateFrames()
    },
  })

  const removeRows = useMutation({
    mutationFn: (rowIds: ReadonlyArray<RowId>) =>
      deleteRows({ data: { rowIds } }),
    onSuccess: async () => {
      setRowSelection({})
      await queryClient.invalidateQueries({
        queryKey: collectionKeys.rows(collection.id),
      })
      void invalidateFrames()
    },
  })

  const createProperty = useMutation({
    mutationFn: (
      input: Omit<Parameters<typeof addProperty>[0]["data"], "collectionId">
    ) => addProperty({ data: { collectionId: collection.id, ...input } }),
    onSuccess: (next) => {
      refreshCollection(next)
      setAddingProperty(false)
    },
  })

  const dropProperty = useMutation({
    mutationFn: (propertyId: PropertyId) =>
      removeProperty({ data: { collectionId: collection.id, propertyId } }),
    onSuccess: async (next) => {
      refreshCollection(next)
      setDeletingProperty(null)
      setSorting([])
      await queryClient.invalidateQueries({ queryKey: rowsKey })
    },
  })

  const rename = useMutation({
    mutationFn: (name: string) =>
      renameCollection({ data: { collectionId: collection.id, name } }),
    onSuccess: refreshCollection,
  })

  const remove = useMutation({
    mutationFn: () =>
      deleteCollection({ data: { collectionId: collection.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: collectionKeys.all,
        exact: true,
      })
      await navigate({ to: "/" })
    },
  })

  // Stable rows and callbacks keep the table's row models from rebuilding.
  const loaded = useMemo(
    () => rows.data?.pages.flatMap((page) => page.rows),
    [rows.data]
  )

  const selectedIds = (loaded ?? []).flatMap((row) =>
    Object.hasOwn(rowSelection, row.id) ? [row.id] : []
  )

  const { mutate: mutateCell } = editCell

  const onEditCell = useCallback(
    (rowId: RowId, propertyId: PropertyId, value: CellValue) =>
      mutateCell({ rowId, propertyId, value }),
    [mutateCell]
  )

  const onAddProperty = useCallback(() => setAddingProperty(true), [])

  const total = rows.data?.pages.at(-1)?.total ?? 0

  const error = [
    editCell,
    createRow,
    removeRows,
    createProperty,
    dropProperty,
    rename,
    remove,
  ].find((mutation) => mutation.isError)?.error

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 px-4 pt-1 pb-3 md:px-6">
        <input
          aria-label="Collection name"
          className="min-w-0 flex-1 bg-transparent font-display text-2xl font-semibold tracking-tight outline-none focus-visible:underline focus-visible:decoration-border focus-visible:underline-offset-4"
          defaultValue={collection.name}
          key={collection.name}
          onBlur={(event) => {
            const name = event.target.value.trim()

            if (name !== "" && name !== collection.name) rename.mutate(name)
          }}
        />
        <span className="text-sm text-muted-foreground tabular-nums">
          {facets.length > 0 ? `${total} matching rows` : `${total} rows`}
        </span>
        <Button
          variant={filtersOpen ? "secondary" : "ghost"}
          size="sm"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersShown(!filtersOpen)}
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} data-icon="inline-start" />
          {facets.length > 0 ? `Filters (${facets.length})` : "Filters"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            <HugeiconsIcon icon={LayoutTable01Icon} data-icon="inline-start" />
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              {collection.properties.map((property) => (
                <DropdownMenuCheckboxItem
                  key={property.id}
                  checked={columnVisibility[property.id] !== false}
                  onCheckedChange={(visible) =>
                    setColumnVisibility({
                      ...columnVisibility,
                      [property.id]: visible,
                    })
                  }
                >
                  {property.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {confirmingDelete ? (
          <>
            <span className="text-sm">
              Delete this collection and its {total} rows?
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Delete collection
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete collection
          </Button>
        )}
      </header>
      {error !== undefined && (
        <p className="px-6 pb-2 text-sm text-destructive">{error.message}</p>
      )}
      <div className="px-4 pb-3 empty:hidden md:px-6">
        <FacetChips
          facets={facets}
          collections={[collection]}
          onRemove={(facet) =>
            changeFacets(setFacet(facets, facet.propertyId, null))
          }
          onClear={() => changeFacets([])}
        />
      </div>

      <div className="mx-4 mb-6 flex min-h-0 flex-1 flex-col gap-3 md:mx-6 md:flex-row">
        {filtersOpen && (
          <aside
            aria-label="Filters"
            className="shrink-0 overflow-hidden rounded-md bg-card shadow-xs md:w-64"
          >
            <ScrollArea>
              <div className="px-4 py-1">
                <FacetPanel
                  collection={collection}
                  facets={facets}
                  scope={allTime}
                  onChange={changeFacets}
                />
              </div>
            </ScrollArea>
          </aside>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-card shadow-xs">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 border-b bg-muted/60 px-3 py-2 text-sm">
              <span className="tabular-nums">
                {selectedIds.length} selected
              </span>
              <Button
                variant="destructive"
                size="xs"
                disabled={removeRows.isPending}
                onClick={() => removeRows.mutate(selectedIds)}
              >
                <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
                Delete{" "}
                {selectedIds.length === 1
                  ? "row"
                  : `${selectedIds.length} rows`}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setRowSelection({})}
              >
                Clear selection
              </Button>
            </div>
          )}
          <div className="min-h-0 flex-1">
            <ScrollArea>
              <CollectionTable
                collection={collection}
                rows={loaded}
                sorting={sorting}
                onSortingChange={setSorting}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                onEditCell={onEditCell}
                onAddProperty={onAddProperty}
                onDeleteProperty={setDeletingProperty}
              />
              <div className="flex items-center gap-2 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={createRow.isPending}
                  onClick={() => createRow.mutate()}
                >
                  <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
                  New row
                </Button>
                {rows.hasNextPage && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={rows.isFetchingNextPage}
                    onClick={() => void rows.fetchNextPage()}
                  >
                    Load more ({total - (loaded?.length ?? 0)} left)
                  </Button>
                )}
              </div>
              {loaded?.length === 0 && facets.length > 0 && (
                <p className="px-3 pb-4 text-sm text-muted-foreground">
                  No rows match these filters. Remove a filter to see more.
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {deletingProperty !== null && (
        <Dialog
          open
          onOpenChange={(open) => !open && setDeletingProperty(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete property?</DialogTitle>
              <DialogDescription>
                <strong className="font-medium text-foreground">
                  {deletingProperty.name}
                </strong>{" "}
                and its value in every row will be deleted. Panels that use it
                will show an error. You cannot undo this.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingProperty(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={dropProperty.isPending}
                onClick={() => dropProperty.mutate(deletingProperty.id)}
              >
                Delete property
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {addingProperty && (
        <PropertyDialog
          pending={createProperty.isPending}
          onClose={() => setAddingProperty(false)}
          onSubmit={(input) => createProperty.mutate(input)}
        />
      )}
    </div>
  )
}
