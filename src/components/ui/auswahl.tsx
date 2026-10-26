import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import { useId, type ComponentProps } from 'react'
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
  const kennung = useId()
  return (
    <SelectPrimitive.Root {...props}>
      {/* Name = Beschriftung + sichtbarer Wert («Person Alle Personen»): wer per Sprache steuert, sagt, was er sieht (WCAG 2.5.3). */}
      {ariaLabel && (
        <span id={`${kennung}-name`} hidden>
          {ariaLabel}
        </span>
      )}
      <SelectPrimitive.Trigger
        id={id}
        {...(ariaLabel ? { 'aria-labelledby': `${kennung}-name ${kennung}-wert` } : {})}
        className={cn(
          'border-border bg-surface hover:border-border-strong focus-visible:border-ring focus-visible:ring-ring/30 data-placeholder:text-muted-foreground flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 text-left text-sm whitespace-nowrap shadow-xs outline-none focus-visible:ring-2',
          className,
        )}
      >
        {/* Lange Werte (Regionen) kürzen statt umbrechen, sonst springt die Höhe am Handy. */}
        <span id={`${kennung}-wert`} className="min-w-0 truncate">
          <SelectPrimitive.Value placeholder={platzhalter} />
        </span>
        <SelectPrimitive.Icon className="shrink-0">
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
