import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { wartungTon } from '../lib/anzeige'
import type { Vertrag } from '../types'
import { BetragZelle, NummerZelle } from '@/components/shared/Zellen'

const spalte = spaltenHelfer<Vertrag>()
type Text = (wert: string) => { text: string; farbe: string | null }

/** Spalten der Vertragsliste: Nummer, Kunde, Rhythmus, Preis, nächste Wartung, Status. */
export function vertragSpalten(t: TFunction, status: Text, heute: Date): Spalten<Vertrag> {
  return spalte.columns([
    spalte.accessor((v) => v.nummer ?? '', {
      id: 'nummer',
      header: t('wartung.spalte.nummer'),
      cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
      // Am Handy steht die Nummer in der Zeile darunter.
      meta: { breite: 'w-20', nurBreit: true },
    }),
    spalte.accessor('kunde', {
      header: t('wartung.spalte.kunde'),
      cell: (c) => (
        <span className="flex max-w-[22rem] min-w-0 flex-col">
          <span className="line-clamp-2 font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            <span className="zahlen font-mono md:hidden">{c.row.original.nummer} · </span>
            {[c.row.original.ort, c.row.original.projekt].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor((v) => v.rhythmus_monate ?? 12, {
      id: 'rhythmus',
      header: t('wartung.spalte.rhythmus'),
      cell: (c) => t('wartung.rhythmus', { count: c.getValue() }),
      meta: { nurBreit: true },
    }),
    spalte.accessor((v) => v.preis_rappen ?? 0, {
      id: 'preis',
      header: t('wartung.spalte.preis'),
      cell: (c) => <BetragZelle rappen={c.getValue() || null} />,
      meta: { nurBreit: true, zahl: true },
    }),
    spalte.accessor((v) => v.naechste_wartung ?? '9999', {
      id: 'naechste',
      header: t('wartung.spalte.naechste'),
      cell: (c) => {
        const n = c.row.original.naechste_wartung
        if (!n || c.row.original.status !== 'aktiv') return '–'
        return <Badge ton={wartungTon(n, heute)}>{formatDatum(n)}</Badge>
      },
    }),
    spalte.accessor('status', {
      header: t('wartung.spalte.status'),
      cell: (c) => {
        const a = status(c.getValue())
        return (
          <Badge ton={tonVonFarbe(a.farbe)} punkt>
            {a.text}
          </Badge>
        )
      },
    }),
  ])
}
