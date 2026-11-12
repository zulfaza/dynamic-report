import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  MultiplicationSignCircleIcon,
} from "@hugeicons/core-free-icons"

/**
 * shadcn Sonner, with the theme tokens and the panel radius. Up to four
 * toasts show in a stack; hover or Alt+T expands it. Mount it once, at the
 * root. See DESIGN.md, "Toasts".
 */
function Toaster({ style, ...props }: ToasterProps) {
  const toastStyle = {
    "--normal-bg": "var(--popover)",
    "--normal-text": "var(--popover-foreground)",
    "--normal-border": "var(--border)",
    "--border-radius": "var(--dr-radius-panel)",
    ...style,
  } satisfies CSSProperties & Record<`--${string}`, string>

  return (
    <Sonner
      position="bottom-right"
      visibleToasts={4}
      gap={8}
      closeButton
      icons={{
        success: (
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-4"
          />
        ),
        info: (
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            className="size-4"
          />
        ),
        warning: (
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={2}
            className="size-4"
          />
        ),
        error: (
          <HugeiconsIcon
            icon={MultiplicationSignCircleIcon}
            strokeWidth={2}
            className="size-4"
          />
        ),
        loading: (
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className="size-4 animate-spin"
          />
        ),
      }}
      style={toastStyle}
      {...props}
    />
  )
}

export { Toaster }
