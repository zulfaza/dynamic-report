import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

import type { Collection } from "@/domain/collection"
import type { Facet } from "@/domain/facets"

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const bound = (value: number | string) => {
  if (Number.isFinite(Number(value))) return String(value)

  const date = new Date(`${String(value)}T00:00:00Z`)

  return Number.isNaN(date.getTime()) ? String(value) : dateFormat.format(date)
}

/** What a chip says, for example "Category: Food, Bills" or "Amount: 10 – 100". */
const describe = (facet: Facet, collection: Collection | undefined) => {
  const property = collection?.properties.find(
    (candidate) => candidate.id === facet.propertyId
  )

  const name = property?.name ?? "Unknown property"

  switch (facet._tag) {
    case "options": {
      const options =
        property?.type._tag === "select" ? property.type.options : []

      const names = facet.optionIds.map(
        (id) => options.find((option) => option.id === id)?.name ?? "?"
      )

      return `${name}: ${names.join(", ")}`
    }

    case "checked":
      return `${name}: ${facet.values.map((value) => (value ? "Checked" : "Unchecked")).join(", ")}`
    case "range":
      if (facet.min !== null && facet.max !== null)
        return `${name}: ${bound(facet.min)} – ${bound(facet.max)}`

      if (facet.min !== null) return `${name} from ${bound(facet.min)}`

      return `${name} up to ${bound(facet.max ?? "")}`
  }
}

/** Active facets as removable chips, with one action to clear them all. */
export function FacetChips({
  facets,
  collections,
  onRemove,
  onClear,
}: {
  facets: ReadonlyArray<Facet>
  collections: ReadonlyArray<Collection>
  onRemove: (facet: Facet) => void
  onClear: () => void
}) {
  if (facets.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {facets.map((facet) => {
        const label = describe(
          facet,
          collections.find((item) => item.id === facet.collectionId)
        )

        return (
          <span
            key={`${facet.collectionId}:${facet.propertyId}`}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-card pr-1 pl-3 text-xs shadow-xs ring-1 ring-border"
          >
            {label}
            <button
              type="button"
              aria-label={`Remove filter ${label}`}
              onClick={() => onRemove(facet)}
              className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          </span>
        )
      })}
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-primary hover:underline focus-visible:underline focus-visible:outline-none"
      >
        Clear all
      </button>
    </div>
  )
}
