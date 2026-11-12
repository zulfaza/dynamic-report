import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar03Icon } from "@hugeicons/core-free-icons"

const labelFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** `YYYY-MM-DD` to a local date, the form the calendar works in. */
const fromIso = (value: string) => {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number)

  return new Date(year, month - 1, day)
}

/** A local calendar date to `YYYY-MM-DD`, the form cells store. */
const toIso = (date: Date) =>
  [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")

/**
 * The shadcn date picker: a button that opens a calendar in a popover.
 * Works in `YYYY-MM-DD` strings, so callers never handle time zones.
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string | null
  onChange: (value: string | null) => void
  placeholder: string
  label: string
}) {
  const selected = value === null ? undefined : fromIso(value)

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" aria-label={label} />}
      >
        <HugeiconsIcon icon={Calendar03Icon} data-icon="inline-start" />
        <span className="truncate">
          {selected === undefined ? placeholder : labelFormat.format(selected)}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => onChange(date === undefined ? null : toIso(date))}
        />
        {value !== null && (
          <div className="border-t p-2">
            <Button variant="ghost" size="xs" onClick={() => onChange(null)}>
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
