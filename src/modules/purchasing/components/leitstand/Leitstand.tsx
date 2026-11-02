import { AlertTriangle, ShoppingCart } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBedarf, useBestellungen, useMaterialplan } from '../../hooks/useEinkauf'
import { bedarfJeLieferant, kopfzahlen, nachSchritt } from '../../lib/leitstand'
import { inTagen } from '../../lib/anzeige'
import type { Bestellung } from '../../types'
import { BestellKarte } from './BestellKarte'

const SPALTEN = ['freigabe', 'ab_offen', 'unterwegs', 'eingang', 'rechnung'] as const

/**
 * Leitstand des Einkaufs: jede Bestellung in ihrem Schritt, vom Bedarf («zu bestellen») bis zur geprüften
 * Lieferantenrechnung. Rot markiert, wo eine Montage in Gefahr ist. Kopfzahlen führen zur passenden Ansicht.
 */
export function Leitstand({
  onBestellung,
  onBestellen,
  onMaterialplan,
  onListe,
}: {
  onBestellung: (id: string) => void
  onBestellen: (lieferantId: string | null) => void
  onMaterialplan: () => void
  onListe: () => void
}) {
  const { t } = useTranslation()
  const liste = useBestellungen('alle')
  const bedarf = useBedarf()
  const plan = useMaterialplan()
  const heute = inTagen(new Date(), 0)
  const gruppen = useMemo(() => bedarfJeLieferant(bedarf.data ?? []), [bedarf.data])
  const spalten = useMemo(() => nachSchritt(liste.data ?? []), [liste.data])
  const kz = useMemo(
    () => kopfzahlen(liste.data ?? [], gruppen, plan.data ?? [], heute),
    [liste.data, gruppen, plan.data, heute],
  )

  if (liste.error || bedarf.error)
    return (
      <Fehlerzustand
        details={String(liste.error ?? bedarf.error)}
        onNochmal={() => void Promise.all([liste.refetch(), bedarf.refetch()])}
      />
    )
  if (liste.isPending || bedarf.isPending) return <Skelett className="h-96" />

  const kacheln: { zahl: string; text: string; ton?: 'warn' | 'bad'; klick: () => void }[] = [
    {
      zahl: String(kz.zuBestellen),
      text: t('einkauf.ls.kz.zuBestellen'),
      ...(kz.zuBestellen ? { ton: 'warn' as const } : {}),
      klick: () => {
        onBestellen(null)
      },
    },
    { zahl: String(kz.freigabe), text: t('einkauf.ls.kz.freigabe'), klick: onListe },
    {
      zahl: String(kz.abOffen),
      text: t('einkauf.ls.kz.abOffen'),
      ...(kz.abOffen ? { ton: 'warn' as const } : {}),
      klick: onListe,
    },
    {
      zahl: String(kz.gefaehrdet),
      text: t('einkauf.ls.kz.gefaehrdet'),
      ...(kz.gefaehrdet ? { ton: 'bad' as const } : {}),
      klick: onMaterialplan,
    },
    {
      zahl: `${String(kz.komplett)} / ${String(kz.baustellen)}`,
      text: t('einkauf.ls.kz.baustellen'),
      klick: onMaterialplan,
    },
    { zahl: `CHF ${formatChf(kz.offenRappen)}`, text: t('einkauf.ls.kz.offen'), klick: onListe },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {kacheln.map((k) => (
          <button
            key={k.text}
            type="button"
            onClick={k.klick}
            className="bg-surface hover:border-border-strong focus-visible:ring-ring flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-2"
          >
            <span
              className={cn(
                'font-display zahlen text-xl font-semibold',
                k.ton === 'warn' && 'text-warn',
                k.ton === 'bad' && 'text-bad',
              )}
            >
              {k.zahl}
            </span>
            <span className="text-muted-foreground text-xs">{k.text}</span>
          </button>
        ))}
      </div>
      <div className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        <Spalte titel={t('einkauf.ls.spalte.zuBestellen')} anzahl={gruppen.length}>
          {gruppen.map((g) => (
            <button
              key={g.lieferant_id ?? '–'}
              type="button"
              onClick={() => {
                onBestellen(g.lieferant_id)
              }}
              className={cn(
                'bg-surface hover:border-border-strong flex flex-col gap-1 rounded-lg border border-l-4 p-2.5 text-left',
                g.bestellen_bis && g.bestellen_bis <= heute ? 'border-l-bad' : 'border-l-warn',
              )}
            >
              <span className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{g.lieferant ?? t('einkauf.ls.ohneLieferant')}</span>
                {g.bestellen_bis && (
                  <Badge ton={g.bestellen_bis <= heute ? 'kritisch' : 'warnung'}>
                    {t('einkauf.ls.bis', { datum: formatDatum(g.bestellen_bis) })}
                  </Badge>
                )}
              </span>
              <span className="text-sm font-semibold">{t('einkauf.ls.zeilen', { count: g.zeilen })}</span>
              <span className="text-muted-foreground line-clamp-2 text-xs">{g.projekte.join(', ')}</span>
              {g.total_rappen > 0 && <span className="zahlen text-xs">CHF {formatChf(g.total_rappen)}</span>}
            </button>
          ))}
        </Spalte>
        {SPALTEN.map((s) => (
          <Spalte key={s} titel={t(`einkauf.ls.spalte.${s}`)} anzahl={spalten[s].length}>
            {spalten[s].slice(0, 30).map((b: Bestellung) => (
              <BestellKarte key={b.id} b={b} heute={heute} onOeffnen={onBestellung} />
            ))}
          </Spalte>
        ))}
      </div>
      {kz.gefaehrdet > 0 && (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <AlertTriangle className="text-bad size-4" aria-hidden="true" />
          {t('einkauf.ls.gefahrHinweis')}
        </p>
      )}
    </div>
  )
}

function Spalte({ titel, anzahl, children }: { titel: string; anzahl: number; children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="bg-muted/40 flex min-w-0 flex-col gap-2 rounded-lg border p-2" aria-label={titel}>
      <h3 className="flex items-center justify-between px-1 text-sm font-semibold">
        {titel}
        <span className="text-muted-foreground zahlen text-xs">{anzahl}</span>
      </h3>
      {anzahl === 0 ? (
        <p className="text-muted-foreground flex items-center gap-1.5 px-1 py-3 text-xs">
          <ShoppingCart className="size-3.5" aria-hidden="true" />
          {t('einkauf.ls.leer')}
        </p>
      ) : (
        children
      )}
    </section>
  )
}
