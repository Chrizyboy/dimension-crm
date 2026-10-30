import type { TFunction } from 'i18next'
import { Camera } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { dauerText } from '../lib/zeit'
import type { Rapport } from '../types'

const spalte = spaltenHelfer<Rapport>()

/** Spalten der Rapportliste: Nummer, Datum, Art, Kunde und Bezug, Monteur, Zeit, Fotos, Stand. */
export function rapportSpalten(t: TFunction): Spalten<Rapport> {
  return spalte.columns([
    spalte.accessor('nummer', {
      header: t('baustelle.spalte.nummer'),
      cell: (c) => <span className="zahlen font-mono text-xs">{c.getValue()}</span>,
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('datum', {
      header: t('baustelle.spalte.datum'),
      cell: (c) => <span className="zahlen">{formatDatum(c.getValue())}</span>,
    }),
    spalte.accessor('art', {
      header: t('baustelle.spalte.art'),
      cell: (c) => (
        <Badge ton={c.getValue() === 'ibn' ? 'marke' : 'neutral'}>{t(`baustelle.art.${c.getValue()}`)}</Badge>
      ),
    }),
    spalte.accessor((r) => r.kunde ?? '', {
      id: 'kunde',
      header: t('baustelle.spalte.kunde'),
      cell: (c) => {
        const r = c.row.original
        return (
          <span className="flex max-w-[22rem] min-w-0 flex-col">
            <span className="line-clamp-2 font-medium">{c.getValue() || '–'}</span>
            <span className="text-muted-foreground line-clamp-2 text-xs">
              {[r.projekt_nummer ?? r.service_nummer, r.objekt_ort].filter(Boolean).join(' · ')}
            </span>
          </span>
        )
      },
    }),
    spalte.accessor((r) => r.person ?? '', {
      id: 'person',
      header: t('baustelle.spalte.person'),
      meta: { nurBreit: true },
    }),
    spalte.accessor((r) => r.stunden ?? 0, {
      id: 'stunden',
      header: t('baustelle.spalte.zeit'),
      cell: (c) => <span className="zahlen">{c.getValue() ? dauerText(Math.round(c.getValue() * 60)) : '–'}</span>,
      meta: { nurBreit: true },
    }),
    spalte.accessor('fotos_anzahl', {
      header: t('baustelle.spalte.fotos'),
      cell: (c) =>
        c.getValue() ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Camera className="size-3.5" aria-hidden="true" />
            {c.getValue()}
          </span>
        ) : (
          '–'
        ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((r) => (r.abgeschlossen_am ? 1 : 0), {
      id: 'stand',
      header: t('baustelle.spalte.stand'),
      cell: (c) => (
        <Badge ton={c.getValue() ? 'ok' : 'warnung'} punkt>
          {t(c.getValue() ? 'baustelle.rapport.abgeschlossen' : 'baustelle.rapport.offen')}
        </Badge>
      ),
    }),
  ])
}
