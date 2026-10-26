import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Reiter = TabsPrimitive.Root

/** Leiste der Reiter (z.B. Kundenblatt: Übersicht · Objekte · Offerten · Projekte). */
export function ReiterListe({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex flex-wrap gap-x-1 border-b', className)} {...props} />
}

/** Ein Reiter. */
export function ReiterKnopf({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'text-muted-foreground hover:text-foreground focus-visible:ring-ring data-[state=active]:border-accent data-[state=active]:text-foreground -mb-px h-9 shrink-0 border-b-2 border-transparent px-3 text-sm outline-none focus-visible:ring-2 data-[state=active]:font-medium',
        className,
      )}
      {...props}
    />
  )
}

/** Inhalt eines Reiters. */
export function ReiterInhalt({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-4 outline-none', className)} {...props} />
}
