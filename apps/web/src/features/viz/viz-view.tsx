import { ToneLabel } from "@/components/tone"
import type { Viz } from "@/domain/dashboard"
import type { Frame, FrameField, FrameValue } from "@/domain/query"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { BarChart, PieChart, TimeSeriesChart } from "./charts"
import type { CategoryPoint, Slice, TimePoint } from "./charts"
import {
  formatNumber,
  formatValue,
  frameRoles,
  timeLabeler,
  toDate,
  toLabel,
  toNumber,
} from "./frame"
import { seriesColors, toneOf } from "./tones"

/** Shown in place of a chart when the frame does not fit the visualization. */
export function VizMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-full items-center p-1 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

const noTones = {}

const tonesAt = (frame: Frame, index: number | undefined) =>
  index === undefined ? noTones : (frame.fields[index]?.tones ?? noTones)

/** One figure, set large, with what it measures below. */
function StatView({ frame }: { frame: Frame }) {
  const { measures } = frameRoles(frame)
  const measure = measures.at(0)

  if (measure === undefined)
    return <VizMessage>Add a metric to show a number.</VizMessage>

  const value = toNumber(frame.rows.at(-1)?.[measure])

  return (
    <div className="@container flex size-full flex-col justify-end gap-1 overflow-hidden">
      <span className="font-display text-3xl @3xs:text-4xl @xs:text-5xl leading-none font-semibold tracking-tight tabular-nums">
        {value === null ? "–" : formatNumber(value)}
      </span>
      <span className="text-xs text-muted-foreground">
        {frame.fields[measure]?.label}
      </span>
    </div>
  )
}

function TimeSeriesView({
  frame,
  variant,
  label,
}: {
  frame: Frame
  variant: "line" | "area"
  label: string
}) {
  const { dimensions, measures } = frameRoles(frame)
  const time = dimensions.find((index) => frame.fields[index]?.kind === "time")
  const series = dimensions.find((index) => index !== time)
  const measure = measures.at(0)

  if (time === undefined)
    return <VizMessage>Group by a date to draw a time series.</VizMessage>

  if (measure === undefined)
    return <VizMessage>Add a metric to draw a time series.</VizMessage>

  const points = frame.rows.flatMap((row): Array<TimePoint> => {
    const date = toDate(row[time])
    const value = toNumber(row[measure])

    if (date === null || value === null) return []

    return [
      {
        date,
        value,
        series: series === undefined ? "Value" : toLabel(row[series]),
      },
    ]
  })

  if (points.length === 0)
    return <VizMessage>No data in this time range.</VizMessage>

  const colors = seriesColors(
    points.map((point) => point.series),
    tonesAt(frame, series)
  )

  return (
    <TimeSeriesChart
      points={points}
      variant={variant}
      colors={colors}
      label={label}
    />
  )
}

function BarView({ frame, label }: { frame: Frame; label: string }) {
  const { dimensions, measures } = frameRoles(frame)
  const category = dimensions.at(0)
  const series = dimensions.at(1)
  const measure = measures.at(0)

  if (category === undefined)
    return <VizMessage>Group by a property to draw bars.</VizMessage>

  if (measure === undefined)
    return <VizMessage>Add a metric to draw bars.</VizMessage>

  const categoryLabel =
    frame.fields[category]?.kind === "time"
      ? timeLabeler(frame.rows.map((row) => row[category]))
      : toLabel

  const points = frame.rows.flatMap((row): Array<CategoryPoint> => {
    const value = toNumber(row[measure])

    if (value === null) return []

    return [
      {
        category: categoryLabel(row[category]),
        value,
        series:
          series === undefined
            ? categoryLabel(row[category])
            : toLabel(row[series]),
      },
    ]
  })

  if (points.length === 0)
    return <VizMessage>No data in this time range.</VizMessage>

  // Without a series, bars by a text or select property take each category's
  // tone; bars by time or number share one tone.
  const oneTone =
    series === undefined && frame.fields[category]?.kind !== "string"

  const painted = oneTone
    ? points.map((point) => ({ ...point, series: "Value" }))
    : points

  const colors = seriesColors(
    painted.map((point) => point.series),
    tonesAt(frame, series ?? category)
  )

  return <BarChart points={painted} colors={colors} label={label} />
}

function PieView({ frame, label }: { frame: Frame; label: string }) {
  const { dimensions, measures } = frameRoles(frame)
  const category = dimensions.at(0)
  const measure = measures.at(0)

  if (category === undefined)
    return <VizMessage>Group by a property to draw slices.</VizMessage>

  if (measure === undefined)
    return <VizMessage>Add a metric to draw slices.</VizMessage>

  const slices = frame.rows.flatMap((row): Array<Slice> => {
    const value = toNumber(row[measure])

    return value === null || value <= 0
      ? []
      : [{ label: toLabel(row[category]), value }]
  })

  if (slices.length === 0)
    return <VizMessage>No data in this time range.</VizMessage>

  const colors = seriesColors(
    slices.map((slice) => slice.label),
    tonesAt(frame, category)
  )

  return <PieChart slices={slices} colors={colors} label={label} />
}

function TableCell({ field, value }: { field: FrameField; value: FrameValue }) {
  const text = formatValue(value, field.kind)
  const tone = toneOf(field.tones, text)

  return tone === undefined ? text : <ToneLabel tone={tone}>{text}</ToneLabel>
}

function TableView({ frame }: { frame: Frame }) {
  if (frame.rows.length === 0) return <VizMessage>No rows match.</VizMessage>

  return (
    <ScrollArea>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr>
            {frame.fields.map((field, index) => (
              <th
                key={index}
                data-numeric={field.kind === "number"}
                className="border-b px-2 pb-1.5 text-left text-xs font-normal whitespace-nowrap text-muted-foreground first:pl-0 data-[numeric=true]:text-right"
              >
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {frame.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/60">
              {row.map((value, index) => {
                const field = frame.fields.at(index)

                if (field === undefined) return null

                return (
                  <td
                    key={index}
                    data-numeric={field.kind === "number"}
                    className="border-b border-border/60 px-2 py-1.5 whitespace-nowrap tabular-nums first:pl-0 data-[numeric=true]:text-right"
                  >
                    <TableCell field={field} value={value} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  )
}

export function VizView({
  viz,
  frame,
  label,
}: {
  viz: Viz
  frame: Frame
  label: string
}) {
  switch (viz._tag) {
    case "stat":
      return <StatView frame={frame} />
    case "timeseries":
      return <TimeSeriesView frame={frame} variant={viz.style} label={label} />
    case "bar":
      return <BarView frame={frame} label={label} />
    case "pie":
      return <PieView frame={frame} label={label} />
    case "table":
      return <TableView frame={frame} />
  }
}
