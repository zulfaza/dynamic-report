import { useQuery } from "@tanstack/react-query"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { frameQuery } from "@/api/dashboards"
import type { Panel } from "@/domain/dashboard"
import { withFacets } from "@/domain/facets"
import type { TimeRange } from "@/domain/query"
import { useDashboardFacets } from "@/features/filters/dashboard-facets"
import { VizMessage, VizView } from "@/features/viz/viz-view"

function QueryPanelBody({
  panel,
  timeRange,
}: {
  panel: Extract<Panel, { _tag: "query" }>
  timeRange: TimeRange
}) {
  const facets = useDashboardFacets()
  const frame = useQuery(frameQuery(withFacets(panel.query, facets), timeRange))

  if (frame.isPending) return <VizMessage>Loading…</VizMessage>

  if (frame.isError) return <VizMessage>{frame.error.message}</VizMessage>

  return <VizView viz={panel.viz} frame={frame.data} label={panel.title} />
}

/** The content of a panel. Each query panel fetches its own frame. */
export function PanelBody({
  panel,
  timeRange,
}: {
  panel: Panel
  timeRange: TimeRange
}) {
  switch (panel._tag) {
    case "text":
      return (
        <ScrollArea>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {panel.body}
          </p>
        </ScrollArea>
      )
    case "query":
      return <QueryPanelBody panel={panel} timeRange={timeRange} />
  }
}
