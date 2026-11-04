import type { ReactNode } from 'react'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { cn } from '@/lib/utils'
import { LeereFelderBereich } from '@/components/shared/leereFelder'

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
      <LeereFelderBereich className="flex flex-col gap-2 p-3 text-sm">{children}</LeereFelderBereich>
    </Karte>
  )
}

/** Eine Zeile mit Text links und Wert rechts (Termine, Material, Geld). */
export function Zeile({ links, rechts, gedaempft }: { links: ReactNode; rechts?: ReactNode; gedaempft?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-2', gedaempft && 'text-muted-foreground')}>
      <span className="min-w-0 break-words">{links}</span>
      {rechts != null && <span className="zahlen shrink-0 text-right">{rechts}</span>}
    </div>
  )
}
