import { Checkbox } from "@workspace/ui/components/checkbox"
import { memo, useState } from "react"

import { Choice } from "@/components/choice"
import type { CellValue, Property } from "@/domain/collection"
import type { PropertyId, RowId } from "@/domain/ids"

const inputClass =
  "h-8 w-full bg-transparent px-2 text-sm outline-none focus:bg-muted/60 tabular-nums data-[numeric=true]:text-right"

/**
 * Text-like editor that keeps a local draft and commits on blur or Enter,
 * so typing does not send one request per key.
 */
function DraftInput({
  type,
  initial,
  onCommit,
  label,
}: {
  type: "text" | "number" | "date"
  initial: string
  onCommit: (raw: string) => void
  label: string
}) {
  const [draft, setDraft] = useState(initial)

  return (
    <input
      type={type}
      aria-label={label}
      data-numeric={type === "number"}
      className={inputClass}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value)

        if (type === "date") onCommit(event.target.value)
      }}
      onBlur={() => {
        if (draft !== initial && type !== "date") onCommit(draft)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()

        if (event.key === "Escape") setDraft(initial)
      }}
    />
  )
}

const emptyKey = "__empty__"

/**
 * One editable cell. The editor follows the property type. Memoized, and
 * all props are stable, so a row re-render (for example on selection)
 * does not re-render the editor.
 */
export const CellEditor = memo(function CellEditor({
  rowId,
  property,
  value,
  onEdit,
}: {
  rowId: RowId
  property: Property
  value: CellValue
  onEdit: (rowId: RowId, propertyId: PropertyId, value: CellValue) => void
}) {
  const label = property.name
  const onChange = (next: CellValue) => onEdit(rowId, property.id, next)

  switch (property.type._tag) {
    case "text":
      return (
        <DraftInput
          type="text"
          label={label}
          initial={value === null ? "" : String(value)}
          onCommit={(raw) => onChange(raw === "" ? null : raw)}
        />
      )
    case "number":
      return (
        <DraftInput
          type="number"
          label={label}
          initial={value === null ? "" : String(value)}
          onCommit={(raw) => {
            const parsed = Number(raw)

            onChange(raw === "" || !Number.isFinite(parsed) ? null : parsed)
          }}
        />
      )
    case "date":
      return (
        <DraftInput
          type="date"
          label={label}
          initial={value === null ? "" : String(value)}
          onCommit={(raw) => onChange(raw === "" ? null : raw)}
        />
      )
    case "checkbox":
      return (
        <div className="flex h-8 items-center px-2">
          <Checkbox
            aria-label={label}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      )
    case "select":
      return (
        <div className="px-2">
          <Choice
            label={label}
            value={value === null ? emptyKey : String(value)}
            options={[
              { value: emptyKey, label: "—" },
              ...property.type.options.map((option) => ({
                value: option.id,
                label: option.name,
                tone: option.color,
              })),
            ]}
            onChange={(next) => onChange(next === emptyKey ? null : next)}
          />
        </div>
      )
  }
})
