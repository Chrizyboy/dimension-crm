import { useEffect, useRef, useState, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Grundbausteine für Tabellen. Die Datentabelle mit Sortieren, Filtern und Spaltenauswahl
 * (TanStack Table) baut darauf auf und kommt mit dem ersten Fachmodul in Phase 5.
 */
export function Tabelle({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  const rahmen = useRef<HTMLDivElement>(null)
  const [breit, setBreit] = useState(false)
  // Ist die Tabelle breiter als der Platz (Handy), muss man sie auch mit der Tastatur seitwärts schieben können.
  useEffect(() => {
    const el = rahmen.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const pruefe = () => {
      setBreit(el.scrollWidth > el.clientWidth + 1)
    }
    pruefe()
    const beobachter = new ResizeObserver(pruefe)
    beobachter.observe(el)
    if (el.firstElementChild) beobachter.observe(el.firstElementChild)
    return () => {
      beobachter.disconnect()
    }
  }, [])
  return (
    <div
      ref={rahmen}
      className="focus-visible:ring-ring w-full overflow-x-auto rounded-sm outline-none focus-visible:ring-2"
      {...(breit ? { tabIndex: 0 } : {})}
      {...(breit && props['aria-label'] ? { role: 'region', 'aria-label': props['aria-label'] } : {})}
    >
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

/** Kopfzeile. */
export function TabelleKopf({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-surface-2', className)} {...props} />
}

/** Kopfzelle. `zahl` richtet rechts aus (Beträge). */
export function Kopfzelle({
  className,
  zahl = false,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { zahl?: boolean }) {
  return (
    <th
      className={cn(
        'text-muted-foreground h-9 border-b px-2 text-left text-xs font-medium tracking-wide whitespace-nowrap uppercase sm:px-3',
        zahl && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

/** Tabellenkörper. */
export function TabelleKoerper({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr]:border-b [&_tr:last-child]:border-0', className)} {...props} />
}

/** Zeile. Klickbare Zeilen bekommen einen Hover-Zustand. */
export function Zeile({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('hover:bg-surface-2 data-[aktiv=true]:bg-accent-soft/50 transition-colors', className)}
      {...props}
    />
  )
}

/** Zelle. `zahl` richtet rechts aus und nutzt gleich breite Ziffern. */
export function Zelle({
  className,
  zahl = false,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { zahl?: boolean }) {
  return (
    <td
      className={cn(
        'h-10 px-2 align-middle sm:px-3',
        zahl && 'zahlen text-right font-mono text-[13px] whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}
