import { createMiddleware } from "@tanstack/react-start"
import { getAuthKitContext } from "@workos/authkit-tanstack-react-start"
import * as Schema from "effect/Schema"

import { OwnerId } from "@/domain/ids"

const decodeOwnerId = Schema.decodeUnknownSync(OwnerId)

/**
 * Server function middleware. It rejects a call without a signed-in user,
 * and gives the handler the user id as `context.owner`. Every server
 * function must use it, so each store call is scoped to one owner.
 */
export const requireOwner = createMiddleware({ type: "function" }).server(
  ({ next }) => {
    const auth = getAuthKitContext().auth()

    if (auth.user === null) throw new Error("Sign in to continue.")

    return next({ context: { owner: decodeOwnerId(auth.user.id) } })
  }
)
