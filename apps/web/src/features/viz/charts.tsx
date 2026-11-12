import { areaY, barY, colorLegend, defineChart, lineY } from "@tanstack/charts"
import type { ChartMotionTransition } from "@tanstack/charts"
import { pie, polar, radialArc } from "@tanstack/charts/polar"
import { motion } from "@tanstack/charts/motion"
import { RendererChart } from "@tanstack/charts/react/tooltip"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { scaleUtc } from "@tanstack/charts/scales/time"
import { tooltip } from "@tanstack/charts/tooltip"
import { useLayoutEffect, useMemo, useRef, useState } from "react"

import { ContentTooltip, SeriesTooltip } from "./chart-tooltip"
import { formatCompact, formatDay } from "./frame"
import type { SeriesColors } from "./tones"

export interface TimePoint {
  readonly date: Date
  readonly value: number
  readonly series: string
}

export interface CategoryPoint {
  readonly category: string
  readonly value: number
  readonly series: string
}

export interface Slice {
  readonly label: string
  readonly value: number
}

const valueAxis = {
  scale: scaleLinear,
  nice: true,
  grid: true,
  axis: { line: false, ticks: { count: 4, size: 0, format: formatCompact } },
}

/**
 * Only the tooltip moves. The chart geometry paints at once, so data the
 * user reads does not move for style.
 */
const renderer = motion({ initial: false })

/**
 * The tooltip glides between points and fades in from its anchor. A
 * critically damped spring keeps the velocity when the pointer changes
 * direction, with no overshoot. Reduced motion snaps it, which the
 * renderer does by default.
 */
const tooltipSpring: ChartMotionTransition = {
  type: "spring",
  stiffness: 500,
  damping: 45,
  mass: 1,
}

const chartTooltip = {
  use: tooltip,
  motion: tooltipSpring,
  className: [
    "data-[placement=top]:origin-bottom",
    "data-[placement=bottom]:origin-top",
    "data-[placement=left]:origin-right",
    "data-[placement=right]:origin-left",
    "data-[placement=top-right]:origin-bottom-left",
    "data-[placement=top-left]:origin-bottom-right",
    "data-[placement=bottom-right]:origin-top-left",
    "data-[placement=bottom-left]:origin-top-right",
  ].join(" "),
}

/** A legend only helps when there is more than one series. */
const colorScale = (colors: SeriesColors) => {
  const scale = { domain: colors.domain, range: colors.range }

  return colors.domain.length > 1 ? { ...scale, legend: colorLegend() } : scale
}

/**
 * Measures the panel body. The chart adapter draws 320px high unless it
 * gets a height, so the frame passes the measured height down.
 */
function ChartFrame({
  children,
}: {
  children: (height: number) => React.ReactNode
}) {
  const [height, setHeight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = ref.current

    if (element === null) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0)

      if (entry !== undefined) setHeight(Math.floor(entry.contentRect.height))
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="size-full text-muted-foreground">
      {height > 0 && children(height)}
    </div>
  )
}

export function TimeSeriesChart({
  points,
  variant,
  colors,
  label,
}: {
  points: ReadonlyArray<TimePoint>
  variant: "line" | "area"
  colors: SeriesColors
  label: string
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks:
          variant === "area"
            ? [
                areaY(points, {
                  x: "date",
                  y: "value",
                  z: "series",
                  fillOpacity: 0.16,
                }),
                lineY(points, {
                  x: "date",
                  y: "value",
                  z: "series",
                  strokeWidth: 1.75,
                }),
              ]
            : [
                lineY(points, {
                  x: "date",
                  y: "value",
                  z: "series",
                  strokeWidth: 1.75,
                }),
              ],
        scales: {
          x: { scale: scaleUtc, axis: { ticks: { size: 0 } } },
          y: valueAxis,
        },
        color: colorScale(colors),
        focus: "group-x",
        motion: false,
        tooltip: chartTooltip,
      }),
    [points, variant, colors]
  )

  return (
    <ChartFrame>
      {(height) => (
        <RendererChart
          renderer={renderer}
          definition={definition}
          height={height}
          ariaLabel={label}
          renderTooltipBody={({ points: focused, primaryPoint }) => (
            <SeriesTooltip
              title={formatDay(focused.at(0)?.xValue)}
              points={focused}
              primary={primaryPoint}
            />
          )}
        />
      )}
    </ChartFrame>
  )
}

export function BarChart({
  points,
  colors,
  label,
}: {
  points: ReadonlyArray<CategoryPoint>
  colors: SeriesColors
  label: string
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barY(points, {
            x: "category",
            y: "value",
            z: "series",
            maxThickness: 48,
          }),
        ],
        scales: {
          x: {
            scale: () => scaleBand().padding(0.28),
            axis: { line: false, ticks: { size: 0 } },
          },
          y: valueAxis,
        },
        color: colorScale(colors),
        motion: false,
        tooltip: chartTooltip,
      }),
    [points, colors]
  )

  return (
    <ChartFrame>
      {(height) => (
        <RendererChart
          renderer={renderer}
          definition={definition}
          height={height}
          ariaLabel={label}
          renderTooltipBody={({ points: focused, primaryPoint }) => (
            <SeriesTooltip
              title={String(focused.at(0)?.xValue ?? "")}
              points={focused}
              primary={primaryPoint}
            />
          )}
        />
      )}
    </ChartFrame>
  )
}

export function PieChart({
  slices,
  colors,
  label,
}: {
  slices: ReadonlyArray<Slice>
  colors: SeriesColors
  label: string
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          polar({
            inset: 8,
            radiusRatio: 0.9,
            marks: [
              radialArc(pie(slices, { value: "value" }), {
                innerRadius: ({ radius }) => radius * 0.62,
                color: "label",
                key: "label",
              }),
            ],
            scales: { angle: null, radius: null },
          }),
        ],
        scales: { x: null, y: null },
        color: { ...colorScale(colors), legend: colorLegend() },
        motion: false,
        tooltip: chartTooltip,
      }),
    [slices, colors]
  )

  return (
    <ChartFrame>
      {(height) => (
        <RendererChart
          renderer={renderer}
          definition={definition}
          height={height}
          ariaLabel={label}
          renderTooltipBody={({ content }) => (
            <ContentTooltip content={content} />
          )}
        />
      )}
    </ChartFrame>
  )
}
