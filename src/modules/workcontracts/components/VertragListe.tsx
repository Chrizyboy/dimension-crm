import { FileSignature } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { BetragZelle, DatumZelle, EinzeilerZelle, NameZelle, NummerZelle, unterzeile } from '@/components/shared/Zellen'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { formatChf } from '@/lib/format'
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
      cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
      sortFn: (a, b) => a.original.nummer.localeCompare(b.original.nummer, 'de-CH', { numeric: true }),
      meta: { breite: 'w-20' },
    }),
    spalte.accessor('name', {
      header: t('werkvertraege.spalte.kunde'),
      sortFn: (a, b) => a.original.name.localeCompare(b.original.name, 'de-CH'),
      cell: (c) => {
        const w = c.row.original
        return (
          <NameZelle
            name={c.getValue()}
            unter={
              <>
                <span className="md:hidden">
                  {unterzeile(w.objekt.ort, w.betragRappen ? formatChf(w.betragRappen) : null)}
                </span>
                <span className="max-md:hidden">{unterzeile(w.kwp ? `${w.kwp} kWp` : null, w.batterie)}</span>
              </>
            }
          />
        )
      },
    }),
    spalte.accessor((w) => w.objekt.ort ?? '', {
      id: 'ort',
      header: t('werkvertraege.spalte.ort'),
      cell: (c) => (
        <EinzeilerZelle>{[c.row.original.objekt.plz, c.getValue()].filter(Boolean).join(' ') || '–'}</EinzeilerZelle>
      ),
      meta: { nurBreit: true },
    }),
    spalte.accessor((w) => w.betragRappen ?? 0, {
      id: 'betrag',
      header: t('werkvertraege.spalte.betrag'),
      sortDescFirst: true,
      cell: (c) => <BetragZelle rappen={c.getValue() || null} />,
      meta: { nurBreit: true, zahl: true, breite: 'w-28' },
    }),
    spalte.accessor((w) => w.unterschriebenAm ?? w.erstelltDatum ?? '', {
      id: 'datum',
      header: t('werkvertraege.spalte.datum'),
      sortDescFirst: true,
      cell: (c) => <DatumZelle wert={c.getValue()} />,
      meta: { nurBreit: true, breite: 'w-28' },
    }),
    spalte.accessor('kundennummer', {
      header: t('werkvertraege.spalte.kd'),
      cell: (c) => <NummerZelle>{formatKundennummer(c.getValue())}</NummerZelle>,
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
