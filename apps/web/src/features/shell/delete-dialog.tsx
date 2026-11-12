import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { collectionKeys, deleteCollection } from "@/api/collections"
import { dashboardKeys, deleteDashboard } from "@/api/dashboards"
import type { CollectionId, DashboardId } from "@/domain/ids"

/** What the person asked to delete. */
export type DeleteTarget =
  | {
      readonly _tag: "dashboard"
      readonly id: DashboardId
      readonly name: string
    }
  | {
      readonly _tag: "collection"
      readonly id: CollectionId
      readonly name: string
    }

const copy = {
  dashboard: {
    title: "Delete dashboard?",
    body: "This removes the dashboard and its panels. The collections and their rows stay.",
    action: "Delete dashboard",
    done: "Dashboard deleted",
  },
  collection: {
    title: "Delete collection?",
    body: "This removes the collection and all its rows. Panels that read it will show an error.",
    action: "Delete collection",
    done: "Collection deleted",
  },
}

/** Confirms a permanent delete. Nothing is removed until the person confirms. */
export function DeleteDialog({
  target,
  onClose,
}: {
  target: DeleteTarget
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const text = copy[target._tag]

  const remove = useMutation({
    mutationFn: () =>
      target._tag === "dashboard"
        ? deleteDashboard({ data: { dashboardId: target.id } })
        : deleteCollection({ data: { collectionId: target.id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          target._tag === "dashboard" ? dashboardKeys.all : collectionKeys.all,
      })
      void queryClient.invalidateQueries({ queryKey: ["frame"] })
      onClose()
      toast.success(text.done, { description: target.name })

      // Leave the page of the thing that no longer exists.
      if (pathname.includes(target.id)) await navigate({ to: "/" })
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">
              {target.name}
            </strong>{" "}
            will be deleted. {text.body} You cannot undo this.
          </DialogDescription>
        </DialogHeader>
        {remove.isError && (
          <p className="text-sm text-destructive">{remove.error.message}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? "Deleting…" : text.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
