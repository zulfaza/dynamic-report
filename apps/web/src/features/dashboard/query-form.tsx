import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

import { Choice } from "@/components/choice"
import type { ChoiceOption } from "@/components/choice"
import type { Collection, Property } from "@/domain/collection"
import type { PropertyId } from "@/domain/ids"
import type {
  AggregateOp,
  CompareOp,
  Dimension,
  Filter,
  Metric,
  Query,
  TimeBucket,
} from "@/domain/query"

/** A starting query for a collection: count rows, filtered by its first date. */
export const defaultQuery = (collection: Collection): Query => ({
  _tag: "aggregate",
  collectionId: collection.id,
  filters: [],
  timeField:
    collection.properties.find((property) => property.type._tag === "date")
      ?.id ?? null,
  dimensions: [],
  metrics: [{ _tag: "count" }],
  order: "dimension",
  limit: 1000,
})

/** A choice whose options map to domain values by key, so no string is parsed back. */
interface Keyed<A> {
  readonly key: string
  readonly label: string
  readonly value: A
}

const options = <A,>(
  entries: ReadonlyArray<Keyed<A>>
): ReadonlyArray<ChoiceOption<string>> =>
  entries.map((entry) => ({ value: entry.key, label: entry.label }))

const pick = <A,>(entries: ReadonlyArray<Keyed<A>>, key: string) =>
  entries.find((entry) => entry.key === key)?.value

const buckets: ReadonlyArray<TimeBucket> = ["day", "week", "month"]
const aggregateOps: ReadonlyArray<AggregateOp> = ["sum", "avg", "min", "max"]

const aggregateLabels: Record<AggregateOp, string> = {
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
}

const dimensionKey = (dimension: Dimension | null) =>
  dimension === null
    ? "none"
    : dimension._tag === "time"
      ? `time:${dimension.propertyId}:${dimension.bucket}`
      : `property:${dimension.propertyId}`

const dimensionEntries = (properties: ReadonlyArray<Property>) => {
  const entries: Array<Keyed<Dimension | null>> = [
    { key: "none", label: "None", value: null },
  ]

  for (const property of properties) {
    if (property.type._tag === "date") {
      for (const bucket of buckets) {
        const dimension: Dimension = {
          _tag: "time",
          propertyId: property.id,
          bucket,
        }

        entries.push({
          key: dimensionKey(dimension),
          label: `${property.name} by ${bucket}`,
          value: dimension,
        })
      }
    } else if (property.type._tag !== "number") {
      const dimension: Dimension = { _tag: "property", propertyId: property.id }

      entries.push({
        key: dimensionKey(dimension),
        label: property.name,
        value: dimension,
      })
    }
  }

  return entries
}

const metricKey = (metric: Metric) =>
  metric._tag === "count" ? "count" : `${metric.op}:${metric.propertyId}`

const metricEntries = (properties: ReadonlyArray<Property>) => {
  const entries: Array<Keyed<Metric>> = [
    { key: "count", label: "Count of rows", value: { _tag: "count" } },
  ]

  for (const property of properties) {
    if (property.type._tag !== "number") continue

    for (const op of aggregateOps) {
      const metric: Metric = { _tag: "aggregate", op, propertyId: property.id }

      entries.push({
        key: metricKey(metric),
        label: `${aggregateLabels[op]} of ${property.name}`,
        value: metric,
      })
    }
  }

  return entries
}

type FilterOp = CompareOp | "isEmpty" | "isNotEmpty"

const opLabels: Record<FilterOp, string> = {
  eq: "is",
  neq: "is not",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
}

const opsFor = (property: Property): ReadonlyArray<FilterOp> =>
  property.type._tag === "number" || property.type._tag === "date"
    ? ["eq", "neq", "gt", "gte", "lt", "lte", "isEmpty", "isNotEmpty"]
    : ["eq", "neq", "isEmpty", "isNotEmpty"]

const defaultValue = (property: Property): string | number | boolean => {
  switch (property.type._tag) {
    case "number":
      return 0
    case "date":
      return new Date().toISOString().slice(0, 10)
    case "checkbox":
      return true
    case "select":
      return property.type.options[0]?.id ?? ""
    case "text":
      return ""
  }
}

const makeFilter = (
  property: Property,
  op: FilterOp,
  value: string | number | boolean
): Filter =>
  op === "isEmpty" || op === "isNotEmpty"
    ? { _tag: op, propertyId: property.id }
    : { _tag: "compare", propertyId: property.id, op, value }

