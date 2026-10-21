import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { Auswahlwert } from '@/types/kontakt'
import type { Geschaeft } from '../types'

const spalte = spaltenHelfer<Geschaeft>()

/** Spalten der Tabellen-Ansicht über alle Geschäfte: Nummer, Name, Ort, Stand, Wert, kWp, Quelle, Datum. */
export function geschaeftSpalten(
  t: TFunction,
  stand: (s: string) => Auswahlwert | undefined,
  text: (liste: 'kundenstand' | 'quelle', s: string | null) => string,
  person: (id: string | null) => string,
): Spalten<Geschaeft> {
  return spalte.columns([
    spalte.accessor('nummer', {
      header: t('verkauf.spalteListe.nummer'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue()}</span>,
      meta: { breite: 'w-24', nurBreit: true },
    }),
    spalte.accessor('name', {
      header: t('verkauf.spalteListe.name'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => (
        <span className="flex max-w-[16rem] min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs md:hidden">{c.row.original.ort}</span>
        </span>
      ),
    }),
    spalte.accessor((g) => g.ort ?? '', {
      id: 'ort',
      header: t('verkauf.spalteListe.ort'),
      cell: (c) => [c.row.original.plz, c.getValue()].filter(Boolean).join(' ') || '–',
      meta: { nurBreit: true },
    }),
    spalte.accessor('standRang', {
      header: t('verkauf.spalteListe.stand'),
      cell: (c) => (
        <Badge ton={tonVonFarbe(stand(c.row.original.stand)?.farbe)} punkt>
          {text('kundenstand', c.row.original.stand)}
        </Badge>
      ),
    }),
    spalte.accessor((g) => g.wertRappen ?? 0, {
      id: 'wert',
      header: t('verkauf.spalteListe.wert'),
      sortDescFirst: true,
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue() ? formatChf(c.getValue()) : '–'}</span>,
      meta: { zahl: true, nurBreit: true },
    }),
    spalte.accessor((g) => g.kwp ?? 0, {
      id: 'kwp',
      header: 'kWp',
      sortDescFirst: true,
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue() || '–'}</span>,
      meta: { zahl: true, nurBreit: true },
    }),
    spalte.accessor((g) => g.quelle ?? '', {
      id: 'quelle',
      header: t('verkauf.spalteListe.quelle'),
      cell: (c) => <span className="text-muted-foreground text-xs">{text('quelle', c.getValue()) || '–'}</span>,
      meta: { nurBreit: true },
    }),
    spalte.accessor((g) => g.terminPersonId ?? g.personId, {
      id: 'person',
      header: t('verkauf.spalteListe.person'),
      cell: (c) => <span className="text-muted-foreground text-xs">{person(c.getValue())}</span>,
      meta: { nurBreit: true },
    }),
    spalte.accessor((g) => g.standDatum ?? '', {
      id: 'datum',
      header: t('verkauf.spalteListe.datum'),
      sortDescFirst: true,
      cell: (c) => (
        <span className="zahlen text-muted-foreground font-mono text-[12px]">
          {c.getValue() ? formatDatum(c.getValue()) : '–'}
        </span>
      ),
      meta: { breite: 'w-28', nurBreit: true },
    }),
  ])
}
