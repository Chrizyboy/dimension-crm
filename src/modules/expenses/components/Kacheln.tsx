import { cn } from '@/lib/utils'

export interface Kachel {
  zahl: string
  text: string
  ton?: 'ok' | 'warn' | 'bad'
  onClick?: () => void
}

/** Kopfzahlen über einer Liste (wie in den Wartungsverträgen); mit Klick setzen sie einen Filter. */
export function Kacheln({ kacheln }: { kacheln: Kachel[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {kacheln.map((k) => {
        const inhalt = (
          <>
            <span
              className={cn(
                'font-display zahlen text-xl font-semibold',
                k.ton === 'warn' && 'text-warn',
                k.ton === 'bad' && 'text-bad',
                k.ton === 'ok' && 'text-ok',
              )}
            >
              {k.zahl}
            </span>
            <span className="text-muted-foreground text-xs">{k.text}</span>
          </>
        )
        const klasse = 'bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left'
        return k.onClick ? (
          <button
            key={k.text}
            type="button"
            onClick={k.onClick}
            className={cn(
              klasse,
              'hover:border-border-strong focus-visible:ring-ring outline-none focus-visible:ring-2',
            )}
          >
            {inhalt}
          </button>
        ) : (
          <div key={k.text} className={klasse}>
            {inhalt}
          </div>
        )
      })}
    </div>
  )
}
