import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowUpRight01Icon,
  Delete02Icon,
  MoreHorizontalCircle01Icon,
} from "@hugeicons/core-free-icons"

export interface NavEntry {
  readonly id: string
  readonly name: string
  readonly active: boolean
  /** The link element the menu button renders as. */
  readonly link: React.ReactElement
}

/**
 * One group of the sidebar, after the "Projects" group of shadcn
 * sidebar-08: a labelled list where each entry has a "More" menu, and the
 * group label has an add action.
 */
export function NavList({
  title,
  icon,
  addLabel,
  onAdd,
  entries,
  onDelete,
}: {
  title: string
  icon: typeof Add01Icon
  addLabel: string
  onAdd: () => void
  entries: ReadonlyArray<NavEntry>
  onDelete: (entry: NavEntry) => void
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarGroupAction title={addLabel} onClick={onAdd}>
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
        <span className="sr-only">{addLabel}</span>
      </SidebarGroupAction>
      <SidebarMenu>
        {entries.map((entry) => (
          <SidebarMenuItem key={entry.id}>
            <SidebarMenuButton isActive={entry.active} render={entry.link}>
              <HugeiconsIcon icon={icon} strokeWidth={2} />
              <span>{entry.name}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
                <HugeiconsIcon
                  icon={MoreHorizontalCircle01Icon}
                  strokeWidth={2}
                />
                <span className="sr-only">More for {entry.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem render={entry.link}>
                    <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
                    <span>Open</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(entry)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
