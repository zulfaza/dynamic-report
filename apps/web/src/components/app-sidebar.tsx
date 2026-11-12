import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  Database01Icon,
  PackageAddIcon,
} from "@hugeicons/core-free-icons"
import type { User } from "@workos/authkit-tanstack-react-start"
import { useState } from "react"

import {
  collectionKeys,
  collectionsQuery,
  createCollection,
} from "@/api/collections"
import {
  createDashboard,
  dashboardKeys,
  dashboardsQuery,
  loadSampleData,
} from "@/api/dashboards"
import { DeleteDialog } from "@/features/shell/delete-dialog"
import type { DeleteTarget } from "@/features/shell/delete-dialog"

import { NavList } from "./nav-list"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"

/**
 * The app sidebar, after shadcn sidebar-08 ("an inset sidebar with
 * secondary navigation"): brand header, one group per kind of page, and
 * secondary actions at the foot.
 */
export function AppSidebar({ user }: { user: User }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null)
  const collections = useQuery(collectionsQuery)
  const dashboards = useQuery(dashboardsQuery)

  const newCollection = useMutation({
    mutationFn: () => createCollection({ data: { name: "Untitled" } }),
    onSuccess: async (collection) => {
      await queryClient.invalidateQueries({
        queryKey: collectionKeys.all,
        exact: true,
      })
      await navigate({
        to: "/collections/$collectionId",
        params: { collectionId: collection.id },
      })
    },
  })

  const newDashboard = useMutation({
    mutationFn: () => createDashboard({ data: { name: "Untitled dashboard" } }),
    onSuccess: async (dashboard) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await navigate({
        to: "/dashboards/$dashboardId",
        params: { dashboardId: dashboard.id },
      })
    },
  })

  const sample = useMutation({
    mutationFn: () => loadSampleData(),
    onSuccess: async (dashboard) => {
      await queryClient.invalidateQueries()
      await navigate({
        to: "/dashboards/$dashboardId",
        params: { dashboardId: dashboard.id },
      })
    },
  })

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <img
                src="/favicon.svg"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0"
              />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-display text-base font-semibold tracking-tight">
                  Dynamic Report
                </span>
                <span className="truncate text-xs text-sidebar-muted">
                  Personal workspace
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavList
          title="Dashboards"
          icon={DashboardSquare01Icon}
          addLabel="New dashboard"
          onAdd={() => newDashboard.mutate()}
          entries={(dashboards.data ?? []).map((dashboard) => ({
            id: dashboard.id,
            name: dashboard.name,
            active: pathname.includes(dashboard.id),
            link: (
              <Link
                to="/dashboards/$dashboardId"
                params={{ dashboardId: dashboard.id }}
              />
            ),
          }))}
          onDelete={(entry) => {
            const dashboard = dashboards.data?.find(
              (item) => item.id === entry.id
            )

            if (dashboard !== undefined)
              setDeleting({ _tag: "dashboard", ...dashboard })
          }}
        />
        <NavList
          title="Collections"
          icon={Database01Icon}
          addLabel="New collection"
          onAdd={() => newCollection.mutate()}
          entries={(collections.data ?? []).map((collection) => ({
            id: collection.id,
            name: collection.name,
            active: pathname.includes(collection.id),
            link: (
              <Link
                to="/collections/$collectionId"
                params={{ collectionId: collection.id }}
              />
            ),
          }))}
          onDelete={(entry) => {
            const collection = collections.data?.find(
              (item) => item.id === entry.id
            )

            if (collection !== undefined)
              setDeleting({
                _tag: "collection",
                id: collection.id,
                name: collection.name,
              })
          }}
        />
        <div className="mt-auto">
          <NavSecondary
            items={[
              {
                title: sample.isPending ? "Loading…" : "Load sample data",
                icon: <HugeiconsIcon icon={PackageAddIcon} strokeWidth={2} />,
                disabled: sample.isPending,
                onSelect: () => sample.mutate(),
              },
            ]}
          />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      {deleting !== null && (
        <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
      )}
    </Sidebar>
  )
}
