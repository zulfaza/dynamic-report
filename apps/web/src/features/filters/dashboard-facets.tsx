import { createContext, useContext } from "react"

import type { Facet } from "@/domain/facets"

/**
 * The dashboard filters every panel applies. A context, because panels sit
 * several layout levels below the dashboard that owns the filters.
 */
const DashboardFacets = createContext<ReadonlyArray<Facet>>([])

export const DashboardFacetsProvider = DashboardFacets.Provider

export const useDashboardFacets = () => useContext(DashboardFacets)
