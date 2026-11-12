import { createFileRoute } from "@tanstack/react-router"
import { getSignInUrl } from "@workos/authkit-tanstack-react-start"

import { safeReturnPathname } from "@/lib/return-pathname"

/** Starts the AuthKit sign-in. `?returnPathname=` is the page to open after. */
export const Route = createFileRoute("/sign-in")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = await getSignInUrl({
          data: { returnPathname: safeReturnPathname(request) },
        })

        return new Response(null, { status: 307, headers: { Location: url } })
      },
    },
  },
})
