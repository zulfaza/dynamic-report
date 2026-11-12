import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import * as Schema from "effect/Schema"

import { dashboardQuery } from "@/api/dashboards"
import { DashboardId } from "@/domain/ids"
import { Facet } from "@/domain/facets"
import { TimeRange } from "@/domain/query"
import { DashboardView } from "@/features/dashboard/dashboard-view"

const decodeParams = Schema.decodeUnknownSync(
  Schema.Struct({ dashboardId: DashboardId })
)

/**
 * The time range and filters live in the URL, so a shared link shows the
 * same window and the same slice of data.
 */
const Search = Schema.Struct({
  range: Schema.optional(TimeRange),
  filters: Schema.optional(Schema.Array(Facet)),
})

export const Route = createFileRoute("/dashboards/$dashboardId")({
  params: {
    parse: decodeParams,
    stringify: ({ dashboardId }) => ({ dashboardId }),
  },
  validateSearch: Schema.toStandardSchemaV1(Search),
  component: DashboardPage,
})

function DashboardPage() {
  const { dashboardId } = Route.useParams()
  const { range, filters } = Route.useSearch()
  const navigate = Route.useNavigate()
  const dashboard = useQuery(dashboardQuery(dashboardId))

  if (dashboard.isPending)
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>

  if (dashboard.isError)
    return (
      <p className="p-6 text-sm text-destructive">{dashboard.error.message}</p>
    )

  return (
    <DashboardView
      key={dashboardId}
      dashboard={dashboard.data}
      timeRange={range ?? dashboard.data.timeRange}
      onTimeRangeChange={(next) =>
        void navigate({
          search: (current) => ({ ...current, range: next }),
          replace: true,
        })
      }
      facets={filters ?? []}
      onFacetsChange={(next) =>
        void navigate({
          search: (current) => ({
            ...current,
            filters: next.length === 0 ? undefined : next,
          }),
          replace: true,
        })
      }
    />
  )
}
