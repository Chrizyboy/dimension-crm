import { FilePlus2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { formatChf } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { useNachtraege } from '../hooks/useBaustelle'
import { nachtragTon } from '../lib/anzeige'
import { NACHTRAG_FILTER, type Nachtrag, type NachtragFilter } from '../types'
import { NachtragDialog } from './NachtragDialog'
import { DatumZelle, NummerZelle } from '@/components/shared/Zellen'

const spalte = spaltenHelfer<Nachtrag>()

/** Nachträge (Regie) fürs Büro: Betrag setzen, bestätigen oder ablehnen. Verrechnet wird in Phase 10. */
export function Nachtraege({ onRapport }: { onRapport: (id: string) => void }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<NachtragFilter>('offen')
  const [offen, setOffen] = useState<Nachtrag | null>(null)
  const liste = useNachtraege(filter)
  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor('nummer', {
          header: t('baustelle.spalte.nummer'),
          cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
          meta: { breite: 'w-16' },
        }),
        spalte.accessor('erstellt_am', {
          header: t('baustelle.spalte.datum'),
          cell: (c) => <DatumZelle wert={c.getValue()} />,
        }),
        spalte.accessor((n) => n.kunde ?? '', {
          id: 'kunde',
          header: t('baustelle.spalte.kunde'),
          cell: (c) => (
            <span className="flex max-w-[16rem] min-w-0 flex-col">
              <span className="line-clamp-2 font-medium">{c.getValue() || '–'}</span>
              <span className="text-muted-foreground truncate text-xs">
                {[c.row.original.projekt_nummer, c.row.original.rapport_nummer].filter(Boolean).join(' · ')}
              </span>
            </span>
          ),
        }),
        spalte.accessor('beschreibung', {
          header: t('baustelle.nachtrag.beschreibung'),
          cell: (c) => <span className="line-clamp-2 max-w-[26rem]">{c.getValue()}</span>,
        }),
        spalte.accessor((n) => n.stunden ?? 0, {
          id: 'stunden',
          header: t('baustelle.nachtrag.stunden'),
          cell: (c) => <span className="zahlen">{c.getValue() || '–'}</span>,
          meta: { nurBreit: true },
        }),
        spalte.accessor((n) => n.betrag_rappen ?? -1, {
          id: 'betrag',
          header: t('baustelle.nachtrag.betrag'),
          cell: (c) => <span className="zahlen">{c.getValue() >= 0 ? formatChf(c.getValue()) : '–'}</span>,
        }),
        spalte.accessor('status', {
          header: t('baustelle.spalte.stand'),
          cell: (c) => (
            <Badge ton={nachtragTon(c.getValue())} punkt>
              {t(`baustelle.nachtrag.status.${c.getValue()}`)}
            </Badge>
          ),
        }),
      ]),
    [t],
  )

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('baustelle.filter')}
        optionen={NACHTRAG_FILTER.map((f) => ({
          wert: f,
          text: f === 'alle' ? t('baustelle.rapportFilter.alle') : t(`baustelle.nachtrag.status.${f}`),
        }))}
        gewaehlt={[filter]}
        onChange={([f]) => {
          if (f) setFilter(f as NachtragFilter)
        }}
      />
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={liste.data ?? []}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(n) => n.id}
          aktiveId={offen?.id ?? null}
          onOeffnen={setOffen}
          beschriftung={t('baustelle.reiter.nachtraege')}
          leer={
            <Leerzustand
              icon={FilePlus2}
              titel={t('baustelle.nachtrag.leer')}
              text={t('baustelle.nachtrag.leerText')}
            />
          }
        />
      )}
      {offen && (
        <NachtragDialog
          nachtrag={offen}
          onRapport={onRapport}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
