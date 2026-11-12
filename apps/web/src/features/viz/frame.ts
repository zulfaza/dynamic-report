import type { FieldKind, Frame, FrameValue } from "@/domain/query"

/** Positions of the frame fields by role. Visualizations read fields only through this. */
export interface FrameRoles {
  readonly dimensions: ReadonlyArray<number>
  readonly measures: ReadonlyArray<number>
}

export const frameRoles = (frame: Frame): FrameRoles => {
  const dimensions: Array<number> = []
  const measures: Array<number> = []

  frame.fields.forEach((field, index) => {
    if (field.role === "dimension") dimensions.push(index)
    else measures.push(index)
  })

  return { dimensions, measures }
}

const numberFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
})

const compactFormat = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
})

const dayFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const monthFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const shortDayFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

/** A tooltip heading for a time value, for example "Oct 26, 2026". */
export const formatDay = (value: Date | undefined) =>
  value === undefined ? "" : dayFormat.format(value)

export const formatNumber = (value: number) => numberFormat.format(value)

export const formatCompact = (value: number) => compactFormat.format(value)

/** Time frame values are `YYYY-MM-DD`; read them as UTC midnight. */
export const toDate = (value: FrameValue | undefined) => {
  if (value === null || value === undefined) return null

  const date = new Date(`${String(value)}T00:00:00Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

export const formatValue = (value: FrameValue, kind: FieldKind) => {
  if (value === null) return ""

  if (value === true) return "Yes"

  if (value === false) return "No"

  if (kind === "number" && Number.isFinite(Number(value)))
    return formatNumber(Number(value))

  if (kind === "time") {
    const date = toDate(value)

    return date === null ? String(value) : dayFormat.format(date)
  }

  return String(value)
}

/**
 * Labels for time buckets on a category axis. Month buckets all start on
 * day 1, so they read as months; other buckets read as days.
 */
export const timeLabeler = (values: ReadonlyArray<FrameValue | undefined>) => {
  const dates = values.map(toDate)

  const monthly = dates.every(
    (date) => date === null || date.getUTCDate() === 1
  )

  const format = monthly ? monthFormat : shortDayFormat

  return (value: FrameValue | undefined) => {
    const date = toDate(value)

    return date === null ? "(empty)" : format.format(date)
  }
}

/** Measure cells are SQL numbers or null; anything else counts as empty. */
export const toNumber = (value: FrameValue | undefined) => {
  const parsed = Number(value ?? Number.NaN)

  return Number.isFinite(parsed) ? parsed : null
}

export const toLabel = (value: FrameValue | undefined) =>
  value === null || value === undefined ? "(empty)" : String(value)
