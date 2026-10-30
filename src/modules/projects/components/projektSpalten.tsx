import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { anlageKurz, ortZeile } from '../lib/anzeige'
import { BAU_TON } from '../lib/fahrplan'
import type { Projekt } from '../types'
import { FahrplanBalken } from './FahrplanBalken'

const spalte = spaltenHelfer<Projekt>()
const STATUS_TON = { auftrag: 'info', im_bau: 'marke', abgeschlossen: 'ok' } as const

/** Spalten der Projektliste: Nummer, Kunde, Ort, Status, Fahrplan, Baubeginn, Vertragswert. */
export function projektSpalten(t: TFunction): Spalten<Projekt> {
  return spalte.columns([
    spalte.accessor('nummer', {
      header: t('projekte.spalte.nummer'),
      cell: (c) => <span className="zahlen font-mono text-xs">{c.getValue()}</span>,
      meta: { breite: 'w-24' },
    }),
    spalte.accessor('kunde', {
      header: t('projekte.spalte.kunde'),
      cell: (c) => (
        <span className="flex max-w-[18rem] min-w-0 flex-col">
          <span className="line-clamp-2 font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground line-clamp-2 text-xs">{anlageKurz(c.row.original, t) || '–'}</span>
        </span>
      ),
    }),
    spalte.accessor((p) => ortZeile(p), {
      id: 'ort',
      header: t('projekte.spalte.ort'),
      meta: { nurBreit: true, breite: 'min-w-44' },
    }),
    spalte.accessor('status', {
      header: t('projekte.spalte.status'),
      cell: (c) => (
        <span className="flex flex-wrap gap-1">
          <Badge ton={STATUS_TON[c.getValue()]}>{t(`projekte.status.${c.getValue()}`)}</Badge>
          {c.row.original.status === 'im_bau' && c.row.original.bau_status && (
            <Badge ton={BAU_TON[c.row.original.bau_status] ?? 'neutral'} punkt>
              {t(`projekte.bauStatus.${c.row.original.bau_status}`)}
            </Badge>
          )}
        </span>
      ),
    }),
    spalte.accessor((p) => p.stand?.erledigt ?? 0, {
      id: 'fahrplan',
      header: t('projekte.spalte.fahrplan'),
      cell: (c) => (
        <span className="block w-48">
          <FahrplanBalken stand={c.row.original.stand} />
        </span>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((p) => p.baubeginn ?? '', {
      id: 'baubeginn',
      header: t('projekte.spalte.baubeginn'),
      cell: (c) => (c.getValue() ? formatDatum(c.getValue()) : '–'),
      meta: { nurBreit: true },
    }),
    spalte.accessor((p) => p.vertragswert_rappen ?? 0, {
      id: 'wert',
      header: t('projekte.spalte.wert'),
      cell: (c) => (c.getValue() ? formatChf(c.getValue()) : '–'),
      meta: { zahl: true, nurBreit: true },
    }),
  ])
}
