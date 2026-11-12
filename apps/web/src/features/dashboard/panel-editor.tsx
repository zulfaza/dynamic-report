import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { useState } from "react"

import { collectionQuery, collectionsQuery } from "@/api/collections"
import { Choice } from "@/components/choice"
import type { Panel, Viz, VizKind } from "@/domain/dashboard"
import type { Collection } from "@/domain/collection"
import type { TimeRange } from "@/domain/query"

import { PanelBody } from "./panel-body"
import { QueryForm, defaultQuery } from "./query-form"

const vizChoices: ReadonlyArray<{
  value: VizKind | "area"
  label: string
  viz: Viz
}> = [
  { value: "stat", label: "Stat", viz: { _tag: "stat" } },
  {
    value: "timeseries",
    label: "Time series (line)",
    viz: { _tag: "timeseries", style: "line" },
  },
  {
    value: "area",
    label: "Time series (area)",
    viz: { _tag: "timeseries", style: "area" },
  },
  { value: "bar", label: "Bar", viz: { _tag: "bar" } },
  { value: "pie", label: "Pie", viz: { _tag: "pie" } },
  { value: "table", label: "Table", viz: { _tag: "table" } },
]

const vizKey = (viz: Viz) =>
  viz._tag === "timeseries" && viz.style === "area" ? "area" : viz._tag

const toQueryPanel = (panel: Panel, collection: Collection): Panel => ({
  _tag: "query",
  id: panel.id,
  title: panel.title,
  query: defaultQuery(collection),
  viz: { _tag: "stat" },
})

function QueryPanelFields({
  panel,
  onChange,
}: {
  panel: Extract<Panel, { _tag: "query" }>
  onChange: (panel: Panel) => void
}) {
  const collections = useQuery(collectionsQuery)
  const collection = useQuery(collectionQuery(panel.query.collectionId))

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Collection</span>
          <Choice
            label="Collection"
            value={panel.query.collectionId}
            options={(collections.data ?? []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(collectionId) => {
              const next = collections.data?.find(
                (item) => item.id === collectionId
              )

              if (next !== undefined)
                onChange({ ...panel, query: defaultQuery(next) })
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Visualization</span>
          <Choice
            label="Visualization"
            value={vizKey(panel.viz)}
            options={vizChoices}
            onChange={(key) => {
              const next = vizChoices.find((choice) => choice.value === key)

              if (next !== undefined) onChange({ ...panel, viz: next.viz })
            }}
          />
        </div>
      </div>
      {collection.data !== undefined && (
        <QueryForm
          query={panel.query}
          collection={collection.data}
          onChange={(query) => onChange({ ...panel, query })}
        />
      )}
    </>
  )
}

/**
 * Edits one panel against a draft with a live preview. Nothing changes on
 * the dashboard until "Apply".
 */
export function PanelEditor({
  panel,
  timeRange,
  onApply,
  onClose,
}: {
  panel: Panel
  timeRange: TimeRange
  onApply: (panel: Panel) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(panel)
  const collections = useQuery(collectionsQuery)
  const firstCollection = collections.data?.[0]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="wide">
        <DialogHeader>
          <DialogTitle>Edit panel</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex h-80 flex-col border p-3">
            <span className="mb-2 text-sm font-medium">{draft.title}</span>
            <div className="min-h-0 flex-1">
              <PanelBody panel={draft} timeRange={timeRange} />
            </div>
          </div>
          <div className="flex max-h-120 flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Title</span>
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Content</span>
                <Choice
                  label="Content"
                  value={draft._tag}
                  options={[
                    { value: "query", label: "Data" },
                    { value: "text", label: "Text" },
                  ]}
                  onChange={(kind) => {
                    if (kind === "text")
                      setDraft({
                        _tag: "text",
                        id: draft.id,
                        title: draft.title,
                        body: "",
                      })
                    else if (firstCollection !== undefined)
                      setDraft(toQueryPanel(draft, firstCollection))
                  }}
                />
              </div>
            </div>
            {draft._tag === "text" ? (
              <Textarea
                rows={8}
                value={draft.body}
                onChange={(event) =>
                  setDraft({ ...draft, body: event.target.value })
                }
              />
            ) : (
              <QueryPanelFields panel={draft} onChange={setDraft} />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onApply(draft)}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
