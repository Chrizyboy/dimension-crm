import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Grundbausteine für Tabellen. Die Datentabelle mit Sortieren, Filtern und Spaltenauswahl
 * (TanStack Table) baut darauf auf und kommt mit dem ersten Fachmodul in Phase 5.
 */
export function Tabelle({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
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
        'text-muted-foreground h-9 border-b px-3 text-left text-xs font-medium tracking-wide whitespace-nowrap uppercase',
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
      className={cn('h-10 px-3 align-middle', zahl && 'zahlen text-right font-mono text-[13px]', className)}
      {...props}
    />
  )
}
