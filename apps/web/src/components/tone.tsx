import type { SelectColor } from "@/domain/collection"

/** Full class names, so Tailwind can see every tone class at build time. */
const dotClass: Record<SelectColor, string> = {
  gray: "bg-tone-gray",
  red: "bg-tone-red",
  orange: "bg-tone-orange",
  yellow: "bg-tone-yellow",
  green: "bg-tone-green",
  blue: "bg-tone-blue",
  purple: "bg-tone-purple",
  pink: "bg-tone-pink",
}

/** The tone of a select option, as a small dot. */
export function ToneDot({ tone }: { tone: SelectColor }) {
  return (
    <span
      aria-hidden
      className={`size-2 shrink-0 rounded-full ${dotClass[tone]}`}
    />
  )
}

/** A select value with its option color: the same tone the charts use. */
export function ToneLabel({
  tone,
  children,
}: {
  tone: SelectColor
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ToneDot tone={tone} />
      {children}
    </span>
  )
}
