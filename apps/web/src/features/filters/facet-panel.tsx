import { useQuery } from "@tanstack/react-query"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { Fragment, memo, useId } from "react"

import { DatePicker } from "@/components/date-picker"

import { frameQuery } from "@/api/dashboards"
import { ToneLabel } from "@/components/tone"
import type { Collection, Property, SelectColor } from "@/domain/collection"
import { filtersFor, setFacet } from "@/domain/facets"
import type { Facet } from "@/domain/facets"
import type { PropertyId } from "@/domain/ids"
import type { FrameValue, TimeRange } from "@/domain/query"

/** What the counts are scoped to: the time window of the page that shows them. */
export interface CountScope {
  readonly timeField: PropertyId | null
  readonly timeRange: TimeRange
}

const countFormat = new Intl.NumberFormat()

/**
 * Row counts per value of one property, under every other active facet.
 * Leaving out the property's own facet keeps the counts of unticked
 * options visible, so OR inside a group still reads correctly.
 */
function useFacetCounts(
  collection: Collection,
  property: Property,
  facets: ReadonlyArray<Facet>,
  scope: CountScope
) {
  const others = facets.filter((facet) => facet.propertyId !== property.id)

  const frame = useQuery(
    frameQuery(
      {
        _tag: "aggregate",
        collectionId: collection.id,
        filters: filtersFor(others, collection.id),
        timeField: scope.timeField,
        dimensions: [{ _tag: "property", propertyId: property.id }],
        metrics: [{ _tag: "count" }],
        order: "dimension",
        limit: 1000,
      },
      scope.timeRange
    )
  )

  return (value: FrameValue) => {
    const row = frame.data?.rows.find((candidate) => candidate[0] === value)
    const count = Number(row?.[1] ?? 0)

    return frame.data === undefined ? null : count
  }
}

/**
 * One property's filter, open by default. The header toggles it; the field
 * set takes its accessible name from the header.
 */
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const headerId = useId()

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger
        id={headerId}
        render={
          <button
            type="button"
            className="group/trigger flex w-full items-center justify-between rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        }
      >
        {title}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className="size-4 text-muted-foreground transition-transform duration-200 group-data-panel-open/trigger:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-3">
          <FieldSet aria-labelledby={headerId}>{children}</FieldSet>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** A checkbox with its label and how many rows have that value. */
function OptionRow({
  label,
  tone,
  count,
  checked,
  onToggle,
}: {
  label: string
  tone: SelectColor | null
  count: number | null
  checked: boolean
  onToggle: () => void
}) {
  const id = useId()
  const empty = count === 0 && !checked

  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <FieldLabel htmlFor={id}>
        <span
          data-empty={empty}
          className="data-[empty=true]:text-muted-foreground"
        >
          {tone === null ? label : <ToneLabel tone={tone}>{label}</ToneLabel>}
        </span>
      </FieldLabel>
      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
        {count === null ? "" : countFormat.format(count)}
      </span>
    </Field>
  )
}

function SelectFacet({
  collection,
  property,
  facets,
  scope,
  onChange,
}: FacetProps) {
  const countOf = useFacetCounts(collection, property, facets, scope)

  if (property.type._tag !== "select") return null

  const active = facets.find(
    (facet) => facet.propertyId === property.id && facet._tag === "options"
  )

  const selected = active?._tag === "options" ? active.optionIds : []

  return (
    <Section title={property.name}>
      <FieldGroup data-slot="checkbox-group">
        {property.type.options.map((option) => {
          const checked = selected.includes(option.id)

          return (
            <OptionRow
              key={option.id}
              label={option.name}
              tone={option.color}
              count={countOf(option.name)}
              checked={checked}
              onToggle={() => {
                const optionIds = checked
                  ? selected.filter((id) => id !== option.id)
                  : [...selected, option.id]

                onChange(
                  setFacet(
                    facets,
                    property.id,
                    optionIds.length === 0
                      ? null
                      : {
                          _tag: "options",
                          collectionId: collection.id,
                          propertyId: property.id,
                          optionIds,
                        }
                  )
                )
              }}
            />
          )
        })}
      </FieldGroup>
    </Section>
  )
}

function CheckboxFacet({
  collection,
  property,
  facets,
  scope,
  onChange,
}: FacetProps) {
  const countOf = useFacetCounts(collection, property, facets, scope)

  const active = facets.find(
    (facet) => facet.propertyId === property.id && facet._tag === "checked"
  )

  const selected = active?._tag === "checked" ? active.values : []

  return (
    <Section title={property.name}>
      <FieldGroup data-slot="checkbox-group">
        {[true, false].map((value) => {
          const checked = selected.includes(value)

          return (
            <OptionRow
              key={String(value)}
              label={value ? "Checked" : "Unchecked"}
              tone={null}
              count={countOf(value)}
              checked={checked}
              onToggle={() => {
                const values = checked
                  ? selected.filter((item) => item !== value)
                  : [...selected, value]

                onChange(
                  setFacet(
                    facets,
                    property.id,
                    values.length === 0
                      ? null
                      : {
                          _tag: "checked",
                          collectionId: collection.id,
                          propertyId: property.id,
                          values,
                        }
                  )
                )
              }}
            />
          )
        })}
      </FieldGroup>
    </Section>
  )
}

