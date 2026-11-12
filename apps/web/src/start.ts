import { createCsrfMiddleware, createStart } from "@tanstack/react-start"
import { authkitMiddleware } from "@workos/authkit-tanstack-react-start"

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
})

/** AuthKit reads the session cookie of each request; see src/api/owner.ts. */
export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, authkitMiddleware()],
  }
})
