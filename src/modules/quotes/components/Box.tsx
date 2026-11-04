import type { ReactNode } from 'react'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { cn } from '@/lib/utils'
import { LeereFelderBereich } from '@/components/shared/leereFelder'
import { useLeerZeile } from '@/components/shared/leereZeile'

/** Block der Offert-Seite: Titel (h2), rechts Zusatz oder Knopf, darunter der Inhalt. */
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

/** Beschriftung und Wert nebeneinander, kompakt für die schmalen Spalten der Seite. */
export function Zeile({ label, children, leer }: { label: string; children: ReactNode; leer?: boolean }) {
  const marke = useLeerZeile(children, leer)
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-2" {...marke}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? '–'}</dd>
    </div>
  )
}

/** Kennzahl-Kachel: grosse Zahl, kurzer Text, optional eingefärbt. */
export function Kachel({
  zahl,
  text,
  ton,
  nurGross = false,
}: {
  zahl: string
  text: string
  ton?: 'bad' | 'warn' | 'ok' | undefined
  /** Am Handy ausblenden (nur ab sm), damit oben nur steht, was heute zu tun ist. */
  nurGross?: boolean
}) {
  return (
    <div
      className={cn('bg-surface flex-col gap-0.5 rounded-lg border px-3 py-2.5', nurGross ? 'hidden sm:flex' : 'flex')}
    >
      <span
        className={cn(
          'font-display zahlen text-xl font-semibold',
          ton === 'bad' && 'text-bad',
          ton === 'warn' && 'text-warn',
          ton === 'ok' && 'text-ok',
        )}
      >
        {zahl}
      </span>
      <span className="text-muted-foreground text-xs">{text}</span>
    </div>
  )
}
