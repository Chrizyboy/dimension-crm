import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { serviceKmStand } from '../lib/fristen'
import type { Fahrzeug } from '../types'
import { FristBadge } from './FristBadge'

const spalte = spaltenHelfer<Fahrzeug>()

/** Spalten der Fahrzeug-Liste: Fahrzeug, Kennzeichen, fährt, Kilometer, MFK, Service. */
export function fahrzeugSpalten(t: TFunction, name: (id: string | null) => string): Spalten<Fahrzeug> {
  return spalte.columns([
    spalte.accessor('bezeichnung', {
      header: t('fuhrpark.spalte.fahrzeug'),
      cell: (c) => (
        <span className="flex max-w-[20rem] min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            {[c.row.original.marke_modell, c.row.original.jahrgang].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor('kennzeichen', {
      header: t('fuhrpark.spalte.kennzeichen'),
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-1">
          <span className="zahlen font-mono text-xs whitespace-nowrap">{c.getValue()}</span>
          {c.row.original.ausser_betrieb && <Badge>{t('fuhrpark.ausserBetrieb')}</Badge>}
        </span>
      ),
    }),
    spalte.accessor((f) => name(f.person_id), {
      id: 'person',
      header: t('fuhrpark.spalte.faehrt'),
      meta: { nurBreit: true },
    }),
    spalte.accessor((f) => f.km_stand ?? -1, {
      id: 'km',
      header: t('fuhrpark.spalte.km'),
      cell: (c) => {
        const f = c.row.original
        if (f.km_stand === null) return '–'
        const stand = serviceKmStand(f.km_stand, f.service_km)
        return (
          <span className={stand === 'ok' ? '' : stand === 'bald' ? 'text-warn font-medium' : 'text-bad font-medium'}>
            {f.km_stand.toLocaleString('de-CH')}
          </span>
        )
      },
      meta: { zahl: true, nurBreit: true },
    }),
    spalte.accessor((f) => f.naechste_mfk ?? '9999', {
      id: 'mfk',
      header: t('fuhrpark.spalte.mfk'),
      cell: (c) => <FristBadge datum={c.row.original.naechste_mfk} />,
    }),
    spalte.accessor((f) => f.naechster_service ?? '9999', {
      id: 'service',
      header: t('fuhrpark.spalte.service'),
      cell: (c) => <FristBadge datum={c.row.original.naechster_service} />,
      meta: { nurBreit: true },
    }),
  ])
}
