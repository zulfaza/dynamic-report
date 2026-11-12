import * as React from "react"

const MOBILE_QUERY = "(max-width: 767px)"

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(MOBILE_QUERY)

  list.addEventListener("change", onChange)

  return () => list.removeEventListener("change", onChange)
}

/**
 * True below the md breakpoint. The server renders the desktop layout and
 * the client corrects it after hydration.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )
}
