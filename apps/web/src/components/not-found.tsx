import { Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"

import { Mascot } from "./mascot"

/** The page for an unknown address, with one way back home. */
export function NotFound() {
  return (
    <main className="flex min-h-[60svh] flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Mascot pose="thinking" size={160} />
        <h1 className="text-2xl font-semibold tracking-tight">
          This page does not exist
        </h1>
        <p className="text-sm text-muted-foreground">
          The link can be old, or the page was deleted. Check the address, or
          go back to the home page.
        </p>
        <Button nativeButton={false} render={<Link to="/" />}>
          <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
          Back to home
        </Button>
      </div>
    </main>
  )
}
