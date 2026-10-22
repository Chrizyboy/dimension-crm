import { FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { spaltenHelfer } from '@/lib/tabelle'
import { inListe } from '../lib/suche'
import { OFFERT_STAENDE } from '../lib/status'
import type { Offerte } from '../types'
import { NachfassChip, OffertStand } from './OffertStand'

const spalte = spaltenHelfer<Offerte>()

/**
 * Offerten Muri bzw. Bulle (V45, V185): Nr, Name, Ort, Datum, Kd-Nr, Nachfassen und Stand,
 * Filter nach Stand mit Zahl. Neueste Nummer zuoberst, jede Spalte sortierbar.
 */
export default function OffertListe({
  standort,
  offerten,
  aktiveId,
  onOeffnen,
}: {
  standort: 'muri' | 'bulle'
  offerten: Offerte[]
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const staende = useAuswahl('kundenstand')
  const [stand, setStand] = useState<string[]>([])
  const hier = useMemo(() => offerten.filter((o) => inListe(o, standort)), [offerten, standort])
  const sichtbar = useMemo(() => hier.filter((o) => stand.length === 0 || stand.includes(o.stand)), [hier, stand])

  const spalten = spalte.columns([
    spalte.accessor('nummer', {
      header: t('offerten.spalte.nr'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue()}</span>,
      sortFn: (a, b) => a.original.nummer.localeCompare(b.original.nummer, 'de-CH', { numeric: true }),
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('name', {
      header: t('offerten.spalte.name'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => (
        <span className="flex max-w-[16rem] min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            {[c.row.original.titel, c.row.original.betragRappen ? formatChf(c.row.original.betragRappen) : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor('ort', {
      header: t('offerten.spalte.ort'),
      cell: (c) => [c.row.original.plz, c.getValue()].filter(Boolean).join(' ') || '–',
      meta: { nurBreit: true },
    }),
    spalte.accessor((o) => o.angebotAm ?? '', {
      id: 'datum',
      header: t('offerten.spalte.datum'),
      sortDescFirst: true,
      cell: (c) => (
        <span className="zahlen font-mono text-[13px]">{c.getValue() ? formatDatum(c.getValue()) : '–'}</span>
      ),
      meta: { nurBreit: true, breite: 'w-28' },
    }),
    spalte.accessor('kundennummer', {
      header: t('offerten.spalte.kunde'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{formatKundennummer(c.getValue())}</span>,
      meta: { nurBreit: true, breite: 'w-20' },
    }),
    spalte.accessor((o) => o.faelligAm ?? '9999', {
      id: 'nachfassen',
      header: t('offerten.spalte.nachfassen'),
      cell: (c) => <NachfassChip offerte={c.row.original} />,
      meta: { nurBreit: true },
    }),
    spalte.accessor((o) => OFFERT_STAENDE.indexOf(o.stand as (typeof OFFERT_STAENDE)[number]), {
      id: 'stand',
      header: t('offerten.spalte.status'),
      cell: (c) => <OffertStand stand={c.row.original.stand} />,
    }),
  ])

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        beschriftung={t('offerten.spalte.status')}
        gewaehlt={stand}
        onChange={setStand}
        optionen={OFFERT_STAENDE.map((s) => ({
          wert: s,
          text: staende.text(s),
          anzahl: hier.filter((o) => o.stand === s).length,
        })).filter((o) => o.anzahl > 0)}
      />
      <Datentabelle
        daten={sichtbar}
        spalten={spalten}
        kennung={(o) => o.id}
        aktiveId={aktiveId}
        sortierung={[{ id: 'nummer', desc: true }]}
        onOeffnen={(o) => {
          onOeffnen(o.id)
        }}
        beschriftung={t(`offerten.ansicht.${standort}`)}
        leer={<Leerzustand icon={FileText} titel={t('offerten.liste.leer')} text={t('offerten.liste.leerText')} />}
      />
    </div>
  )
}
