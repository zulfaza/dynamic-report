import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { SelectColor } from "@/domain/collection"

import { ToneLabel } from "./tone"

export interface ChoiceOption<T extends string> {
  readonly value: T
  readonly label: string
  /** A select option color. The option then shows its tone dot. */
  readonly tone?: SelectColor
}

function OptionLabel<T extends string>({
  option,
}: {
  option: ChoiceOption<T>
}) {
  return option.tone === undefined ? (
    option.label
  ) : (
    <ToneLabel tone={option.tone}>{option.label}</ToneLabel>
  )
}

/**
 * A select whose value type is the option value type, so callers get a
 * domain value back and never parse a string.
 */
export function Choice<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  label,
}: {
  value: T | null
  options: ReadonlyArray<ChoiceOption<T>>
  onChange: (value: T) => void
  placeholder?: string
  label: string
}) {
  return (
    <Select
      value={value}
      items={options}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <SelectTrigger size="sm" aria-label={label}>
        <SelectValue placeholder={placeholder}>
          {(selected: T | null) => {
            const option = options.find((item) => item.value === selected)

            return option === undefined ? (
              placeholder
            ) : (
              <OptionLabel option={option} />
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <OptionLabel option={option} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
