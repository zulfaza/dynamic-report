import {
  FlexRender,
  columnVisibilityFeature,
  createColumnHelper,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import type {
  Cell,
  ColumnVisibilityState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  Calendar03Icon,
  CheckmarkSquare02Icon,
  Delete02Icon,
  HashtagIcon,
  Tag01Icon,
  TextFontIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { memo, useMemo } from "react"

import type {
  CellValue,
  Collection,
  Property,
  PropertyKind,
  Row,
} from "@/domain/collection"
import type { PropertyId, RowId } from "@/domain/ids"

import { CellEditor } from "./cell-editor"

const features = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
})

const helper = createColumnHelper<typeof features, Row>()

export const kindIcon: Record<PropertyKind, typeof TextFontIcon> = {
  text: TextFontIcon,
  number: HashtagIcon,
  date: Calendar03Icon,
  checkbox: CheckmarkSquare02Icon,
  select: Tag01Icon,
}

/**
 * Column header in the shadcn data-table style: the title opens a menu to
 * sort, hide, or delete the property.
 */
function PropertyHeader({
  property,
  sorted,
  onSort,
  onClearSort,
  onHide,
  onDelete,
}: {
  property: Property
  sorted: false | "asc" | "desc"
  onSort: (direction: "asc" | "desc") => void
  onClearSort: () => void
  onHide: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="xs" />}
        aria-label={`${property.name} column options`}
      >
        <HugeiconsIcon
          icon={kindIcon[property.type._tag]}
          data-icon="inline-start"
        />
        {property.name}
        {sorted !== false && (
          <HugeiconsIcon
            icon={sorted === "asc" ? ArrowUp02Icon : ArrowDown02Icon}
            data-icon="inline-end"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onSort("asc")}>
          <HugeiconsIcon icon={ArrowUp02Icon} />
          Sort ascending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSort("desc")}>
          <HugeiconsIcon icon={ArrowDown02Icon} />
          Sort descending
        </DropdownMenuItem>
        {sorted !== false && (
          <DropdownMenuItem onClick={onClearSort}>Clear sort</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onHide}>
          <HugeiconsIcon icon={ViewOffSlashIcon} />
          Hide column
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <HugeiconsIcon icon={Delete02Icon} />
          Delete property
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const emptyRows: ReadonlyArray<Row> = []

/**
 * One body row, memoized. `cells` keeps its identity while the columns and
 * their visibility stay the same, so a selection change re-renders only the
 * rows whose `selected` flag changed.
 */
const CollectionRow = memo(function CollectionRow({
  cells,
  selected,
}: {
  cells: ReadonlyArray<Cell<typeof features, Row, unknown>>
  selected: boolean
}) {
  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      {cells.map((cell) => (
        <TableCell key={cell.id}>
          <FlexRender cell={cell} />
        </TableCell>
      ))}
    </TableRow>
  )
})

/**
 * The collection grid on TanStack Table. Sorting is manual: the server
 * sorts every row, the table only reports the wanted order. Selection and
 * column visibility are controlled by the owner.
 */
export function CollectionTable({
  collection,
  rows,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
  onEditCell,
  onAddProperty,
  onDeleteProperty,
}: {
  collection: Collection
  rows: ReadonlyArray<Row> | undefined
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  columnVisibility: ColumnVisibilityState
  onColumnVisibilityChange: OnChangeFn<ColumnVisibilityState>
  onEditCell: (rowId: RowId, propertyId: PropertyId, value: CellValue) => void
  onAddProperty: () => void
  onDeleteProperty: (property: Property) => void
}) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "select",
          enableSorting: false,
          enableHiding: false,
          header: ({ table }) => (
            <Checkbox
              aria-label="Select all loaded rows"
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={
                table.getIsSomePageRowsSelected() &&
                !table.getIsAllPageRowsSelected()
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(value)
              }
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              aria-label="Select row"
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(value)}
            />
          ),
        }),
        ...collection.properties.map((property) =>
          helper.accessor((row) => row.values[property.id] ?? null, {
            id: property.id,
            header: ({ column }) => (
              <PropertyHeader
                property={property}
                sorted={column.getIsSorted()}
                onSort={(direction) =>
                  column.toggleSorting(direction === "desc")
                }
                onClearSort={() => column.clearSorting()}
                onHide={() => column.toggleVisibility(false)}
                onDelete={() => onDeleteProperty(property)}
              />
            ),
            cell: ({ row }) => {
              const value = row.original.values[property.id] ?? null

              return (
                <CellEditor
                  key={`${row.id}:${String(value)}`}
                  rowId={row.original.id}
                  property={property}
                  value={value}
                  onEdit={onEditCell}
                />
              )
            },
          })
        ),
        helper.display({
          id: "add-property",
          enableSorting: false,
          enableHiding: false,
          header: () => (
            <Button variant="ghost" size="xs" onClick={onAddProperty}>
              <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
              Property
            </Button>
          ),
          cell: () => null,
        }),
      ]),
    [collection.properties, onAddProperty, onDeleteProperty, onEditCell]
  )

  const table = useTable({
    features,
    columns,
    data: rows ?? emptyRows,
    getRowId: (row) => row.id,
    manualSorting: true,
    enableMultiSort: false,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange,
    onRowSelectionChange,
    onColumnVisibilityChange,
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <CollectionRow
            key={row.id}
            cells={row.getVisibleCells()}
            selected={row.getIsSelected()}
          />
        ))}
      </TableBody>
    </Table>
  )
}
