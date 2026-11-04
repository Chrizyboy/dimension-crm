import { cn } from '@/lib/utils'

/** Eine Zahl oben in einem Leitstand; mit Klick setzt sie meist den passenden Filter. */
export interface Kennzahlkachel {
  id: string
  wert: number | string
  text: string
  /** Rot oder gelb, wenn die Zahl nicht null ist. */
  ton?: 'kritisch' | 'warnung'
  aktiv?: boolean
  onKlick?: () => void
}

/** Null oder leer: nichts zu tun. */
function istNull(wert: number | string): boolean {
  return wert === 0 || wert === ''
}

/**
 * Zahlen-Kacheln über einem Leitstand. Die erste Kachel (die Gesamtzahl) steht immer da, die übrigen nur, wenn
 * sie nicht null sind (Chris 4.11.2026 «zu unübersichtlich», Entscheid 0058): eine Reihe «0 · 0 · 0» sagt nichts.
 * Gewählte Kacheln bleiben stehen, damit man den Filter wieder lösen kann.
 */
export function Kennzahlleiste({ zahlen, beschriftung }: { zahlen: readonly Kennzahlkachel[]; beschriftung: string }) {
  const sichtbar = zahlen.filter((z, i) => i === 0 || z.aktiv || !istNull(z.wert))
  return (
    <div
      role="group"
      aria-label={beschriftung}
      className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]"
    >
      {sichtbar.map((z) => {
        const inhalt = (
          <>
            <span
              className={cn(
                'zahlen text-2xl font-semibold',
                !istNull(z.wert) && z.ton === 'kritisch' && 'text-bad',
                !istNull(z.wert) && z.ton === 'warnung' && 'text-warn',
              )}
            >
              {z.wert}
            </span>
            <span className="text-muted-foreground text-xs">{z.text}</span>
          </>
        )
        const klasse = 'bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left'
        return z.onKlick ? (
          <button
            key={z.id}
            type="button"
            aria-pressed={z.aktiv}
            onClick={z.onKlick}
            className={cn(
              klasse,
              'hover:border-accent focus-visible:ring-ring outline-none focus-visible:ring-2',
              z.aktiv && 'border-accent',
            )}
          >
            {inhalt}
          </button>
        ) : (
          <div key={z.id} className={klasse}>
            {inhalt}
          </div>
        )
      })}
    </div>
  )
}
