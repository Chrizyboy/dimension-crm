import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export interface AuswahlOption {
  wert: string
  text: string
}

interface AuswahlProps extends Omit<ComponentProps<typeof SelectPrimitive.Root>, 'children'> {
  id?: string
  optionen: readonly AuswahlOption[]
  platzhalter?: string
  className?: string
  'aria-label'?: string
}

/** Auswahlliste (z.B. Status, Standort Muri/Bulle). Für lange Listen mit Suche kommt später eine Kombobox. */
export function Auswahl({ id, optionen, platzhalter, className, 'aria-label': ariaLabel, ...props }: AuswahlProps) {
  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'border-border bg-surface hover:border-border-strong focus-visible:border-ring focus-visible:ring-ring/30 data-placeholder:text-muted-foreground flex h-8 w-full items-center justify-between gap-2 rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={platzhalter} />
        <SelectPrimitive.Icon>
          <ChevronDown className="text-muted-foreground size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="animate-hochgleiten bg-surface shadow-pop z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border p-1"
        >
          <SelectPrimitive.Viewport>
            {optionen.map((o) => (
              <SelectPrimitive.Item
                key={o.wert}
                value={o.wert}
                className="data-highlighted:bg-muted relative flex h-8 cursor-default items-center rounded-md pr-2 pl-7 text-sm outline-none select-none"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <Check className="text-accent size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.text}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
