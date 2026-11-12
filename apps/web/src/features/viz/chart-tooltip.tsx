import type { ChartTooltipContent } from "@tanstack/charts"
import * as Predicate from "effect/Predicate"

import { ToneDot } from "@/components/tone"

import { formatNumber } from "./frame"
import { toneOfHex } from "./tones"

export interface TooltipRow {
  readonly label: string
  readonly value: string
  /** The series paint, a tone hex from the chart color scale. */
  readonly color: string | undefined
  /** The row under the pointer or keyboard focus. */
  readonly active: boolean
}

/**
 * The card every chart shows on hover: a quiet heading, then one row per
 * series with its tone dot and a right-aligned value. With a custom body
 * the chart draws no surface of its own, so the card paints it. The hovered series
 * is highlighted; a total closes the list when there are several series.
 */
function TooltipCard({
  title,
  rows,
  total,
}: {
  title: string | undefined
  rows: ReadonlyArray<TooltipRow>
  total: string | null
}) {
  return (
    <div className="min-w-36 rounded-md border bg-popover px-2 py-1.5 text-xs text-popover-foreground">
      {title !== undefined && title !== "" && (
        <div className="pb-1 text-muted-foreground">{title}</div>
      )}
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <li
            key={row.label}
            data-active={row.active}
            className="flex items-center gap-1.5 data-[active=true]:font-medium"
          >
            <ToneDot tone={toneOfHex(row.color)} />
            <span className="min-w-0 flex-1 truncate">{row.label}</span>
            <span className="pl-3 tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
      {total !== null && (
        <div className="mt-1 flex justify-between border-t pt-1 text-muted-foreground">
          <span>Total</span>
          <span className="tabular-nums">{total}</span>
        </div>
      )}
    </div>
  )
}

export interface SeriesPoint {
  readonly groupLabel: string
  readonly yValue: number
  readonly color: string
}

/**
 * Tooltip for line, area and bar charts. Rows are sorted by value; an area
 * chart draws a line too, so each series is kept once.
 */
export function SeriesTooltip({
  title,
  points,
  primary,
}: {
  title: string
  points: ReadonlyArray<SeriesPoint>
  primary: SeriesPoint | undefined
}) {
  const seen = new Set<string>()

  const unique = points.filter((point) => {
    if (seen.has(point.groupLabel)) return false

    seen.add(point.groupLabel)

    return true
  })

  const rows = [...unique]
    .sort((a, b) => b.yValue - a.yValue)
    .map((point) => ({
      label: point.groupLabel,
      value: formatNumber(point.yValue),
      color: point.color,
      active: point.groupLabel === primary?.groupLabel && unique.length > 1,
    }))

  const total =
    unique.length > 1
      ? formatNumber(unique.reduce((sum, point) => sum + point.yValue, 0))
      : null

  return <TooltipCard title={title} rows={rows} total={total} />
}

/** Tooltip from the chart's own content model, for charts like pie. */
export function ContentTooltip({
  content,
}: {
  content: ChartTooltipContent | string
}) {
  if (Predicate.isString(content))
    return <TooltipCard title={content} rows={[]} total={null} />

  return (
    <TooltipCard
      title={content.title}
      rows={content.rows.map((row) => ({
        label: row.label,
        value: row.value,
        color: row.color ?? content.color,
        active: false,
      }))}
      total={null}
    />
  )
}
