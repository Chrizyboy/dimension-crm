import type { ReactNode } from 'react'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { cn } from '@/lib/utils'
import { LeereFelderBereich } from '@/components/shared/leereFelder'
import { useLeerZeile } from '@/components/shared/leereZeile'

/** Block der Fahrzeug-Akte: Titel (h2), rechts Zusatz oder Knopf, darunter der Inhalt. */
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
      <LeereFelderBereich className="flex flex-col gap-2 p-3 text-sm">{children}</LeereFelderBereich>
    </Karte>
  )
}

/** Beschriftung und Wert nebeneinander; leere Werte zeigen einen Strich. */
export function Zeile({ label, children, leer }: { label: string; children: ReactNode; leer?: boolean }) {
  const marke = useLeerZeile(children, leer)
  return (
    <div className="grid grid-cols-[9rem_1fr] items-baseline gap-2" {...marke}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="zahlen min-w-0 break-words">{children === null || children === '' ? '–' : children}</dd>
    </div>
  )
}
