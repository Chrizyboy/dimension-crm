import type { ReactNode } from 'react'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { cn } from '@/lib/utils'
import { LeereFelderBereich } from '@/components/shared/leereFelder'

/** Block der Kundenakte: Titel (h2), rechts Zusatz oder Knopf, darunter der Inhalt (wie die Fall-Akte im Service). */
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
      <KarteKopf className="min-h-10 px-3 py-1.5">
        <KarteTitel>{titel}</KarteTitel>
        {rechts && <div className="text-muted-foreground flex items-center gap-2 text-xs">{rechts}</div>}
      </KarteKopf>
      <LeereFelderBereich className="flex flex-col gap-2 p-3 text-sm">{children}</LeereFelderBereich>
    </Karte>
  )
}

/**
 * Eine Zeile in einer Box: Titel als Link in das zuständige Modul, rechts der Stand, darunter Einzelheiten.
 * Links statt eigener Bearbeitung, damit jede Änderung dort passiert, wo ihre Regeln liegen.
 */
export function Posten({
  titel,
  href,
  status,
  children,
}: {
  titel: string
  href?: string | undefined
  status?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 border-b pb-2 last:border-b-0 last:pb-0">
      {href ? (
        <a href={href} className="truncate font-medium hover:underline">
          {titel}
        </a>
      ) : (
        <span className="truncate font-medium">{titel}</span>
      )}
      <span>{status}</span>
      {children && <div className="text-muted-foreground col-span-2 text-xs">{children}</div>}
    </div>
  )
}

/** Hinweis, wenn eine Box nichts enthält. */
export function Leer({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>
}

/** Kleine Überschrift innerhalb einer Box («Laufend», «Abgeschlossen»). */
export function Unterteil({ children }: { children: ReactNode }) {
  return <h3 className="text-muted-foreground mt-1 text-xs font-medium first:mt-0">{children}</h3>
}
