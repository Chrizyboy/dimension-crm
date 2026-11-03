import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Eine Kennzahl im Leitstand; mit Klick setzt sie den passenden Filter. */
export interface Kennzahl {
  id: string
  wert: number | string
  ton?: 'kritisch' | 'warnung'
  aktiv?: boolean
  onKlick?: () => void
}

/** Kennzahlen oben im Leitstand. Rot oder gelb nur, wenn die Zahl nicht null ist. */
export function Kennzahlen({ zahlen }: { zahlen: Kennzahl[] }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {zahlen.map((z) => {
        const null_ = z.wert === 0 || z.wert === ''
        const inhalt = (
          <>
            <span
              className={cn(
                'zahlen text-2xl font-semibold',
                !null_ && z.ton === 'kritisch' && 'text-bad',
                !null_ && z.ton === 'warnung' && 'text-warn',
              )}
            >
              {z.wert}
            </span>
            <span className="text-muted-foreground text-xs">{t(`projekte.zahl.${z.id}`)}</span>
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
