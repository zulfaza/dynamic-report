import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useState } from "react"

import { Choice } from "@/components/choice"
import type {
  PropertyKind,
  PropertyType,
  SelectColor,
} from "@/domain/collection"
import { newId } from "@/domain/ids"

const kinds: ReadonlyArray<{ value: PropertyKind; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Select" },
]

const colors: ReadonlyArray<SelectColor> = [
  "blue",
  "green",
  "orange",
  "purple",
  "red",
  "yellow",
  "pink",
  "gray",
]

const toType = (kind: PropertyKind, optionNames: string): PropertyType => {
  switch (kind) {
    case "text":
    case "date":
    case "checkbox":
      return { _tag: kind }
    case "number":
      return { _tag: "number", format: "plain" }
    case "select":
      return {
        _tag: "select",
        options: optionNames
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name !== "")
          .map((name, index) => ({
            id: newId.selectOption(),
            name,
            color: colors[index % colors.length] ?? "gray",
          })),
      }
  }
}

export function PropertyDialog({
  onSubmit,
  onClose,
  pending,
}: {
  onSubmit: (input: { name: string; type: PropertyType }) => void
  onClose: () => void
  pending: boolean
}) {
  const [name, setName] = useState("")
  const [kind, setKind] = useState<PropertyKind>("text")
  const [optionNames, setOptionNames] = useState("")

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New property</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()

            if (name.trim() !== "")
              onSubmit({ name: name.trim(), type: toType(kind, optionNames) })
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="property-name">Name</Label>
            <Input
              id="property-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Type</Label>
            <Choice
              label="Type"
              value={kind}
              options={kinds}
              onChange={setKind}
            />
          </div>
          {kind === "select" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="property-options">
                Options, separated by commas
              </Label>
              <Input
                id="property-options"
                placeholder="Todo, Doing, Done"
                value={optionNames}
                onChange={(event) => setOptionNames(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || name.trim() === ""}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
