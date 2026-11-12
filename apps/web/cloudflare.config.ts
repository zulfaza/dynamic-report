import { bindings, defineConfig } from "cf/config"

export default defineConfig({
  worker: {
    name: "dynamic-report",
    compatibilityDate: "2026-11-10",
    observability: { enabled: true },
    entrypoint: "@tanstack/react-start/server-entry",
    env: {
      DB: bindings.d1({ name: "dynamic-report" }),
    },
  },
})
