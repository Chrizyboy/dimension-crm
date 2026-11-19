import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Rahmen für einen zusammengehörigen Block (z.B. «Kontaktdaten» im Kundenblatt), als Milchglas wie V234. */
export function Karte({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glas rounded-xl', className)} {...props} />
}

/** Kopf einer Karte mit Titel links und optionalen Aktionen rechts. */
export function KarteKopf({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex min-h-12 items-center justify-between gap-3 border-b px-[18px] py-2', className)}
      {...props}
    />
  )
}

/**
 * Titel einer Karte. Standard h2, weil Karten meist direkt unter dem Seitentitel (h1) stehen; so springt
 * die Reihenfolge der Überschriften nicht (wichtig für Screenreader). In einem Abschnitt mit h2 `ebene={3}`.
 */
export function KarteTitel({ className, ebene = 2, ...props }: HTMLAttributes<HTMLHeadingElement> & { ebene?: 2 | 3 }) {
  const Titel = ebene === 3 ? 'h3' : 'h2'
  return <Titel className={cn('text-[15px] font-bold tracking-tight', className)} {...props} />
}

/** Inhalt einer Karte. */
export function KarteInhalt({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[18px]', className)} {...props} />
}
