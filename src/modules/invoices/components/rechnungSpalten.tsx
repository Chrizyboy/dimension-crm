import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { Rechnung } from '../types'
import { statusTon } from './status'

const spalte = spaltenHelfer<Rechnung>()

/** Spalten der Rechnungsliste: Nummer, Kunde und Projekt, Art, Datum, Fällig, Total, Offen, Stand. */
export function rechnungSpalten(t: TFunction): Spalten<Rechnung> {
  return spalte.columns([
    spalte.accessor((r) => r.nummer ?? '', {
      id: 'nummer',
      header: t('rechnungen.spalte.nummer'),
      cell: (c) => (
        <span className="zahlen font-mono text-xs">
          {c.getValue() || <em className="not-italic">{t('rechnungen.entwurf')}</em>}
        </span>
      ),
      // Am Handy steht die Nummer unter dem Kunden, damit Fällig und Offen Platz haben.
      meta: { breite: 'w-28', nurBreit: true },
    }),
    spalte.accessor('kunde', {
      header: t('rechnungen.spalte.kunde'),
      cell: (c) => {
        const r = c.row.original
        return (
          <span className="flex max-w-[22rem] min-w-0 flex-col">
            <span className="line-clamp-2 font-medium">{c.getValue()}</span>
            <span className="text-muted-foreground line-clamp-2 text-xs">
              <span className="zahlen font-mono md:hidden">{r.nummer ?? t('rechnungen.entwurf')} · </span>
              {[r.projekt_nummer, r.titel].filter(Boolean).join(' · ')}
            </span>
          </span>
        )
      },
    }),
    spalte.accessor('art', {
      header: t('rechnungen.spalte.art'),
      cell: (c) => t(`rechnungen.art.${c.getValue()}`),
      meta: { nurBreit: true },
    }),
    spalte.accessor((r) => r.datum ?? '', {
      id: 'datum',
      header: t('rechnungen.spalte.datum'),
      cell: (c) => (c.getValue() ? formatDatum(c.getValue()) : '–'),
      meta: { nurBreit: true },
    }),
    spalte.accessor((r) => r.faellig_am ?? '', {
      id: 'faellig',
      header: t('rechnungen.spalte.faellig'),
      cell: (c) => {
        const r = c.row.original
        if (!c.getValue()) return '–'
        return (
          <span className="flex flex-wrap items-center gap-1">
            <span className={r.ueberfaellig ? 'text-bad font-medium' : ''}>{formatDatum(c.getValue())}</span>
            {r.mahnstufe > 0 && <Badge ton="kritisch">{t('rechnungen.mahnstufeKurz', { stufe: r.mahnstufe })}</Badge>}
          </span>
        )
      },
    }),
    spalte.accessor('total_rappen', {
      header: t('rechnungen.spalte.total'),
      cell: (c) => <span className="zahlen">{formatChf(c.getValue())}</span>,
      meta: { nurBreit: true },
    }),
    spalte.accessor('offen_rappen', {
      header: t('rechnungen.spalte.offen'),
      cell: (c) => {
        const r = c.row.original
        const offen = r.status === 'gestellt' || r.status === 'teilbezahlt'
        return <span className="zahlen whitespace-nowrap">{offen ? formatChf(c.getValue()) : '–'}</span>
      },
    }),
    spalte.accessor('status', {
      header: t('rechnungen.spalte.status'),
      cell: (c) => {
        const r = c.row.original
        return (
          <span className="flex flex-wrap items-center gap-1">
            <Badge ton={statusTon(r)} punkt>
              {r.ueberfaellig ? t('rechnungen.ueberfaellig') : t(`rechnungen.status.${r.status}`)}
            </Badge>
            {r.abaninja_uuid && <Badge ton="neutral">AbaNinja</Badge>}
          </span>
        )
      },
    }),
  ])
}
