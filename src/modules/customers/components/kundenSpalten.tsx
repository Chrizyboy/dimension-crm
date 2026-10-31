import { CopyCheck } from 'lucide-react'
import type { TFunction } from 'i18next'
import { formatTelefon } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { Kontaktzeile } from '@/types/kontakt'
import { StandBadge } from './StandBadge'
import { DatumZelle, NummerZelle } from '@/components/shared/Zellen'

const spalte = spaltenHelfer<Kontaktzeile>()

/**
 * Spalten der Kundenliste wie in V233 (Kd.-Nr., Name, PLZ, Ort, Kontakt, Stand), dazu
 * «Letzter Kontakt». Sortiert wird nach Rohwerten, damit z. B. der Stand in seiner Reihenfolge sortiert.
 */
export function kundenSpalten(t: TFunction): Spalten<Kontaktzeile> {
  return spalte.columns([
    spalte.accessor('kundennummer', {
      header: t('kunden.spalte.nummer'),
      cell: (c) => <NummerZelle>{formatKundennummer(c.getValue())}</NummerZelle>,
      meta: { breite: 'w-20', nurBreit: true },
    }),
    spalte.accessor('name', {
      header: t('kunden.spalte.name'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => (
        <span className="flex max-w-[10rem] min-w-0 flex-col sm:max-w-[16rem] lg:max-w-[18rem]">
          <span className="flex min-w-0 items-center gap-1.5 font-medium">
            <span className="line-clamp-2">{c.getValue()}</span>
            {c.row.original.moeglicheDublette && (
              <CopyCheck className="text-warn size-3.5 shrink-0" aria-label={t('kunden.dublette')} />
            )}
          </span>
          {/* Am Handy fehlen die Spalten Nummer und Ort; sie stehen klein unter dem Namen. */}
          <span className="text-muted-foreground truncate text-xs md:hidden">
            {[formatKundennummer(c.row.original.kundennummer), c.row.original.ort].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor('plz', {
      header: t('kunden.spalte.plz'),
      cell: (c) => <NummerZelle>{c.getValue() ?? '–'}</NummerZelle>,
      meta: { nurBreit: true, breite: 'w-16' },
    }),
    spalte.accessor('ort', {
      header: t('kunden.spalte.ort'),
      cell: (c) => c.getValue() ?? '–',
      meta: { nurBreit: true, breite: 'min-w-44' },
    }),
    spalte.accessor((k) => k.telefon ?? k.email ?? '', {
      id: 'kontakt',
      header: t('kunden.spalte.kontakt'),
      enableSorting: false,
      cell: (c) => {
        const k = c.row.original
        return (
          <span className="text-muted-foreground line-clamp-2 max-w-[15rem]">
            {k.telefon ? formatTelefon(k.telefon) : (k.email ?? '–')}
          </span>
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor((k) => k.standRang ?? 999, {
      id: 'stand',
      header: t('kunden.spalte.stand'),
      cell: (c) => <StandBadge stand={c.row.original.stand} />,
    }),
    spalte.accessor((k) => k.letzterKontakt ?? k.standDatum ?? '', {
      id: 'zuletzt',
      header: t('kunden.spalte.zuletzt'),
      sortDescFirst: true,
      cell: (c) => {
        const wert = c.getValue()
        return <DatumZelle wert={wert} className="text-muted-foreground" />
      },
      meta: { nurBreit: true, breite: 'w-28' },
    }),
  ])
}
