import { cn } from "@workspace/ui/lib/utils"

/** A sloth pose. Each pose is one transparent PNG in public/brand/mascot. */
export type MascotPose = "wave" | "laptop" | "chart" | "celebrate" | "thinking"

/**
 * The Dynamic Report sloth. It is decorative: the text near it must carry
 * the meaning (see DESIGN.md, "Mascot").
 */
export function Mascot({
  pose,
  size = 96,
  className,
}: {
  pose: MascotPose
  /** Width and height in pixels. */
  size?: number
  className?: string
}) {
  return (
    <img
      src={`/brand/mascot/${pose}.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  )
}
