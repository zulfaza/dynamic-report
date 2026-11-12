import { useCallback, useSyncExternalStore } from "react"

/**
 * Tracks a CSS media query. The server has no viewport, so it renders the
 * `serverValue` layout and the client corrects it after hydration.
 */
export function useMediaQuery(query: string, serverValue: boolean) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)

      list.addEventListener("change", onChange)

      return () => list.removeEventListener("change", onChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  )
}
