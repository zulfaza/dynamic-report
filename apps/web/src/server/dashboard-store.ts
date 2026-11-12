import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { Dashboard, DashboardSummary } from "@/domain/dashboard"
import { DashboardNotFound } from "@/domain/errors"
import type { StorageError } from "@/domain/errors"
import { newId } from "@/domain/ids"
import type { DashboardId } from "@/domain/ids"

import { decodeStored, now, withStorageError } from "./storage"

/** The whole dashboard is one JSON document: layout, panels and queries. */
const DashboardJson = Schema.fromJsonString(Dashboard)
const encodeDashboard = Schema.encodeSync(DashboardJson)
const decodeSpec = decodeStored(Schema.Struct({ spec: DashboardJson }))
const decodeSummary = decodeStored(DashboardSummary)

export class DashboardStore extends Context.Service<
  DashboardStore,
  {
    readonly list: Effect.Effect<ReadonlyArray<DashboardSummary>, StorageError>
    readonly get: (
      id: DashboardId
    ) => Effect.Effect<Dashboard, DashboardNotFound | StorageError>
    readonly create: (
      input: Omit<Dashboard, "id">
    ) => Effect.Effect<Dashboard, StorageError>
    readonly save: (
      dashboard: Dashboard
    ) => Effect.Effect<Dashboard, DashboardNotFound | StorageError>
    readonly remove: (id: DashboardId) => Effect.Effect<void, StorageError>
  }
>()("dynamic-report/DashboardStore") {}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  return DashboardStore.of({
    list: withStorageError(
      sql`SELECT id, name FROM dashboards ORDER BY name`
    ).pipe(Effect.flatMap(Effect.forEach(decodeSummary))),
    get: (id) =>
      Effect.gen(function* () {
        const row = (yield* withStorageError(
          sql`SELECT spec FROM dashboards WHERE id = ${id}`
        )).at(0)

        if (row === undefined)
          return yield* new DashboardNotFound({ dashboardId: id })

        const { spec } = yield* decodeSpec(row)

        return spec
      }),
    create: (input) => {
      const dashboard: Dashboard = { id: newId.dashboard(), ...input }

      return withStorageError(
        sql`INSERT INTO dashboards (id, name, spec, updated_at)
            VALUES (${dashboard.id}, ${dashboard.name}, ${encodeDashboard(dashboard)}, ${now()})`
      ).pipe(Effect.as(dashboard))
    },
    save: (dashboard) =>
      Effect.gen(function* () {
        const result = yield* withStorageError(
          sql`UPDATE dashboards
              SET name = ${dashboard.name}, spec = ${encodeDashboard(dashboard)}, updated_at = ${now()}
              WHERE id = ${dashboard.id}
              RETURNING id`
        )

        if (result.length === 0)
          return yield* new DashboardNotFound({ dashboardId: dashboard.id })

        return dashboard
      }),
    remove: (id) =>
      withStorageError(
        sql`DELETE FROM dashboards WHERE id = ${id}`.pipe(Effect.asVoid)
      ),
  })
})

export const DashboardStoreLive = Layer.effect(DashboardStore, make)
