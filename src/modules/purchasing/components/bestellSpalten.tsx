import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { formatMenge } from '../lib/anzeige'
import type { Bestellung } from '../types'

const spalte = spaltenHelfer<Bestellung>()
type Text = (wert: string) => { text: string; farbe: string | null }

/** Spalten der Bestellliste: Nummer, Lieferant und Bezug, Liefertermin, Lieferstand, Total, Stand. */
export function bestellSpalten(t: TFunction, status: Text): Spalten<Bestellung> {
  return spalte.columns([
    spalte.accessor('nummer', {
      header: t('einkauf.spalte.nummer'),
      cell: (c) => <span className="zahlen font-mono text-xs">{c.getValue()}</span>,
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('lieferant', {
      header: t('einkauf.spalte.lieferant'),
      cell: (c) => {
        const b = c.row.original
        const bezug = b.projekt_nummer ? `${b.projekt_nummer} · ${b.kunde ?? ''}` : t('einkauf.fuerLager')
        return (
          <span className="flex max-w-[22rem] min-w-0 flex-col">
            <span className="truncate font-medium">{c.getValue()}</span>
            <span className="text-muted-foreground truncate text-xs">{bezug}</span>
          </span>
        )
      },
    }),
    spalte.accessor((b) => (b.lagerort_id ? (b.lagerort ?? '') : t('einkauf.baustelle')), {
      id: 'ziel',
      header: t('einkauf.spalte.ziel'),
      meta: { nurBreit: true },
    }),
    spalte.accessor((b) => b.liefertermin ?? '9999', {
      id: 'liefertermin',
      header: t('einkauf.spalte.liefertermin'),
      cell: (c) => {
        const b = c.row.original
        if (!b.liefertermin) return '–'
        return <Badge ton={b.ueberfaellig ? 'kritisch' : 'neutral'}>{formatDatum(b.liefertermin)}</Badge>
      },
    }),
    spalte.accessor((b) => (b.menge_total ? b.menge_geliefert / b.menge_total : 0), {
      id: 'geliefert',
      header: t('einkauf.spalte.geliefert'),
      cell: (c) => {
        const b = c.row.original
        if (!['bestellt', 'teilgeliefert', 'geliefert'].includes(b.status)) return '–'
        return (
          <span className="zahlen text-sm">
            {formatMenge(b.menge_geliefert)} / {formatMenge(b.menge_total)}
          </span>
        )
      },
      meta: { nurBreit: true },
    }),
    spalte.accessor((b) => b.total_rappen ?? 0, {
      id: 'total',
      header: t('einkauf.spalte.total'),
      cell: (c) => <span className="zahlen">{c.getValue() ? formatChf(c.getValue()) : '–'}</span>,
      meta: { nurBreit: true },
    }),
    spalte.accessor('status', {
      header: t('einkauf.spalte.status'),
      cell: (c) => {
        const a = status(c.getValue())
        const mail = c.row.original.mail_status
        return (
          <span className="flex flex-wrap items-center gap-1">
            <Badge ton={tonVonFarbe(a.farbe)} punkt>
              {a.text}
            </Badge>
            {c.getValue() === 'freigegeben' && mail && mail !== 'gesendet' && mail !== 'verworfen' && (
              <Badge ton={mail === 'fehler' ? 'kritisch' : 'info'}>{t(`einkauf.mail.${mail}`)}</Badge>
            )}
          </span>
        )
      },
    }),
  ])
}
