import { Popover as PopoverPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Aufklapper = PopoverPrimitive.Root
export const AufklapperAusloeser = PopoverPrimitive.Trigger

/** Schwebendes Feld unter einem Knopf, z. B. die Auswahl eines Mehrfach-Filters. Bleibt offen, bis man daneben klickt. */
export function AufklapperInhalt({
  className,
  sideOffset = 4,
  align = 'start',
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn('animate-hochgleiten bg-surface shadow-pop z-50 rounded-lg border p-1 outline-none', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
