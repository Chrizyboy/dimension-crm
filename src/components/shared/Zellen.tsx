import type { ReactNode } from 'react'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'

/*
 * Inhalte von Listenzellen, überall gleich (Chris 31.10.2026: «was auf eine Zeile gehört, bleibt auf einer Zeile»):
 * - Name: fett, höchstens zwei Zeilen; darunter eine Zeile mit Nummer, Ort, Person (am Handy, wenn Spalten fehlen).
 * - Datum, Betrag, Nummer, Person, Status: nie umbrechen.
 * - Freitext: grau, höchstens zwei Zeilen.
 */

const ZIFFERN = 'zahlen font-mono text-[13px] whitespace-nowrap'

/** Name mit optionaler Zeile darunter. `unterNurHandy`: die Zeile darunter nur, wo die Spalten fehlen. */
export function NameZelle({
  name,
  unter,
  zusatz,
  unterNurHandy = false,
  className,
}: {
  name: ReactNode
  unter?: ReactNode
  /** Kleines Zeichen direkt nach dem Namen (z. B. mögliche Dublette). */
  zusatz?: ReactNode
  unterNurHandy?: boolean
  className?: string
}) {
  return (
    <span className={cn('flex max-w-[14rem] min-w-0 flex-col sm:max-w-[18rem] lg:max-w-[22rem]', className)}>
      <span className="flex min-w-0 items-center gap-1.5 font-medium">
        <span className="line-clamp-2">{name}</span>
        {zusatz}
      </span>
      {unter && (
        <span className={cn('text-muted-foreground truncate text-xs', unterNurHandy && 'md:hidden')}>{unter}</span>
      )}
    </span>
  )
}

/** Zeile unter dem Namen aus mehreren Teilen, getrennt mit «·»; leere Teile fallen weg. */
export function unterzeile(...teile: (string | null | undefined | false)[]): string {
  return teile.filter(Boolean).join(' · ')
}

/** Datum «21.10.2026»; leer wird «–». */
export function DatumZelle({ wert, className }: { wert: string | Date | null | undefined; className?: string }) {
  return <span className={cn(ZIFFERN, className)}>{wert ? formatDatum(wert) : '–'}</span>
}

/** Betrag aus Rappen, rechtsbündig über `meta.zahl` der Spalte; leer wird «–». */
export function BetragZelle({ rappen, className }: { rappen: number | null | undefined; className?: string }) {
  return (
    <span className={cn(ZIFFERN, className)}>{rappen === null || rappen === undefined ? '–' : formatChf(rappen)}</span>
  )
}

/** Nummer (Kd.-Nr., Offerte, Projekt, Rechnung) in gleich breiten Ziffern. */
export function NummerZelle({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(ZIFFERN, className)}>{children ?? '–'}</span>
}

/** Kurzer Text, der nie umbricht (Ort, Person, Kategorie). Zu lang wird er mit «…» gekürzt, ganz im Hinweis. */
export function EinzeilerZelle({ children, className }: { children: ReactNode; className?: string }) {
  const titel = typeof children === 'string' ? children : undefined
  return (
    <span className={cn('block max-w-[14rem] truncate whitespace-nowrap', className)} title={titel}>
      {children ?? '–'}
    </span>
  )
}

/** Freitext (Notiz, Anlage, Beschreibung): grau, höchstens zwei Zeilen. */
export function TextZelle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('text-muted-foreground line-clamp-2 max-w-[20rem] text-sm', className)}>{children ?? '–'}</span>
  )
}

/** Status mit Zusatz (z. B. wer dran ist) in einer Zeile: Marke zuerst, Zusatz grau dahinter. */
export function StatusZelle({ children, zusatz }: { children: ReactNode; zusatz?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {children}
      {zusatz && <span className="text-muted-foreground text-xs">{zusatz}</span>}
    </span>
  )
}
