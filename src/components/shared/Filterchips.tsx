import { cn } from '@/lib/utils'

export interface Filterchip {
  wert: string
  text: string
  /** Wie viele Einträge dahinter stehen; ohne Zahl wird keine gezeigt. */
  anzahl?: number
}

interface FilterchipsProps {
  optionen: readonly Filterchip[]
  gewaehlt: readonly string[]
  onChange: (gewaehlt: string[]) => void
  beschriftung: string
  /** Nur ein Wert zugleich (z. B. «Alle | Kontakte | Geschäft»); sonst Mehrfachauswahl. */
  einzeln?: boolean
}

/**
 * Filter als runde Knöpfe über Listen. Ein Klick schaltet ein und aus; die Zahl zeigt,
 * wie viele Einträge der Filter trifft. Für Stand, Kontaktart, Zeitachse und spätere Listen.
 */
export function Filterchips({ optionen, gewaehlt, onChange, beschriftung, einzeln = false }: FilterchipsProps) {
  return (
    <div role="group" aria-label={beschriftung} className="flex flex-wrap gap-1.5">
      {optionen.map((o) => {
        const an = gewaehlt.includes(o.wert)
        return (
          <button
            key={o.wert}
            type="button"
            aria-pressed={an}
            onClick={() => {
              if (einzeln) onChange([o.wert])
              else onChange(an ? gewaehlt.filter((x) => x !== o.wert) : [...gewaehlt, o.wert])
            }}
            className={cn(
              'focus-visible:ring-ring inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2',
              an ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface hover:bg-muted text-foreground',
            )}
          >
            {o.text}
            {o.anzahl !== undefined && (
              <span className={cn('zahlen font-mono text-xs', an ? 'opacity-80' : 'text-muted-foreground')}>
                {o.anzahl}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
