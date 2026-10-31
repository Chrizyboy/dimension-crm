import { Search } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/diverses'
import { cn } from '@/lib/utils'

/**
 * Suchfeld über jeder Liste: immer mit Lupe, immer gleich breit (PC 18 rem, Handy volle Breite).
 * `kuerzel` zeigt «/», wenn die Ansicht das Tastenkürzel zum Suchfeld kennt.
 */
export function Suchfeld({
  beschriftung,
  kuerzel,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { beschriftung: string; kuerzel?: string }) {
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={beschriftung}
        placeholder={props.placeholder ?? beschriftung}
        className={cn('pl-8', kuerzel && 'pr-8')}
        {...props}
      />
      {kuerzel && <Kbd className="absolute top-1/2 right-1.5 -translate-y-1/2">{kuerzel}</Kbd>}
    </div>
  )
}

/**
 * Leiste über jeder Liste, überall gleich aufgebaut: oben links die Suche, oben rechts Zahl oder Zusatzknöpfe
 * (Export, Nachbestellen), darunter die Filter. Am Handy die Filter in einer Zeile zum Wischen.
 */
export function Werkzeugleiste({
  suche,
  rechts,
  children,
  className,
}: {
  /** Meist ein `Suchfeld`. */
  suche?: ReactNode
  /** Rechts aussen: Anzahl («732 Kunden»), Export oder ein Zusatzknopf. */
  rechts?: ReactNode
  /** Filter (Filterchips, Auswahllisten). */
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(suche || rechts) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {suche}
          {rechts && (
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm sm:ml-auto sm:flex-nowrap sm:whitespace-nowrap">
              {rechts}
            </div>
          )}
        </div>
      )}
      {children && <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
