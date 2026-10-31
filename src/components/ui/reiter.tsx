import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Reiter = TabsPrimitive.Root

/**
 * Aussehen der Reiterleiste, auch für Ansichten, die als Adresse statt als Reiter umschalten (Offerten, Verkauf).
 * Immer eine Zeile: Was nicht Platz hat, schiebt man seitlich (Handy, schmales Seitenpanel). Die Linie unten
 * ist ein Schatten statt Rahmen, damit die orange Linie des aktiven Reiters beim Wischen nicht abgeschnitten wird.
 */
export const reiterListeKlasse =
  'wischzeile flex flex-nowrap gap-x-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)]'

/** Aussehen eines Reiters; aktiv über `data-state="active"` (Radix) oder `aria-current` (Ansichten). */
export const reiterKnopfKlasse =
  'text-muted-foreground hover:text-foreground focus-visible:ring-ring data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=active]:font-medium aria-[current=page]:border-accent aria-[current=page]:text-foreground aria-[current=page]:font-medium inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset'

/** Leiste der Reiter (z.B. Kundenblatt: Übersicht · Objekte · Offerten · Projekte). */
export function ReiterListe({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn(reiterListeKlasse, className)} {...props} />
}

/** Ein Reiter. */
export function ReiterKnopf({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn(reiterKnopfKlasse, className)} {...props} />
}

/** Inhalt eines Reiters. */
export function ReiterInhalt({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-4 outline-none', className)} {...props} />
}
