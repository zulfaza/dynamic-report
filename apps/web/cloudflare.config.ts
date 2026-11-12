import { bindings, defineConfig } from "cf/config"

export default defineConfig({
  worker: {
    name: "dynamic-report",
    compatibilityDate: "2026-11-10",
    // AuthKit reads its WORKOS_* settings from `process.env`.
    compatibilityFlags: ["nodejs_compat"],
    observability: { enabled: true },
    entrypoint: "@tanstack/react-start/server-entry",
    env: {
      DB: bindings.d1({ name: "dynamic-report" }),
      WORKOS_CLIENT_ID: bindings.secret(),
      WORKOS_API_KEY: bindings.secret(),
      WORKOS_REDIRECT_URI: bindings.secret(),
      WORKOS_COOKIE_PASSWORD: bindings.secret(),
      // The AuthKit domain, for example https://<name>.authkit.app. The
      // MCP server sends it as its authorization server; see src/mcp/discovery.ts.
      WORKOS_AUTHKIT_DOMAIN: bindings.secret(),
    },
  },
})
