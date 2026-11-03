import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTagesbericht } from '../hooks/useAusschreibungen'
import { useLeitstand, useRegeln } from '../hooks/useSubmission'
import { fristTon } from '../lib/anzeige'
import { verteile } from '../lib/board'
import { fristenplan } from '../lib/fristen'
import type { Reiter, Spur } from '../types'
import { DossierKarte } from './DossierKarte'
import { DossierListe } from './DossierListe'

const SPUREN: Spur[] = ['angebot', 'akquise', 'beobachten']

/**
 * Leitstand: oben Zahlen, die auf jemanden warten, darunter die nächsten Fristen, dann das Board der gewählten
 * Spur (Submission, Akquise, Beobachten). «Liste» zeigt alle Dossiers als Tabelle mit Filter.
 */
export function Leitstand({ onOeffnen, onReiter }: { onOeffnen: (id: string) => void; onReiter: (r: Reiter) => void }) {
  const { t } = useTranslation()
  const [spur, setSpur] = useState<Spur | 'liste'>('angebot')
  const daten = useLeitstand()
  const bericht = useTagesbericht().data
  const regeln = useRegeln().data
  const plan = useMemo(
    () => fristenplan(daten.data ?? [], { postTage: regeln?.post_arbeitstage ?? 2 }).slice(0, 8),
    [daten.data, regeln],
  )

  const zahlen: { id: string; wert: string | number; ton?: 'kritisch' | 'warnung'; ziel?: Reiter }[] = [
    { id: 'neu', wert: bericht?.neu_heute ?? 0 },
    { id: 'gng', wert: bericht?.gng ?? 0, ton: 'kritisch' },
    { id: 'pruefung', wert: bericht?.pruefung ?? 0, ton: 'warnung' },
    { id: 'bewilligen', wert: bericht?.bewilligen ?? 0, ziel: 'bewilligen' },
    { id: 'fristen', wert: bericht?.fristen ?? 0, ton: 'warnung', ziel: 'fristen' },
    { id: 'eingereicht', wert: formatChf(bericht?.eingereicht_rappen ?? 0, { mitWaehrung: true }) },
    { id: 'nachweise', wert: bericht?.nachweise_ablauf ?? 0, ton: 'warnung', ziel: 'nachweise' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {zahlen.map((z) => {
          const aktiv = typeof z.wert === 'number' && z.wert > 0
          const inhalt = (
            <>
              <span
                className={cn(
                  'zahlen text-xl font-semibold',
                  aktiv && z.ton === 'kritisch' && 'text-bad',
                  aktiv && z.ton === 'warnung' && 'text-warn',
                )}
              >
                {z.wert}
              </span>
              <span className="text-muted-foreground text-xs">{t(`ausschreibungen.zahl.${z.id}`)}</span>
            </>
          )
          const klasse = 'bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left'
          const ziel = z.ziel
          return ziel ? (
            <button
              key={z.id}
              type="button"
              className={cn(klasse, 'hover:border-accent focus-visible:ring-ring outline-none focus-visible:ring-2')}
              onClick={() => {
                onReiter(ziel)
              }}
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

      {plan.length > 0 && (
        <section aria-label={t('ausschreibungen.leitstand.fristen')} className="flex gap-2 overflow-x-auto pb-1">
          {plan.map((f) => (
            <button
              key={`${f.dossier.id}-${f.art}`}
              type="button"
              onClick={() => {
                onOeffnen(f.dossier.id)
              }}
              className="bg-surface hover:border-accent focus-visible:ring-ring flex min-w-48 shrink-0 flex-col gap-0.5 rounded-lg border px-3 py-1.5 text-left outline-none focus-visible:ring-2"
            >
              <Badge ton={fristTon(f.am)}>
                {t(`ausschreibungen.fristArt.${f.art}`)} · {formatDatum(f.am)}
              </Badge>
              <span className="truncate text-xs">
                <span className="zahlen font-mono">{f.dossier.nummer}</span> {f.dossier.titel}
              </span>
            </button>
          ))}
        </section>
      )}

      <div role="group" aria-label={t('ausschreibungen.leitstand.spur')} className="flex flex-wrap gap-1.5">
        {[...SPUREN, 'liste' as const].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={spur === s}
            onClick={() => {
              setSpur(s)
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              spur === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface hover:border-accent',
            )}
          >
            {t(`ausschreibungen.leitstand.spurWahl.${s}`)}
          </button>
        ))}
      </div>

      {spur === 'liste' ? (
        <DossierListe ansicht="alle" aktiveId={null} onOeffnen={onOeffnen} />
      ) : daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-96" />
      ) : (
        <div
          role="region"
          aria-label={t(`ausschreibungen.leitstand.spurWahl.${spur}`)}
          tabIndex={0}
          className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6"
        >
          {verteile(daten.data, spur).map(({ spalte, karten }) => (
            <section
              key={spalte.id}
              aria-label={t(`ausschreibungen.board.${spalte.id}`)}
              className={cn(
                'bg-muted/50 flex shrink-0 flex-col rounded-xl border',
                spur === 'beobachten' ? 'w-full max-w-3xl' : 'w-72',
              )}
            >
              <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <h2 className="text-sm font-semibold">{t(`ausschreibungen.board.${spalte.id}`)}</h2>
                <span className="zahlen text-muted-foreground font-mono text-xs">{karten.length}</span>
              </header>
              <p className="text-muted-foreground px-3 pt-1.5 text-xs">
                {t(`ausschreibungen.boardHilfe.${spalte.id}`)}
              </p>
              <div className="flex max-h-[calc(100vh-26rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">
                {karten.map((d) => (
                  <DossierKarte key={d.id} d={d} onOeffnen={onOeffnen} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
