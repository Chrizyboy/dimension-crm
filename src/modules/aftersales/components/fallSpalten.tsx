import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { ServiceFall } from '../types'

const spalte = spaltenHelfer<ServiceFall>()
type Text = (liste: string, wert: string | null) => { text: string; farbe: string | null }

/** Spalten der Fall-Liste: Nummer, Fall, Kunde, Kategorie, Priorität, Status, Termin. */
export function fallSpalten(t: TFunction, auswahl: Text): Spalten<ServiceFall> {
  return spalte.columns([
    spalte.accessor('nummer', {
      header: t('service.spalte.nummer'),
      cell: (c) => <span className="zahlen font-mono text-xs">{c.getValue()}</span>,
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('titel', {
      header: t('service.spalte.fall'),
      cell: (c) => (
        <span className="flex max-w-[22rem] min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            {[c.row.original.kunde, c.row.original.ort].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor((f) => auswahl('servicekategorie', f.kategorie).text, {
      id: 'kategorie',
      header: t('service.spalte.kategorie'),
      cell: (c) => (
        <span className="flex flex-wrap gap-1">
          {c.getValue()}
          {c.row.original.garantie && <Badge ton="info">{t('service.garantie')}</Badge>}
        </span>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((f) => ({ hoch: 0, normal: 1, tief: 2 })[f.prioritaet ?? 'normal'] ?? 1, {
      id: 'prio',
      header: t('service.spalte.prio'),
      cell: (c) => {
        const a = auswahl('prioritaet', c.row.original.prioritaet)
        return <Badge ton={tonVonFarbe(a.farbe)}>{a.text}</Badge>
      },
    }),
    spalte.accessor('status', {
      header: t('service.spalte.status'),
      cell: (c) => {
        const a = auswahl('servicestatus', c.getValue())
        return (
          <Badge ton={tonVonFarbe(a.farbe)} punkt>
            {a.text}
          </Badge>
        )
      },
    }),
    spalte.accessor((f) => f.termin_am ?? '', {
      id: 'termin',
      header: t('service.spalte.termin'),
      cell: (c) => (c.getValue() ? formatDatum(c.getValue()) : '–'),
      meta: { nurBreit: true },
    }),
  ])
}
