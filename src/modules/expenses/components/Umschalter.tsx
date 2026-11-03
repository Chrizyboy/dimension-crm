import { cn } from '@/lib/utils'

/**
 * Zwei bis drei Möglichkeiten nebeneinander (z. B. «Eigenes Geld | Firmenkarte»), wie ein Schalter mit Text.
 * Jeder Knopf meldet mit `aria-pressed`, ob er gewählt ist.
 */
export function Umschalter<T extends string>({
  wert,
  optionen,
  onChange,
  beschriftung,
}: {
  wert: T
  optionen: { wert: T; text: string }[]
  onChange: (w: T) => void
  beschriftung: string
}) {
  return (
    <div
      role="group"
      aria-label={beschriftung}
      className="border-border-strong inline-flex overflow-hidden rounded-md border"
    >
      {optionen.map((o) => (
        <button
          key={o.wert}
          type="button"
          aria-pressed={o.wert === wert}
          onClick={() => {
            onChange(o.wert)
          }}
          className={cn(
            'focus-visible:ring-ring h-8 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset',
            o.wert === wert
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface text-muted-foreground hover:text-foreground',
          )}
        >
          {o.text}
        </button>
      ))}
    </div>
  )
}
