import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { fristTon, ortKurz, PRIO_TON, STATUS_TON } from '../lib/anzeige'
import type { Dossier } from '../types'

const spalte = spaltenHelfer<Dossier>()

/** Spalten der Dossier-Liste: Priorität, Dossier, Ort, Spur und Stand, Frist, Quelle. */
export function dossierSpalten(t: TFunction): Spalten<Dossier> {
  return spalte.columns([
    spalte.accessor((d) => d.prioritaet ?? 'Z', {
      id: 'prio',
      header: t('ausschreibungen.spalte.prio'),
      cell: (c) =>
        c.row.original.prioritaet ? (
          <Badge ton={PRIO_TON[c.row.original.prioritaet]}>{c.row.original.prioritaet}</Badge>
        ) : null,
      meta: { breite: 'w-14' },
    }),
    spalte.accessor('titel', {
      header: t('ausschreibungen.spalte.dossier'),
      cell: (c) => (
        <span className="flex max-w-[26rem] min-w-0 flex-col">
          <span className="line-clamp-2 font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground line-clamp-2 text-xs">
            <span className="zahlen font-mono">{c.row.original.nummer}</span> ·{' '}
            {t(`ausschreibungen.art.${c.row.original.art}`)}
            {c.row.original.begruendung ? ` · ${c.row.original.begruendung}` : ''}
          </span>
        </span>
      ),
    }),
    spalte.accessor((d) => ortKurz(d), {
      id: 'ort',
      header: t('ausschreibungen.spalte.ort'),
      cell: (c) => (
        <span className="flex flex-col">
          <span className="line-clamp-2">{c.getValue()}</span>
          {c.row.original.fahrzeit_min != null && (
            <span className="text-muted-foreground text-xs">
              {t('ausschreibungen.fahrzeit', { min: c.row.original.fahrzeit_min })}
            </span>
          )}
        </span>
      ),
      meta: { nurBreit: true, breite: 'w-40' },
    }),
    spalte.accessor('status', {
      header: t('ausschreibungen.spalte.stand'),
      cell: (c) => (
        <span className="flex flex-col items-start gap-1">
          <Badge ton={STATUS_TON[c.getValue()]} punkt>
            {t(`ausschreibungen.status.${c.getValue()}`)}
          </Badge>
          <span className="text-muted-foreground text-xs">{t(`ausschreibungen.spur.${c.row.original.spur}`)}</span>
        </span>
      ),
      meta: { breite: 'w-36' },
    }),
    spalte.accessor((d) => d.frist ?? '9999', {
      id: 'frist',
      header: t('ausschreibungen.spalte.frist'),
      cell: (c) =>
        c.row.original.frist ? (
          <Badge ton={fristTon(c.row.original.frist)}>{formatDatum(c.row.original.frist)}</Badge>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
      meta: { breite: 'w-28' },
    }),
    spalte.accessor('quelle', {
      header: t('ausschreibungen.spalte.quelle'),
      cell: (c) => (
        <span className="text-muted-foreground text-xs">
          {t(`ausschreibungen.quelle.${c.getValue()}`, { defaultValue: c.getValue() })}
        </span>
      ),
      meta: { nurBreit: true, breite: 'w-28' },
    }),
  ])
}
