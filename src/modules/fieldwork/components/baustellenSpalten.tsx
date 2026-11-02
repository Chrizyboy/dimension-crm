import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { DatumZelle, NummerZelle } from '@/components/shared/Zellen'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { BaustelleZeile } from '../types'
import { sollTon } from '../lib/auswertung'
import { Balken } from './Balken'

const spalte = spaltenHelfer<BaustelleZeile>()

/** Spalten der Baustellen-Liste: Nummer, Kunde/Ort, Zeitraum, Art, Fortschritt, Soll/Ist, Meldungen. */
export function baustellenSpalten(t: TFunction): Spalten<BaustelleZeile> {
  return spalte.columns([
    spalte.accessor('nummer', {
      header: t('baustelle.spalte.nummer'),
      cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
      meta: { breite: 'w-24' },
    }),
    spalte.accessor((b) => b.kunde ?? '', {
      id: 'kunde',
      header: t('baustelle.spalte.kunde'),
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue() || '–'}</span>
          <span className="text-muted-foreground truncate text-xs">{c.row.original.ort ?? ''}</span>
        </span>
      ),
    }),
    spalte.accessor('von', {
      header: t('baustelle.akte.zeitraum'),
      cell: (c) => <DatumZelle wert={c.getValue()} />,
    }),
    spalte.accessor('vorlage', {
      header: t('baustelle.spalte.art'),
      cell: (c) => <Badge ton="marke">{t(`baustelle.vorlage.${c.getValue()}`, c.getValue())}</Badge>,
      meta: { nurBreit: true },
    }),
    spalte.accessor('fortschritt', {
      header: t('baustelle.tag.fortschritt'),
      cell: (c) => (
        <span className="flex w-28 items-center gap-2">
          <Balken wert={c.getValue()} beschriftung={t('baustelle.tag.fortschritt')} />
          <span className="zahlen text-xs">{c.getValue()}%</span>
        </span>
      ),
    }),
    spalte.accessor((b) => b.ist ?? 0, {
      id: 'stunden',
      header: t('baustelle.leitung.sollIst'),
      cell: (c) => {
        const b = c.row.original
        const ton = sollTon(b.ist, b.soll)
        return (
          <span className={`zahlen ${ton === 'bad' ? 'text-bad' : ton === 'warn' ? 'text-warn' : ''}`}>
            {b.ist ?? 0} / {b.soll ?? '–'} h
          </span>
        )
      },
    }),
    spalte.accessor('meldungen', {
      header: t('baustelle.leitung.meldungen'),
      cell: (c) => (c.getValue() > 0 ? <Badge ton="warnung">{c.getValue()}</Badge> : '–'),
      meta: { nurBreit: true },
    }),
  ])
}
