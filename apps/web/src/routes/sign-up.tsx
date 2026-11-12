import { createFileRoute } from "@tanstack/react-router"
import { getSignUpUrl } from "@workos/authkit-tanstack-react-start"

import { safeReturnPathname } from "@/lib/return-pathname"

/** Starts the AuthKit sign-up. `?returnPathname=` is the page to open after. */
export const Route = createFileRoute("/sign-up")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = await getSignUpUrl({
          data: { returnPathname: safeReturnPathname(request) },
        })

        return new Response(null, { status: 307, headers: { Location: url } })
      },
    },
  },
})
