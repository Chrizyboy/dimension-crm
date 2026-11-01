import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatTelefon } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { Kontaktzeile } from '@/types/kontakt'
import { EinzeilerZelle, NummerZelle } from '@/components/shared/Zellen'

const spalte = spaltenHelfer<Kontaktzeile>()

/** Spalten des Adressbuchs: wer, welche Art, wo und wie erreichbar. */
export function adressbuchSpalten(t: TFunction, kontaktart: (schluessel: string) => string): Spalten<Kontaktzeile> {
  return spalte.columns([
    spalte.accessor('kundennummer', {
      header: t('kunden.spalte.nummer'),
      cell: (c) => <NummerZelle>{formatKundennummer(c.getValue())}</NummerZelle>,
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('name', {
      header: t('kunden.spalte.name'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => <span className="line-clamp-2 max-w-[16rem] font-medium lg:max-w-[20rem]">{c.getValue()}</span>,
    }),
    spalte.accessor('kontaktart', {
      header: t('adressbuch.spalte.art'),
      cell: (c) => <Badge>{kontaktart(c.getValue())}</Badge>,
    }),
    spalte.accessor('ort', {
      header: t('kunden.spalte.ort'),
      cell: (c) => (
        <EinzeilerZelle>{[c.row.original.plz, c.getValue()].filter(Boolean).join(' ') || '–'}</EinzeilerZelle>
      ),
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
      cell: (c) => (
        <span className="text-muted-foreground line-clamp-2 max-w-[15rem] break-words">{c.getValue() || '–'}</span>
      ),
      meta: { nurBreit: true },
    }),
  ])
}
