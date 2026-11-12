import { Logout01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { User } from "@workos/authkit-tanstack-react-start"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"

/** The signed-in user at the foot of the sidebar, with sign out. */
export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar()

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <UserIdentity user={user} name={name} />
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="ml-auto size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end">
            <DropdownMenuLabel>
              <UserIdentity user={user} name={name} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* A document load, so the sign-out loader runs on the server. */}
            <DropdownMenuItem render={<a href="/sign-out" />}>
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function UserIdentity({ user, name }: { user: User; name: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
      {user.profilePictureUrl === null ? (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground"
        >
          {initials(name)}
        </span>
      ) : (
        <img
          src={user.profilePictureUrl}
          alt=""
          className="size-8 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="grid min-w-0 flex-1 text-sm leading-tight">
        <span className="truncate font-medium text-foreground" title={name}>
          {name}
        </span>
        <span
          className="truncate text-xs text-sidebar-muted"
          title={user.email}
        >
          {user.email}
        </span>
      </div>
    </div>
  )
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("")

  return letters || "?"
}
