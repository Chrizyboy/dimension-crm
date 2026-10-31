import type { ReactNode } from 'react'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
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

/**
 * Kopf jeder Ansicht: immer gleiche Höhe, Titel links, Aktionen rechts. Am Handy stehen die Aktionen darunter,
 * nur die Hauptaktion offen, der Rest unter «Mehr» (siehe `Knopfleiste`).
 */
export function Seitenkopf({ titel, beschreibung, ueber, aktionen, className }: SeitenkopfProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {ueber && <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{ueber}</p>}
        <h1 className="text-2xl font-semibold">{titel}</h1>
        {beschreibung && <p className="text-muted-foreground max-w-2xl text-sm">{beschreibung}</p>}
      </div>
      {aktionen && <Knopfleiste className="shrink-0 sm:justify-end">{aktionen}</Knopfleiste>}
    </header>
  )
}
