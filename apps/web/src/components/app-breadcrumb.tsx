import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

import { collectionsQuery } from "@/api/collections"
import { dashboardsQuery } from "@/api/dashboards"

/** Where the person is: Home, or Home › Dashboards › Finance. */
export function AppBreadcrumb() {
  const params = useParams({ strict: false })
  const dashboards = useQuery(dashboardsQuery)
  const collections = useQuery(collectionsQuery)

  const current =
    params.dashboardId !== undefined
      ? {
          section: "Dashboards",
          name: dashboards.data?.find((item) => item.id === params.dashboardId)
            ?.name,
        }
      : params.collectionId !== undefined
        ? {
            section: "Collections",
            name: collections.data?.find(
              (item) => item.id === params.collectionId
            )?.name,
          }
        : null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {current === null ? (
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/" />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>{current.section}</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current.name ?? "…"}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
