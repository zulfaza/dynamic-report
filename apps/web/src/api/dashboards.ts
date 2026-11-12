import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import * as Schema from "effect/Schema"

import { Dashboard } from "@/domain/dashboard"
import { DashboardId } from "@/domain/ids"
import { Query, TimeRange } from "@/domain/query"
import type {
  Query as QueryValue,
  TimeRange as TimeRangeValue,
} from "@/domain/query"
import { DashboardStore, QueryEngine, runServer } from "@/server/runtime"
import { createSampleData } from "@/server/sample-data"

const input = <S extends Schema.Decoder<unknown>>(schema: S) =>
  Schema.toStandardSchemaV1(schema)

export const listDashboards = createServerFn({ method: "GET" }).handler(() =>
  runServer(DashboardStore.use((store) => store.list))
)

export const getDashboard = createServerFn({ method: "GET" })
  .validator(input(Schema.Struct({ dashboardId: DashboardId })))
  .handler(({ data }) =>
    runServer(DashboardStore.use((store) => store.get(data.dashboardId)))
  )

export const createDashboard = createServerFn({ method: "POST" })
  .validator(input(Schema.Struct({ name: Schema.String })))
  .handler(({ data }) =>
    runServer(
      DashboardStore.use((store) =>
        store.create({ name: data.name, timeRange: "30d", rows: [] })
      )
    )
  )

export const saveDashboard = createServerFn({ method: "POST" })
  .validator(input(Schema.Struct({ dashboard: Dashboard })))
  .handler(({ data }) =>
    runServer(DashboardStore.use((store) => store.save(data.dashboard)))
  )

export const deleteDashboard = createServerFn({ method: "POST" })
  .validator(input(Schema.Struct({ dashboardId: DashboardId })))
  .handler(({ data }) =>
    runServer(DashboardStore.use((store) => store.remove(data.dashboardId)))
  )

/** POST, because a query is a JSON document and does not fit a URL well. */
export const runQuery = createServerFn({ method: "POST" })
  .validator(input(Schema.Struct({ query: Query, timeRange: TimeRange })))
  .handler(({ data }) =>
    runServer(
      QueryEngine.use((engine) => engine.run(data.query, data.timeRange))
    )
  )

export const loadSampleData = createServerFn({ method: "POST" }).handler(() =>
  runServer(createSampleData)
)

export const dashboardKeys = {
  all: ["dashboards"] as const,
  one: (dashboardId: DashboardId) => ["dashboards", dashboardId] as const,
}

export const dashboardsQuery = queryOptions({
  queryKey: dashboardKeys.all,
  queryFn: () => listDashboards(),
})

export const dashboardQuery = (dashboardId: DashboardId) =>
  queryOptions({
    queryKey: dashboardKeys.one(dashboardId),
    queryFn: () => getDashboard({ data: { dashboardId } }),
    // The editor keeps a draft; do not replace it under the user.
    refetchOnWindowFocus: false,
  })

/**
 * The key holds the whole query, so two panels with the same query share
 * one request, and a time range change refetches only what it affects.
 */
export const frameQuery = (query: QueryValue, timeRange: TimeRangeValue) =>
  queryOptions({
    queryKey: ["frame", query, timeRange] as const,
    queryFn: () => runQuery({ data: { query, timeRange } }),
    staleTime: 30_000,
  })
