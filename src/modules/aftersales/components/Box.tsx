import type { ReactNode } from 'react'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Input, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { LeereFelderBereich } from '@/components/shared/leereFelder'
import { useLeerZeile } from '@/components/shared/leereZeile'

/** Block der Fall-Akte: Titel (h2), rechts Zusatz oder Knopf, darunter der Inhalt. */
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

/** Beschriftung und Wert untereinander, kompakt für die schmalen Spalten der Akte. */
export function Zeile({ label, children, leer }: { label: string; children: ReactNode; leer?: boolean }) {
  const marke = useLeerZeile(children, leer)
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-2" {...marke}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? '–'}</dd>
    </div>
  )
}

/** Textfeld, das beim Verlassen speichert (nur wenn sich etwas geändert hat). */
export function FeldInline({
  label,
  wert,
  onSpeichern,
  mehrzeilig = false,
  typ = 'text',
  platzhalter,
}: {
  label: string
  wert: string | null
  onSpeichern: (w: string | null) => void
  mehrzeilig?: boolean
  typ?: 'text' | 'tel' | 'datetime-local'
  platzhalter?: string
}) {
  const props = {
    'aria-label': label,
    placeholder: platzhalter ?? label,
    defaultValue: wert ?? '',
    onBlur: (e: { target: { value: string } }) => {
      const neu = e.target.value.trim()
      if (neu !== (wert ?? '')) onSpeichern(neu || null)
    },
  }
  return mehrzeilig ? <Textarea rows={2} {...props} /> : <Input type={typ} className="h-8" {...props} />
}
