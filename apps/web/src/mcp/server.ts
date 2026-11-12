import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/ai"

import {
  Collection,
  NumberFormat,
  Row,
  RowValues,
  SelectColor,
} from "@/domain/collection"
import type { PropertyType as PropertyTypeValue } from "@/domain/collection"
import { Dashboard, DashboardSummary, Panel, Viz } from "@/domain/dashboard"
import type { Dashboard as DashboardValue, LayoutRow } from "@/domain/dashboard"
import {
  CollectionId,
  DashboardId,
  LayoutRowId,
  PanelId,
  RowId,
  newId,
} from "@/domain/ids"
import type { LayoutRowId as LayoutRowIdValue } from "@/domain/ids"
import { Filter, Frame, Query, SortSpec, TimeRange } from "@/domain/query"
import { removeCell, replacePanel } from "@/features/dashboard/layout"
import {
  AppLive,
  CollectionStore,
  DashboardStore,
  QueryEngine,
  RowStore,
} from "@/server/runtime"

import { CredentialMiddleware, McpOwner } from "./credential"

/**
 * The Dynamic Report MCP server at `/mcp`. It is stateless (MCP
 * 2026-07-28): each POST runs in its own request scope, as Cloudflare
 * Workers require. Each tool calls the stores with the owner of the
 * caller's access token, so a client sees only the data of its user.
 */

/** Every failure a tool returns: the message of the domain error. */
class ToolError extends Schema.TaggedError<ToolError>()("ToolError", {
  message: Schema.String,
}) {}

const toToolError = <A, E extends { readonly message: string }, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, ToolError, R> =>
  Effect.mapError(effect, (error) => new ToolError({ message: error.message }))

const MAX_PAGE_SIZE = 100

const RowPage = Schema.Struct({
  rows: Schema.Array(Row),
  total: Schema.Finite,
  nextOffset: Schema.NullOr(Schema.Finite),
})

/** A property type as a client writes it: select options get their ids here. */
const PropertyTypeInput = Schema.Union([
  Schema.TaggedStruct("text", {}),
  Schema.TaggedStruct("number", { format: NumberFormat }),
  Schema.TaggedStruct("date", {}),
  Schema.TaggedStruct("checkbox", {}),
  Schema.TaggedStruct("select", {
    options: Schema.Array(
      Schema.Struct({ name: Schema.String, color: SelectColor })
    ),
  }),
])

const toPropertyType = (
  input: typeof PropertyTypeInput.Type
): PropertyTypeValue =>
  input._tag === "select"
    ? {
        _tag: "select",
        options: input.options.map((option) => ({
          id: newId.selectOption(),
          ...option,
        })),
      }
    : input

const PropertyInput = Schema.Struct({
  name: Schema.String,
  type: PropertyTypeInput,
})

/** A new panel. The server gives it its id. */
const PanelInput = Schema.Union([
  Schema.TaggedStruct("query", {
    title: Schema.String,
    query: Query,
    viz: Viz,
  }),
  Schema.TaggedStruct("text", { title: Schema.String, body: Schema.String }),
])

const typeHelp =
  'Property types: {"_tag":"text"}, {"_tag":"number","format":"plain"|"currency"|"percent"}, {"_tag":"date"} (values are "YYYY-MM-DD"), {"_tag":"checkbox"} (values are true or false), {"_tag":"select","options":[{"name","color"}]} (values are option ids; colors are gray, red, orange, yellow, green, blue, purple, pink).'

