import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Eine Angabe mit Beschriftung. Leere Werte zeigen «–», damit man sieht, dass das Feld leer ist. */
export function Angabe({ label, children, breit = false }: { label: string; children: ReactNode; breit?: boolean }) {
  const leer = children === null || children === undefined || children === ''
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', breit && 'sm:col-span-2')}>
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className={cn('text-sm break-words', leer && 'text-muted-foreground')}>{leer ? '–' : children}</dd>
    </div>
  )
}

/** Zweispaltiges Raster für Angaben (am Handy einspaltig). */
export function Angaben({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)}>{children}</dl>
}

/** Längerer Text (Kommentar, Verlauf) in einem ruhigen Kasten. */
export function Notizblock({ label, text }: { label: string; text: string | null | undefined }) {
  if (!text?.trim()) return null
  return (
    <div className="bg-surface-2 flex flex-col gap-1 rounded-md px-3 py-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="max-h-48 overflow-y-auto text-sm whitespace-pre-line">{text}</p>
    </div>
  )
}
