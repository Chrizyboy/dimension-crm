import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { Geraet, GeraetZustand } from '../types'
import { FristBadge } from './FristBadge'

const spalte = spaltenHelfer<Geraet>()

export const ZUSTAND_TON: Record<GeraetZustand, 'ok' | 'warnung' | 'kritisch' | 'neutral'> = {
  ok: 'ok',
  maengel: 'warnung',
  defekt: 'kritisch',
  ausser_betrieb: 'neutral',
}

/** Spalten der Geräte-Liste: Gerät, Art, wo es ist, Zustand, nächste Prüfung. */
export function geraetSpalten(
  t: TFunction,
  art: (schluessel: string) => string,
  wo: (g: Geraet) => string,
): Spalten<Geraet> {
  return spalte.columns([
    spalte.accessor('bezeichnung', {
      header: t('fuhrpark.spalte.geraet'),
      cell: (c) => (
        <span className="flex max-w-[20rem] min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground zahlen truncate text-xs">
            {[c.row.original.inventar_nr, c.row.original.hersteller].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor((g) => art(g.art), { id: 'art', header: t('fuhrpark.spalte.art'), meta: { nurBreit: true } }),
    spalte.accessor((g) => wo(g), { id: 'wo', header: t('fuhrpark.spalte.wo') }),
    spalte.accessor('zustand', {
      header: t('fuhrpark.spalte.zustand'),
      cell: (c) => (
        <Badge ton={ZUSTAND_TON[c.getValue()]} punkt>
          {t(`fuhrpark.zustand.${c.getValue()}`)}
        </Badge>
      ),
    }),
    spalte.accessor((g) => g.naechste_pruefung ?? '9999', {
      id: 'pruefung',
      header: t('fuhrpark.spalte.pruefung'),
      cell: (c) => <FristBadge datum={c.row.original.naechste_pruefung} />,
      meta: { nurBreit: true },
    }),
  ])
}
