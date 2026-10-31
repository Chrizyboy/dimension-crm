import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Eine Angabe mit Beschriftung, gleich wie in allen anderen Akten (`Angabe` in `AkteAbschnitt`):
 * Beschriftung links, Wert rechts. Leere Werte zeigen «–», damit man sieht, dass das Feld leer ist.
 * `breit` bleibt für ältere Aufrufe, alle Angaben stehen untereinander.
 */
export function Angabe({ label, children }: { label: string; children: ReactNode; breit?: boolean }) {
  const leer = children === null || children === undefined || children === ''
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 py-1 text-sm sm:grid-cols-[10.5rem_1fr]">
      <dt className="text-muted-foreground pt-0.5 text-xs">{label}</dt>
      <dd className={cn('min-w-0 break-words', leer && 'text-muted-foreground')}>{leer ? '–' : children}</dd>
    </div>
  )
}

/** Angaben untereinander, wie in allen Akten. */
export function Angaben({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('flex flex-col', className)}>{children}</dl>
}

/** Längerer Text (Kommentar, Verlauf) in einem ruhigen Kasten. */
export function Notizblock({ label, text }: { label: string; text: string | null | undefined }) {
  if (!text?.trim()) return null
  return (
    <div className="bg-surface-2 flex flex-col gap-1 rounded-md px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="max-h-48 overflow-y-auto text-sm whitespace-pre-line">{text}</p>
    </div>
  )
}
