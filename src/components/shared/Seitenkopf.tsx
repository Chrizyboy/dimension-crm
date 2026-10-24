import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SeitenkopfProps {
  titel: string
  beschreibung?: string
  /** Kleine Zeile über dem Titel, z.B. der Bereich «Verkauf». */
  ueber?: string
  /** Knöpfe rechts; die Hauptaktion zuletzt. */
  aktionen?: ReactNode
  className?: string
}

/** Kopf jeder Ansicht: immer gleiche Höhe, Titel links, Aktionen rechts (am Handy darunter). */
export function Seitenkopf({ titel, beschreibung, ueber, aktionen, className }: SeitenkopfProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {ueber && <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{ueber}</p>}
        <h1 className="text-2xl font-semibold">{titel}</h1>
        {beschreibung && <p className="text-muted-foreground max-w-2xl text-sm">{beschreibung}</p>}
      </div>
      {aktionen && <div className="flex shrink-0 flex-wrap gap-2">{aktionen}</div>}
    </header>
  )
}
