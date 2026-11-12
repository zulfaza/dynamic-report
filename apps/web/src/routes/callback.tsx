import { createFileRoute } from "@tanstack/react-router"
import { handleCallbackRoute } from "@workos/authkit-tanstack-react-start"

/** WORKOS_REDIRECT_URI points here. */
export const Route = createFileRoute("/callback")({
  server: { handlers: { GET: handleCallbackRoute() } },
})
