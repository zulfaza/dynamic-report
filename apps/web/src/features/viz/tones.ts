import type { SelectColor } from "@/domain/collection"

/**
 * Hex values of the data tones. Charts need literal colors for SVG paint.
 * Keep in sync with the `--tone-*` tokens in packages/ui globals.css,
 * which chips and dots use.
 */
export const toneHex: Record<SelectColor, string> = {
  gray: "#8a949c",
  red: "#d64545",
  orange: "#e07b24",
  yellow: "#c9a227",
  green: "#2e9e6a",
  blue: "#2f6fdb",
  purple: "#7a5ad8",
  pink: "#d3559a",
}

/** Order for series that have no option color, such as a plain number series. */
const fallbackOrder: ReadonlyArray<SelectColor> = [
  "blue",
  "green",
  "orange",
  "purple",
  "pink",
  "yellow",
  "red",
  "gray",
]

export interface SeriesColors {
  readonly domain: ReadonlyArray<string>
  readonly range: ReadonlyArray<string>
}

/**
 * Colors for a set of series labels. A select option gets its own tone;
 * other labels get a fixed order. The domain is sorted, so the same label
 * gets the same color in every chart.
 */
/** Option tones keyed by value. A value without an option has no entry. */
export type ToneMap = Readonly<Partial<Record<string, SelectColor>>>

/** The tone a chart painted with a hex color; gray when it is not a tone. */
export const toneOfHex = (hex: string | undefined): SelectColor =>
  fallbackOrder.find((tone) => toneHex[tone] === hex) ?? "gray"

/** The option tone of a value, if the value is a select option. */
export const toneOf = (tones: ToneMap, value: string) => tones[value]

export const seriesColors = (
  labels: Iterable<string>,
  tones: ToneMap
): SeriesColors => {
  const domain = [...new Set(labels)].sort()

  const range = domain.map(
    (label, index) =>
      toneHex[
        tones[label] ?? fallbackOrder.at(index % fallbackOrder.length) ?? "gray"
      ]
  )

  return { domain, range }
}
