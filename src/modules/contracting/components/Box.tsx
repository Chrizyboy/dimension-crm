import type { ReactNode } from 'react'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { cn } from '@/lib/utils'

/** Block der Projekt-Akte: Titel (h2), rechts Zusatz oder Knopf, darunter der Inhalt. */
export function Box({
  titel,
  rechts,
  children,
  className,
}: {
  titel: string
  rechts?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Karte className={cn('min-w-0', className)}>
      <KarteKopf className="min-h-10 py-1.5">
        <KarteTitel>{titel}</KarteTitel>
        {rechts && <div className="text-muted-foreground flex items-center gap-2 text-xs">{rechts}</div>}
      </KarteKopf>
      <div className="flex flex-col gap-2 p-3 text-sm">{children}</div>
    </Karte>
  )
}

/** Beschriftung und Wert nebeneinander, kompakt für die schmalen Spalten der Akte. */
export function Zeile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? '–'}</dd>
    </div>
  )
}