const queryHelp =
  'A query is {"_tag":"rows", collectionId, filters, timeField, sort, limit} for raw rows, or {"_tag":"aggregate", collectionId, filters, timeField, dimensions (0 to 2 of {"_tag":"property",propertyId} or {"_tag":"time",propertyId,bucket:"day"|"week"|"month"}), metrics (1 to 4 of {"_tag":"count"} or {"_tag":"aggregate",op:"sum"|"avg"|"min"|"max",propertyId}), order:"dimension"|"measure-desc", limit (1 to 1000)}. `timeField` is a date property id that the time range filters on, or null. A filter is {"_tag":"compare",propertyId,op:"eq"|"neq"|"gt"|"gte"|"lt"|"lte",value}, {"_tag":"in",propertyId,values}, {"_tag":"isEmpty",propertyId} or {"_tag":"isNotEmpty",propertyId}. The result is a frame: `fields` (label, kind, role) and `rows`, where rows[i][j] is the value of fields[j].'

// Read tools.

const CollectionsList = Tool.make("collections_list", {
  description:
    "List the collections of the user, each with its id, name and properties (id, name, type). Call this first to find collection and property ids.",
  parameters: Tool.EmptyParams,
  success: Schema.Array(Collection),
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Readonly, true)

const CollectionsDescribe = Tool.make("collections_describe", {
  description:
    "Describe one collection: its name and properties. Row values are keyed by property id, so read this before you write rows.",
  parameters: Schema.Struct({ collectionId: CollectionId }),
  success: Collection,
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Readonly, true)

const RowsList = Tool.make("rows_list", {
  description: `List the rows of one collection that match every filter, oldest first, or in the \`sort\` order. Each row has \`values\` keyed by property id. Returns up to \`limit\` rows (1 to ${MAX_PAGE_SIZE}, default ${MAX_PAGE_SIZE}) and \`total\`. When \`nextOffset\` is not null, pass it as \`offset\` to get the next page. ${queryHelp}`,
  parameters: Schema.Struct({
    collectionId: CollectionId,
    filters: Schema.optionalKey(Schema.Array(Filter)),
    sort: Schema.optionalKey(Schema.NullOr(SortSpec)),
    offset: Schema.optionalKey(
      Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
    ),
    limit: Schema.optionalKey(
      Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_PAGE_SIZE }))
    ),
  }),
  success: RowPage,
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Readonly, true)

