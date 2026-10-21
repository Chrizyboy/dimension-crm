import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Rahmen für einen zusammengehörigen Block (z.B. «Kontaktdaten» im Kundenblatt). Sparsam einsetzen. */
export function Karte({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-surface rounded-lg border', className)} {...props} />
}

/** Kopf einer Karte mit Titel links und optionalen Aktionen rechts. */
export function KarteKopf({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-3 border-b px-4 py-2', className)} {...props} />
  )
}

/** Titel einer Karte. */
export function KarteTitel({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold', className)} {...props} />
}

/** Inhalt einer Karte. */
export function KarteInhalt({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}
