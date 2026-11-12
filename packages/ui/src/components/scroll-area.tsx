import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "cn"

/**
 * Scrolls its content with overlay scrollbars: a thin, rounded thumb that
 * fades in while the pointer is over the area or while it scrolls, grows
 * a little under the pointer, and takes no layout space. Both axes
 * scroll; a bar shows only on overflow. It fills its parent, so the
 * parent sets the size.
 */
function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn(
        "group/scroll-area relative size-full overflow-hidden",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "z-10 flex touch-none p-0.5 opacity-0 transition-opacity duration-200 select-none group-hover/scroll-area:opacity-100 data-scrolling:opacity-100 data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:hover:h-3 data-vertical:w-2.5 data-vertical:hover:w-3",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-foreground/20 transition-colors hover:bg-foreground/40 active:bg-foreground/50"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