/**
 * The editor shows one value per filter. An `in` filter (from dashboard
 * facets) reads as "is" with its first value.
 */
const filterOp = (filter: Filter): FilterOp => {
  switch (filter._tag) {
    case "compare":
      return filter.op
    case "in":
      return "eq"
    case "isEmpty":
    case "isNotEmpty":
      return filter._tag
  }
}

const filterValue = (filter: Filter) => {
  switch (filter._tag) {
    case "compare":
      return filter.value
    case "in":
      return filter.values.at(0)
    case "isEmpty":
    case "isNotEmpty":
      return undefined
  }
}

function FilterValue({
  property,
  value,
  onChange,
}: {
  property: Property
  value: string | number | boolean
  onChange: (value: string | number | boolean) => void
}) {
  switch (property.type._tag) {
    case "checkbox":
      return (
        <Choice
          label="Value"
          value={value === true ? "yes" : "no"}
          options={[
            { value: "yes", label: "Checked" },
            { value: "no", label: "Unchecked" },
          ]}
          onChange={(next) => onChange(next === "yes")}
        />
      )
    case "select":
      return (
        <Choice
          label="Value"
          value={String(value)}
          options={property.type.options.map((option) => ({
            value: option.id,
            label: option.name,
            tone: option.color,
          }))}
          onChange={onChange}
        />
      )
    case "number":
      return (
        <Input
          type="number"
          aria-label="Value"
          value={String(value)}
          onChange={(event) => {
            const next = event.target.valueAsNumber

            if (Number.isFinite(next)) onChange(next)
          }}
        />
      )
    case "date":
      return (
        <Input
          type="date"
          aria-label="Value"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case "text":
      return (
        <Input
          aria-label="Value"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }
}

function FilterRow({
  filter,
  properties,
  onChange,
  onRemove,
}: {
  filter: Filter
  properties: ReadonlyArray<Property>
  onChange: (filter: Filter) => void
  onRemove: () => void
}) {
  const property = properties.find(
    (candidate) => candidate.id === filter.propertyId
  )

  if (property === undefined) return null

  const op = filterOp(filter)

  const value = filterValue(filter) ?? defaultValue(property)

  return (
    <div className="grid grid-cols-12 items-center gap-2">
      <div className="col-span-4">
        <Choice
          label="Property"
          value={property.id}
          options={properties.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={(propertyId) => {
            const next = properties.find((item) => item.id === propertyId)

            if (next !== undefined)
              onChange(makeFilter(next, "eq", defaultValue(next)))
          }}
        />
      </div>
      <div className="col-span-3">
        <Choice
          label="Operator"
          value={op}
          options={opsFor(property).map((item) => ({
            value: item,
            label: opLabels[item],
          }))}
          onChange={(next) => onChange(makeFilter(property, next, value))}
        />
      </div>
      <div className="col-span-4">
        {filter._tag !== "isEmpty" && filter._tag !== "isNotEmpty" && (
          <FilterValue
            property={property}
            value={value}
            onChange={(next) => onChange(makeFilter(property, op, next))}
          />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Remove filter"
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} />
      </Button>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/** Edits a structured query for one collection. */
export function QueryForm({
  query,
  collection,
  onChange,
}: {
  query: Query
  collection: Collection
  onChange: (query: Query) => void
}) {
  const { properties } = collection

  const dateProperties = properties.filter(
    (property) => property.type._tag === "date"
  )

  const firstProperty = properties.at(0)

  const timeFieldOptions = [
    { value: "none", label: "None" },
    ...dateProperties.map((property) => ({
      value: property.id,
      label: property.name,
    })),
  ]

  const setTimeField = (key: string) =>
    onChange({
      ...query,
      timeField:
        dateProperties.find((property) => property.id === key)?.id ?? null,
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mode">
          <Choice
            label="Mode"
            value={query._tag}
            options={[
              { value: "aggregate", label: "Aggregate" },
              { value: "rows", label: "Raw rows" },
            ]}
            onChange={(mode) =>
              onChange(
                mode === "rows"
                  ? {
                      _tag: "rows",
                      collectionId: query.collectionId,
                      filters: query.filters,
                      timeField: query.timeField,
                      sort: null,
                      limit: 100,
                    }
                  : {
                      ...defaultQuery(collection),
                      filters: query.filters,
                      timeField: query.timeField,
                    }
              )
            }
          />
        </Field>
        <Field label="Time range applies to">
          <Choice
            label="Time field"
            value={query.timeField ?? "none"}
            options={timeFieldOptions}
            onChange={setTimeField}
          />
        </Field>
      </div>

      {query._tag === "aggregate" ? (
        <AggregateFields
          query={query}
          properties={properties}
          onChange={onChange}
        />
      ) : (
        <RowsFields query={query} properties={properties} onChange={onChange} />
      )}

      <Field label="Filters">
        <div className="flex flex-col gap-2">
          {query.filters.map((filter, index) => (
            <FilterRow
              key={index}
              filter={filter}
              properties={properties}
              onChange={(next) =>
                onChange({
                  ...query,
                  filters: query.filters.map((item, at) =>
                    at === index ? next : item
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...query,
                  filters: query.filters.filter((_, at) => at !== index),
                })
              }
            />
          ))}
          {firstProperty !== undefined && (
            <div>
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  onChange({
                    ...query,
                    filters: [
                      ...query.filters,
                      makeFilter(
                        firstProperty,
                        "eq",
                        defaultValue(firstProperty)
                      ),
                    ],
                  })
                }
              >
                <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
                Add filter
              </Button>
            </div>
          )}
        </div>
      </Field>
    </div>
  )
}

function AggregateFields({
  query,
  properties,
  onChange,
}: {
  query: Extract<Query, { _tag: "aggregate" }>
  properties: ReadonlyArray<Property>
  onChange: (query: Query) => void
}) {
  const dimensions = dimensionEntries(properties)
  const metrics = metricEntries(properties)
  const [first = null, second = null] = query.dimensions
  const [metric = { _tag: "count" }] = query.metrics

  const setDimensions = (next: ReadonlyArray<Dimension | null>) =>
    onChange({ ...query, dimensions: next.filter((item) => item !== null) })

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Group by">
        <Choice
          label="Group by"
          value={dimensionKey(first)}
          options={options(dimensions)}
          onChange={(key) =>
            setDimensions([pick(dimensions, key) ?? null, second])
          }
        />
      </Field>
      <Field label="Then by (series)">
        <Choice
          label="Series"
          value={dimensionKey(second)}
          options={options(dimensions)}
          onChange={(key) =>
            setDimensions([first, pick(dimensions, key) ?? null])
          }
        />
      </Field>
      <Field label="Metric">
        <Choice
          label="Metric"
          value={metricKey(metric)}
          options={options(metrics)}
          onChange={(key) => {
            const next = pick(metrics, key)

            if (next !== undefined) onChange({ ...query, metrics: [next] })
          }}
        />
      </Field>
      <Field label="Order">
        <Choice
          label="Order"
          value={query.order}
          options={[
            { value: "dimension", label: "By group" },
            { value: "measure-desc", label: "Largest first" },
          ]}
          onChange={(order) => onChange({ ...query, order })}
        />
      </Field>
    </div>
  )
}

function RowsFields({
  query,
  properties,
  onChange,
}: {
  query: Extract<Query, { _tag: "rows" }>
  properties: ReadonlyArray<Property>
  onChange: (query: Query) => void
}) {
  const sortOptions = [
    { value: "created", label: "Newest first" },
    ...properties.flatMap((property) => [
      { value: `${property.id}:asc`, label: `${property.name} ↑` },
      { value: `${property.id}:desc`, label: `${property.name} ↓` },
    ]),
  ]

  const sortKey =
    query.sort === null
      ? "created"
      : `${query.sort.propertyId}:${query.sort.direction}`

  const sortFor = (
    key: string
  ): { propertyId: PropertyId; direction: "asc" | "desc" } | null => {
    for (const property of properties) {
      if (key === `${property.id}:asc`)
        return { propertyId: property.id, direction: "asc" }

      if (key === `${property.id}:desc`)
        return { propertyId: property.id, direction: "desc" }
    }

    return null
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Sort">
        <Choice
          label="Sort"
          value={sortKey}
          options={sortOptions}
          onChange={(key) => onChange({ ...query, sort: sortFor(key) })}
        />
      </Field>
      <Field label="Limit">
        <Input
          type="number"
          min={1}
          max={1000}
          value={query.limit}
          onChange={(event) => {
            const next = Math.round(event.target.valueAsNumber)

            if (next >= 1 && next <= 1000) onChange({ ...query, limit: next })
          }}
        />
      </Field>
    </div>
  )
}