/** Min and max bounds. Each commits on blur or Enter. */
function RangeFacet({ collection, property, facets, onChange }: FacetProps) {
  const kind = property.type._tag === "date" ? "date" : "number"

  const active = facets.find(
    (facet) => facet.propertyId === property.id && facet._tag === "range"
  )

  const bounds = active?._tag === "range" ? active : null

  const commit = (edge: "min" | "max", raw: string) => {
    const value = raw === "" ? null : kind === "number" ? Number(raw) : raw

    const parsed =
      value === null || kind === "date" || Number.isFinite(value) ? value : null

    const min = edge === "min" ? parsed : (bounds?.min ?? null)
    const max = edge === "max" ? parsed : (bounds?.max ?? null)

    onChange(
      setFacet(
        facets,
        property.id,
        min === null && max === null
          ? null
          : {
              _tag: "range",
              collectionId: collection.id,
              propertyId: property.id,
              min,
              max,
            }
      )
    )
  }

  const commitDate = (edge: "min" | "max", value: string | null) => {
    const min = edge === "min" ? value : (bounds?.min ?? null)
    const max = edge === "max" ? value : (bounds?.max ?? null)

    onChange(
      setFacet(
        facets,
        property.id,
        min === null && max === null
          ? null
          : {
              _tag: "range",
              collectionId: collection.id,
              propertyId: property.id,
              min,
              max,
            }
      )
    )
  }

  const edges: ReadonlyArray<"min" | "max"> = ["min", "max"]

  const boundText = (edge: "min" | "max") => {
    const bound = bounds?.[edge] ?? null

    return bound === null ? null : String(bound)
  }

  return (
    <Section title={property.name}>
      {kind === "date" ? (
        <div className="grid grid-cols-2 gap-2 *:min-w-0 *:justify-start">
          {edges.map((edge) => (
            <DatePicker
              key={edge}
              label={`${property.name} ${edge === "min" ? "from" : "to"}`}
              placeholder={edge === "min" ? "From" : "To"}
              value={boundText(edge)}
              onChange={(value) => commitDate(edge, value)}
            />
          ))}
        </div>
      ) : (
        <Field orientation="horizontal">
          {edges.map((edge) => (
            <Input
              key={`${edge}:${String(bounds?.[edge] ?? "")}`}
              type="number"
              aria-label={`${property.name} ${edge === "min" ? "from" : "to"}`}
              placeholder={edge === "min" ? "Min" : "Max"}
              defaultValue={String(bounds?.[edge] ?? "")}
              onBlur={(event) => commit(edge, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur()
              }}
            />
          ))}
        </Field>
      )}
    </Section>
  )
}

interface FacetProps {
  collection: Collection
  property: Property
  facets: ReadonlyArray<Facet>
  scope: CountScope
  onChange: (facets: ReadonlyArray<Facet>) => void
}

function PropertyFacet(props: FacetProps) {
  switch (props.property.type._tag) {
    case "select":
      return <SelectFacet {...props} />
    case "checkbox":
      return <CheckboxFacet {...props} />
    case "number":
    case "date":
      return <RangeFacet {...props} />
    case "text":
      return null
  }
}

/**
 * Facet filters for one collection, in property order. `facets` may hold
 * facets of other collections; they pass through `onChange` untouched.
 * Memoized: give it stable props, so owner state such as a row selection
 * does not re-render every facet.
 */
export const FacetPanel = memo(function FacetPanel({
  collection,
  facets,
  scope,
  onChange,
}: {
  collection: Collection
  facets: ReadonlyArray<Facet>
  scope: CountScope
  onChange: (facets: ReadonlyArray<Facet>) => void
}) {
  const own = facets.filter((facet) => facet.collectionId === collection.id)

  // Free text has a value per row; a facet list would not help.
  const facetable = collection.properties.filter(
    (property) => property.type._tag !== "text"
  )

  const others = facets.filter((facet) => facet.collectionId !== collection.id)

  return (
    <div className="flex flex-col gap-4 py-3">
      {facetable.map((property, index) => (
        <Fragment key={property.id}>
          {index > 0 && <Separator />}
          <PropertyFacet
            collection={collection}
            property={property}
            facets={own}
            scope={scope}
            onChange={(next) => onChange([...others, ...next])}
          />
        </Fragment>
      ))}
    </div>
  )
})
