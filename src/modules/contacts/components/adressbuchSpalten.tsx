import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatTelefon } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { Kontaktzeile } from '@/types/kontakt'

const spalte = spaltenHelfer<Kontaktzeile>()

/** Spalten des Adressbuchs: wer, welche Art, wo und wie erreichbar. */
export function adressbuchSpalten(t: TFunction, kontaktart: (schluessel: string) => string): Spalten<Kontaktzeile> {
  return spalte.columns([
    spalte.accessor('kundennummer', {
      header: t('kunden.spalte.nummer'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{formatKundennummer(c.getValue())}</span>,
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('name', {
      header: t('kunden.spalte.name'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => <span className="block max-w-[16rem] truncate font-medium lg:max-w-[18rem]">{c.getValue()}</span>,
    }),
    spalte.accessor('kontaktart', {
      header: t('adressbuch.spalte.art'),
      cell: (c) => <Badge>{kontaktart(c.getValue())}</Badge>,
    }),
    spalte.accessor('ort', {
      header: t('kunden.spalte.ort'),
      cell: (c) => [c.row.original.plz, c.getValue()].filter(Boolean).join(' ') || '–',
      meta: { nurBreit: true },
    }),
    spalte.accessor((k) => k.telefon ?? '', {
      id: 'telefon',
      header: t('adressbuch.spalte.telefon'),
      enableSorting: false,
      cell: (c) => (
        <span className="zahlen text-muted-foreground">{c.getValue() ? formatTelefon(c.getValue()) : '–'}</span>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((k) => k.email ?? '', {
      id: 'email',
      header: t('adressbuch.spalte.email'),
      enableSorting: false,
      cell: (c) => <span className="text-muted-foreground block max-w-[11rem] truncate">{c.getValue() || '–'}</span>,
      meta: { nurBreit: true },
    }),
  ])
}
