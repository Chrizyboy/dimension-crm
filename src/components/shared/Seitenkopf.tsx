import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface SeitenkopfProps {
  titel: string
  /** Was man hier erledigt; steht hinter dem «i». */
  beschreibung?: string
  /** Kurze Zeile, die immer sichtbar unter dem Titel steht (z. B. Datum und was ansteht auf «Mein Tag»). */
  zeile?: string
  /** Kleine Zeile über dem Titel, z.B. der Bereich «Verkauf». */
  ueber?: string
  /** Knöpfe rechts; die Hauptaktion zuletzt. */
  aktionen?: ReactNode
  className?: string
}

/**
 * Kopf jeder Ansicht: immer gleiche Höhe, Titel links, Aktionen rechts. Die Beschreibung steht hinter dem «i» neben
 * dem Titel statt als eigene Zeile (Chris 4.11.2026 «zu unübersichtlich»): wer täglich hier arbeitet, braucht sie nicht. Am Handy stehen die Aktionen darunter,
 * nur die Hauptaktion offen, der Rest unter «Mehr» (siehe `Knopfleiste`).
 */
export function Seitenkopf({ titel, beschreibung, zeile, ueber, aktionen, className }: SeitenkopfProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {ueber && <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{ueber}</p>}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{titel}</h1>
          {beschreibung && (
            <Tooltip text={titel} untertitel={beschreibung} seite="bottom">
              <button
                type="button"
                aria-label={beschreibung}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
              >
                <Info className="size-4" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>
        {zeile && <p className="text-muted-foreground text-sm">{zeile}</p>}
      </div>
      {aktionen && <Knopfleiste className="shrink-0 sm:justify-end">{aktionen}</Knopfleiste>}
    </header>
  )
}
