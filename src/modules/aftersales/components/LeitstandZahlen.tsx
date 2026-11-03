import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Eine Kennzahl im Leitstand; mit Klick setzt sie den passenden Filter. */
export interface Kennzahl {
  id: string
  wert: number
  ton?: 'kritisch' | 'warnung'
  onKlick?: () => void
}

/** Kennzahlen oben im Leitstand: offen, zu spät, Termine dieser Woche, Teile, RMA, zu verrechnen. */
export function LeitstandZahlen({ zahlen }: { zahlen: Kennzahl[] }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {zahlen.map((z) => {
        const inhalt = (
          <>
            <span
              className={cn(
                'zahlen text-2xl font-semibold',
                z.ton === 'kritisch' && z.wert > 0 && 'text-bad',
                z.ton === 'warnung' && z.wert > 0 && 'text-warn',
              )}
            >
              {z.wert}
            </span>
            <span className="text-muted-foreground text-xs">{t(`service.zahl.${z.id}`)}</span>
          </>
        )
        const klasse = 'bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left'
        return z.onKlick ? (
          <button
            key={z.id}
            type="button"
            onClick={z.onKlick}
            className={cn(klasse, 'hover:border-accent focus-visible:ring-ring outline-none focus-visible:ring-2')}
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
