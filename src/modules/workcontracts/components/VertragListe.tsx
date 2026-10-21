import { FileSignature } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { spaltenHelfer } from '@/lib/tabelle'
import { VERTRAG_TON } from '../lib/status'
import { WERKVERTRAG_STATUS, type Werkvertrag } from '../types'

const spalte = spaltenHelfer<Werkvertrag>()

/** Liste der Werkverträge: Nr, Kunde, Ort, Betrag inkl. MWST, Datum, Kd-Nr und Stand. */
export default function VertragListe({
  vertraege,
  aktiveId,
  onOeffnen,
}: {
  vertraege: Werkvertrag[]
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const spalten = spalte.columns([
    spalte.accessor('nummer', {
      header: t('werkvertraege.spalte.nr'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue()}</span>,
      sortFn: (a, b) => a.original.nummer.localeCompare(b.original.nummer, 'de-CH', { numeric: true }),
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('name', {
      header: t('werkvertraege.spalte.kunde'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => (
        <span className="flex max-w-[18rem] min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            {[c.row.original.kwp ? `${c.row.original.kwp} kWp` : null, c.row.original.batterie]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor((w) => w.objekt.ort ?? '', {
      id: 'ort',
      header: t('werkvertraege.spalte.ort'),
      cell: (c) => [c.row.original.objekt.plz, c.getValue()].filter(Boolean).join(' ') || '–',
      meta: { nurBreit: true },
    }),
    spalte.accessor((w) => w.betragRappen ?? 0, {
      id: 'betrag',
      header: t('werkvertraege.spalte.betrag'),
      sortDescFirst: true,
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue() ? formatChf(c.getValue()) : '–'}</span>,
      meta: { nurBreit: true, breite: 'w-28' },
    }),
    spalte.accessor((w) => w.unterschriebenAm ?? w.erstelltDatum ?? '', {
      id: 'datum',
      header: t('werkvertraege.spalte.datum'),
      sortDescFirst: true,
      cell: (c) => (
        <span className="zahlen font-mono text-[13px]">{c.getValue() ? formatDatum(c.getValue()) : '–'}</span>
      ),
      meta: { nurBreit: true, breite: 'w-28' },
    }),
    spalte.accessor('kundennummer', {
      header: t('werkvertraege.spalte.kd'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{formatKundennummer(c.getValue())}</span>,
      meta: { nurBreit: true, breite: 'w-20' },
    }),
    spalte.accessor((w) => WERKVERTRAG_STATUS.indexOf(w.status), {
      id: 'status',
      header: t('werkvertraege.spalte.status'),
      cell: (c) => (
        <Badge ton={VERTRAG_TON[c.row.original.status]} punkt>
          {t(`werkvertraege.status.${c.row.original.status}`)}
        </Badge>
      ),
    }),
  ])

  return (
    <Datentabelle
      daten={vertraege}
      spalten={spalten}
      kennung={(w) => w.id}
      aktiveId={aktiveId}
      sortierung={[{ id: 'nummer', desc: true }]}
      onOeffnen={(w) => {
        onOeffnen(w.id)
      }}
      beschriftung={t('werkvertraege.titel')}
      leer={<Leerzustand icon={FileSignature} titel={t('werkvertraege.leer')} text={t('werkvertraege.leerText')} />}
    />
  )
}
