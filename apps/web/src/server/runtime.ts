import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"

import { CollectionStore, CollectionStoreLive } from "./collection-store"
import { DashboardStore, DashboardStoreLive } from "./dashboard-store"
import { DatabaseLive } from "./database"
import { QueryEngine, QueryEngineLive } from "./query-engine"
import { RowStore, RowStoreLive } from "./row-store"

const AppLive = Layer.mergeAll(
  RowStoreLive,
  QueryEngineLive,
  DashboardStoreLive
).pipe(Layer.provideMerge(CollectionStoreLive), Layer.provide(DatabaseLive))

type AppServices = CollectionStore | RowStore | DashboardStore | QueryEngine

/** One runtime per isolate. Layers build on the first request. */
const runtime = ManagedRuntime.make(AppLive)

/**
 * Runs a program at the server function boundary. A domain error rejects
 * the promise, and TanStack Start sends its message to the client.
 */
export const runServer = <A, E>(
  program: Effect.Effect<A, E, AppServices>
): Promise<A> => runtime.runPromise(program)

export { CollectionStore, DashboardStore, QueryEngine, RowStore }