const QueryRun = Tool.make("query_run", {
  description: `Run a query on a collection and return a frame, as a dashboard panel does. Use it to count, sum or group rows. \`timeRange\` is "7d", "30d", "90d", "1y" or "all" (default "all"). ${queryHelp}`,
  parameters: Schema.Struct({
    query: Query,
    timeRange: Schema.optionalKey(TimeRange),
  }),
  success: Frame,
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Readonly, true)

const DashboardsList = Tool.make("dashboards_list", {
  description: "List the dashboards of the user by id and name.",
  parameters: Tool.EmptyParams,
  success: Schema.Array(DashboardSummary),
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Readonly, true)

const DashboardsGet = Tool.make("dashboards_get", {
  description:
    "Get one dashboard: its time range and its layout. The layout is rows of cells, and each cell holds one panel. A query panel has a query and a visualization (stat, timeseries, bar, pie or table); a text panel has a markdown body.",
  parameters: Schema.Struct({ dashboardId: DashboardId }),
  success: Dashboard,
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Readonly, true)

const PanelsRun = Tool.make("panels_run", {
  description:
    "Run the query of one panel and return its frame. The time range is the dashboard time range, unless you send `timeRange`.",
  parameters: Schema.Struct({
    dashboardId: DashboardId,
    panelId: PanelId,
    timeRange: Schema.optionalKey(TimeRange),
  }),
  success: Frame,
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Readonly, true)

// Write tools.

const CollectionsCreate = Tool.make("collections_create", {
  description: `Create a collection with at least one property. Returns the collection with the new property ids. ${typeHelp}`,
  parameters: Schema.Struct({
    name: Schema.String,
    properties: Schema.Array(PropertyInput).check(Schema.isMinLength(1)),
  }),
  success: Collection,
  failure: ToolError,
  dependencies: [McpOwner],
})

const CollectionsAddProperty = Tool.make("collections_add_property", {
  description: `Add one property to a collection. Existing rows get an empty value for it. ${typeHelp}`,
  parameters: Schema.Struct({
    collectionId: CollectionId,
    name: Schema.String,
    type: PropertyTypeInput,
  }),
  success: Collection,
  failure: ToolError,
  dependencies: [McpOwner],
})

const RowsCreate = Tool.make("rows_create", {
  description:
    "Add 1 to 500 rows to a collection. Each row is an object of values keyed by property id; a missing key is an empty cell. Each value must fit its property type, else nothing is added.",
  parameters: Schema.Struct({
    collectionId: CollectionId,
    rows: Schema.Array(RowValues).check(Schema.isBetweenLength(1, 500)),
  }),
  success: Schema.Array(Row),
  failure: ToolError,
  dependencies: [McpOwner],
})

const RowsUpdate = Tool.make("rows_update", {
  description:
    "Set some cells of one row. `values` is keyed by property id; null empties a cell. Other cells do not change. A value that does not fit its property type changes nothing.",
  parameters: Schema.Struct({ rowId: RowId, values: RowValues }),
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Idempotent, true)

const RowsDelete = Tool.make("rows_delete", {
  description: "Delete 1 to 1000 rows by id. This cannot be undone.",
  parameters: Schema.Struct({
    rowIds: Schema.Array(RowId).check(Schema.isBetweenLength(1, 1000)),
  }),
  failure: ToolError,
  dependencies: [McpOwner],
})
  .annotate(Tool.Destructive, true)
  .annotate(Tool.Idempotent, true)

const DashboardsCreate = Tool.make("dashboards_create", {
  description:
    'Create an empty dashboard. `timeRange` is "7d", "30d", "90d", "1y" or "all" (default "30d"). Add panels with panels_add.',
  parameters: Schema.Struct({
    name: Schema.String,
    timeRange: Schema.optionalKey(TimeRange),
  }),
  success: Dashboard,
  failure: ToolError,
  dependencies: [McpOwner],
})

const PanelsAdd = Tool.make("panels_add", {
  description: `Add a panel to a dashboard. Send \`layoutRowId\` to put it at the end of that layout row; without it, the panel gets a new row at the bottom. Panels in a row, and rows, get equal sizes. A query panel is {"_tag":"query", title, query, viz}; viz is {"_tag":"stat"}, {"_tag":"timeseries","style":"line"|"area"}, {"_tag":"bar"}, {"_tag":"pie"} or {"_tag":"table"}. A text panel is {"_tag":"text", title, body}. Returns the dashboard. ${queryHelp}`,
  parameters: Schema.Struct({
    dashboardId: DashboardId,
    panel: PanelInput,
    layoutRowId: Schema.optionalKey(LayoutRowId),
  }),
  success: Dashboard,
  failure: ToolError,
  dependencies: [McpOwner],
})

const PanelsUpdate = Tool.make("panels_update", {
  description:
    "Replace one panel of a dashboard, found by its `id`. Read the panel with dashboards_get, change it, and send it back whole. The panel keeps its place and size. Returns the dashboard.",
  parameters: Schema.Struct({ dashboardId: DashboardId, panel: Panel }),
  success: Dashboard,
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Idempotent, true)

const PanelsRemove = Tool.make("panels_remove", {
  description:
    "Remove one panel from a dashboard. A layout row left without panels goes too. Returns the dashboard.",
  parameters: Schema.Struct({ dashboardId: DashboardId, panelId: PanelId }),
  success: Dashboard,
  failure: ToolError,
  dependencies: [McpOwner],
}).annotate(Tool.Destructive, true)

const DynamicReportToolkit = Toolkit.make(
  CollectionsList,
  CollectionsDescribe,
  RowsList,
  QueryRun,
  DashboardsList,
  DashboardsGet,
  PanelsRun,
  CollectionsCreate,
  CollectionsAddProperty,
  RowsCreate,
  RowsUpdate,
  RowsDelete,
  DashboardsCreate,
  PanelsAdd,
  PanelsUpdate,
  PanelsRemove
)

const equalSizes = <T extends { readonly size: number }>(
  items: ReadonlyArray<T>
): Array<T> => items.map((item) => ({ ...item, size: 100 / items.length }))

/** The layout row that holds the panel, if the dashboard has it. */
const findPanel = (dashboard: DashboardValue, panelId: PanelId) =>
  dashboard.rows
    .flatMap((row) =>
      row.cells
        .filter((cell) => cell.panel.id === panelId)
        .map((cell) => ({ rowId: row.id, panel: cell.panel }))
    )
    .at(0)

const panelNotFound = (dashboard: DashboardValue, panelId: string) =>
  new ToolError({
    message: `Panel ${panelId} is not on dashboard ${dashboard.id}.`,
  })

const addPanel = (
  dashboard: DashboardValue,
  panel: Panel,
  layoutRowId: LayoutRowIdValue | undefined
): Effect.Effect<DashboardValue, ToolError> => {
  if (layoutRowId === undefined) {
    const row: LayoutRow = {
      id: newId.layoutRow(),
      size: 100,
      cells: [{ size: 100, panel }],
    }

    return Effect.succeed({
      ...dashboard,
      rows: equalSizes([...dashboard.rows, row]),
    })
  }

  if (!dashboard.rows.some((row) => row.id === layoutRowId))
    return Effect.fail(
      new ToolError({
        message: `Layout row ${layoutRowId} is not on dashboard ${dashboard.id}.`,
      })
    )

  return Effect.succeed({
    ...dashboard,
    rows: dashboard.rows.map((row) =>
      row.id === layoutRowId
        ? { ...row, cells: equalSizes([...row.cells, { size: 100, panel }]) }
        : row
    ),
  })
}

const DynamicReportHandlers = DynamicReportToolkit.toLayer(
  Effect.gen(function* () {
    const collections = yield* CollectionStore
    const rows = yield* RowStore
    const dashboards = yield* DashboardStore
    const engine = yield* QueryEngine

    /** Reads, changes and saves one dashboard of the owner. */
    const editDashboard = (
      dashboardId: DashboardId,
      edit: (
        dashboard: DashboardValue
      ) => Effect.Effect<DashboardValue, ToolError>
    ) =>
      Effect.gen(function* () {
        const { owner } = yield* McpOwner
        const dashboard = yield* toToolError(dashboards.get(owner, dashboardId))
        const next = yield* edit(dashboard)

        return yield* toToolError(dashboards.save(owner, next))
      })

    return {
      collections_list: () =>
        McpOwner.use(({ owner }) => toToolError(collections.list(owner))),
      collections_describe: ({ collectionId }) =>
        McpOwner.use(({ owner }) =>
          toToolError(collections.get(owner, collectionId))
        ),
      rows_list: (input) =>
        McpOwner.use(({ owner }) =>
          toToolError(
            Effect.gen(function* () {
              const collection = yield* collections.get(
                owner,
                input.collectionId
              )

              return yield* rows.page(
                collection,
                input.filters ?? [],
                input.sort ?? null,
                input.offset ?? 0,
                input.limit ?? MAX_PAGE_SIZE
              )
            })
          )
        ),
      query_run: ({ query, timeRange }) =>
        McpOwner.use(({ owner }) =>
          toToolError(engine.run(owner, query, timeRange ?? "all"))
        ),
      dashboards_list: () =>
        McpOwner.use(({ owner }) => toToolError(dashboards.list(owner))),
      dashboards_get: ({ dashboardId }) =>
        McpOwner.use(({ owner }) =>
          toToolError(dashboards.get(owner, dashboardId))
        ),
      panels_run: ({ dashboardId, panelId, timeRange }) =>
        McpOwner.use(({ owner }) =>
          Effect.gen(function* () {
            const dashboard = yield* toToolError(
              dashboards.get(owner, dashboardId)
            )

            const found = findPanel(dashboard, panelId)

            if (found === undefined)
              return yield* panelNotFound(dashboard, panelId)

            if (found.panel._tag === "text")
              return yield* new ToolError({
                message: `Panel ${panelId} is a text panel and has no query.`,
              })

            return yield* toToolError(
              engine.run(
                owner,
                found.panel.query,
                timeRange ?? dashboard.timeRange
              )
            )
          })
        ),
      collections_create: ({ name, properties }) =>
        McpOwner.use(({ owner }) =>
          toToolError(
            collections.create(owner, {
              name,
              properties: properties.map((property) => ({
                id: newId.property(),
                name: property.name,
                type: toPropertyType(property.type),
              })),
            })
          )
        ),
      collections_add_property: ({ collectionId, name, type }) =>
        McpOwner.use(({ owner }) =>
          toToolError(
            collections.addProperty(owner, collectionId, {
              name,
              type: toPropertyType(type),
            })
          )
        ),
      rows_create: (input) =>
        McpOwner.use(({ owner }) =>
          toToolError(
            Effect.gen(function* () {
              const collection = yield* collections.get(
                owner,
                input.collectionId
              )

              return yield* rows.insert(collection, input.rows)
            })
          )
        ),
      rows_update: ({ rowId, values }) =>
        McpOwner.use(({ owner }) =>
          toToolError(rows.update(owner, rowId, values))
        ),
      rows_delete: ({ rowIds }) =>
        McpOwner.use(({ owner }) => toToolError(rows.remove(owner, rowIds))),
      dashboards_create: ({ name, timeRange }) =>
        McpOwner.use(({ owner }) =>
          toToolError(
            dashboards.create(owner, {
              name,
              timeRange: timeRange ?? "30d",
              rows: [],
            })
          )
        ),
      panels_add: ({ dashboardId, panel, layoutRowId }) =>
        editDashboard(dashboardId, (dashboard) =>
          addPanel(dashboard, { ...panel, id: newId.panel() }, layoutRowId)
        ),
      panels_update: ({ dashboardId, panel }) =>
        editDashboard(dashboardId, (dashboard) =>
          findPanel(dashboard, panel.id) === undefined
            ? Effect.fail(panelNotFound(dashboard, panel.id))
            : Effect.succeed(replacePanel(dashboard, panel))
        ),
      panels_remove: ({ dashboardId, panelId }) =>
        editDashboard(dashboardId, (dashboard) => {
          const found = findPanel(dashboard, panelId)

          return found === undefined
            ? Effect.fail(panelNotFound(dashboard, panelId))
            : Effect.succeed(removeCell(dashboard, found.rowId, panelId))
        }),
    }
  })
).pipe(Layer.provide(AppLive))

const instructions = [
  "Dynamic Report keeps the data of one user in collections. A collection has typed properties (text, number, date, checkbox, select), and rows whose values are keyed by property id.",
  "Call collections_list first to find collection and property ids. rows_list reads rows with filters, a sort and paging. query_run counts, sums or groups rows into a frame.",
  "collections_create and collections_add_property change the schema. rows_create, rows_update and rows_delete change rows.",
  "A dashboard is rows of panels. Each query panel runs a query and draws it as a stat, timeseries, bar, pie or table. dashboards_list and dashboards_get read dashboards, and panels_run runs one panel.",
  "dashboards_create makes an empty dashboard, and panels_add, panels_update and panels_remove change its panels.",
  "The user sees each change in the web app at once.",
].join(" ")

/** The `/mcp` app. src/routes/mcp.ts serves it. */
export const McpApp = McpServer.layerHttpRequestScoped({
  name: "Dynamic Report",
  version: "0.1.0",
  path: "/mcp",
  protocols: [McpProtocol.v2026_07_28],
  instructions,
  registrations: McpServer.toolkit(DynamicReportToolkit).pipe(
    Layer.provideMerge(DynamicReportHandlers)
  ),
}).pipe(Layer.provide(CredentialMiddleware.layer))
