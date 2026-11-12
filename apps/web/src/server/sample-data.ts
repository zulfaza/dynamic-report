import * as Effect from "effect/Effect"

import type { Property, RowValues, SelectColor } from "@/domain/collection"
import type { LayoutCell, Panel } from "@/domain/dashboard"
import { newId } from "@/domain/ids"
import type { OwnerId } from "@/domain/ids"
import type { Metric, Query } from "@/domain/query"

import { CollectionStore, DashboardStore, RowStore } from "./runtime"

const categories: ReadonlyArray<{
  name: string
  color: SelectColor
  low: number
  high: number
}> = [
  { name: "Food", color: "orange", low: 4, high: 60 },
  { name: "Transport", color: "blue", low: 2, high: 40 },
  { name: "Bills", color: "red", low: 30, high: 220 },
  { name: "Fun", color: "purple", low: 10, high: 120 },
  { name: "Health", color: "green", low: 15, high: 90 },
]

const merchants = [
  "Corner Shop",
  "Metro",
  "Grid Power",
  "Cinema",
  "Pharmacy",
  "Cafe",
  "Taxi",
]

/** Small deterministic generator, so every seed gives the same data. */
const random = (seed: number) => {
  let state = seed

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296

    return state / 4_294_967_296
  }
}

/**
 * Creates an "Expenses" collection with about 400 rows over the last six
 * months, and a "Finance" dashboard that shows every visualization kind,
 * both for the owner. It runs on demand: a new owner starts empty and
 * loads it from the sidebar.
 */
export const createSampleData = Effect.fnUntraced(function* (owner: OwnerId) {
  const collections = yield* CollectionStore
  const rows = yield* RowStore
  const dashboards = yield* DashboardStore

  const options = categories.map((category) => ({
    id: newId.selectOption(),
    name: category.name,
    color: category.color,
  }))

  const name: Property = {
    id: newId.property(),
    name: "Name",
    type: { _tag: "text" },
  }

  const amount: Property = {
    id: newId.property(),
    name: "Amount",
    type: { _tag: "number", format: "currency" },
  }

  const category: Property = {
    id: newId.property(),
    name: "Category",
    type: { _tag: "select", options },
  }

  const date: Property = {
    id: newId.property(),
    name: "Date",
    type: { _tag: "date" },
  }

  const paid: Property = {
    id: newId.property(),
    name: "Paid",
    type: { _tag: "checkbox" },
  }

  const collection = yield* collections.create(owner, {
    name: "Expenses",
    properties: [name, amount, category, date, paid],
  })

  const next = random(42)
  const today = Date.now()
  const values: Array<RowValues> = []

  for (let index = 0; index < 400; index += 1) {
    const pick = Math.floor(next() * categories.length)
    const spec = categories.at(pick)
    const option = options.at(pick)

    if (spec === undefined || option === undefined) break

    const daysAgo = Math.floor(next() * 180)

    values.push({
      [name.id]: merchants[Math.floor(next() * merchants.length)] ?? "Shop",
      [amount.id]:
        Math.round((spec.low + next() * (spec.high - spec.low)) * 100) / 100,
      [category.id]: option.id,
      [date.id]: new Date(today - daysAgo * 86_400_000)
        .toISOString()
        .slice(0, 10),
      [paid.id]: next() > 0.15,
    })
  }

  yield* rows.insert(collection, values)

  const aggregate = (
    input: Pick<
      Extract<Query, { _tag: "aggregate" }>,
      "dimensions" | "metrics" | "order"
    >
  ): Query => ({
    _tag: "aggregate",
    collectionId: collection.id,
    filters: [],
    timeField: date.id,
    limit: 1000,
    ...input,
  })

  const sum: Metric = { _tag: "aggregate", op: "sum", propertyId: amount.id }

  const queryPanel = (
    title: string,
    query: Query,
    viz: Extract<Panel, { _tag: "query" }>["viz"]
  ): Panel => ({ _tag: "query", id: newId.panel(), title, query, viz })

  const cell = (size: number, panel: Panel): LayoutCell => ({ size, panel })

  const totals = aggregate({
    dimensions: [],
    metrics: [sum],
    order: "dimension",
  })

  return yield* dashboards.create(owner, {
    name: "Finance",
    timeRange: "90d",
    rows: [
      {
        id: newId.layoutRow(),
        size: 22,
        cells: [
          cell(25, queryPanel("Total spend", totals, { _tag: "stat" })),
          cell(
            25,
            queryPanel(
              "Transactions",
              aggregate({
                dimensions: [],
                metrics: [{ _tag: "count" }],
                order: "dimension",
              }),
              { _tag: "stat" }
            )
          ),
          cell(
            25,
            queryPanel(
              "Average expense",
              aggregate({
                dimensions: [],
                metrics: [
                  { _tag: "aggregate", op: "avg", propertyId: amount.id },
                ],
                order: "dimension",
              }),
              { _tag: "stat" }
            )
          ),
          cell(25, {
            _tag: "text",
            id: newId.panel(),
            title: "About",
            body: "Sample data. Press Edit to change panels, drag the handles to resize, and pick a time range at the top.",
          }),
        ],
      },
      {
        id: newId.layoutRow(),
        size: 42,
        cells: [
          cell(
            65,
            queryPanel(
              "Weekly spend by category",
              aggregate({
                dimensions: [
                  { _tag: "time", propertyId: date.id, bucket: "week" },
                  { _tag: "property", propertyId: category.id },
                ],
                metrics: [sum],
                order: "dimension",
              }),
              { _tag: "timeseries", style: "line" }
            )
          ),
          cell(
            35,
            queryPanel(
              "Spend by category",
              aggregate({
                dimensions: [{ _tag: "property", propertyId: category.id }],
                metrics: [sum],
                order: "measure-desc",
              }),
              { _tag: "pie" }
            )
          ),
        ],
      },
      {
        id: newId.layoutRow(),
        size: 36,
        cells: [
          cell(
            40,
            queryPanel(
              "Monthly spend",
              aggregate({
                dimensions: [
                  { _tag: "time", propertyId: date.id, bucket: "month" },
                ],
                metrics: [sum],
                order: "dimension",
              }),
              { _tag: "bar" }
            )
          ),
          cell(
            60,
            queryPanel(
              "Latest expenses",
              {
                _tag: "rows",
                collectionId: collection.id,
                filters: [],
                timeField: date.id,
                sort: { propertyId: date.id, direction: "desc" },
                limit: 50,
              },
              { _tag: "table" }
            )
          ),
        ],
      },
    ],
  })
})
