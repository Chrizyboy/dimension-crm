import { ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { useRapporte } from '../hooks/useBaustelle'
import { RAPPORT_FILTER, type RapportFilter } from '../types'
import { NeuerRapportDialog } from './NeuerRapportDialog'
import { rapportSpalten } from './rapportSpalten'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'

/** Alle Rapporte fürs Büro: offen, abgeschlossen, alle; Suche nach Kunde, Projekt, Ort, Monteur. */
export function RapportListe({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<RapportFilter>('offen')
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState(false)
  const liste = useRapporte(filter)
  const spalten = useMemo(() => rapportSpalten(t), [t])
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (r) =>
        !s ||
        `${r.nummer} ${r.kunde ?? ''} ${r.projekt_nummer ?? ''} ${r.service_nummer ?? ''} ${r.objekt_ort ?? ''} ${r.person ?? ''}`
          .toLowerCase()
          .includes(s),
    )
  }, [liste.data, suche])

  return (
    <div className="flex flex-col gap-3">
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('baustelle.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={
          <>
            <Button
              onClick={() => {
                setNeu(true)
              }}
            >
              <Plus />
              {t('baustelle.neu.knopf')}
            </Button>
          </>
        }
      >
        <Filterchips
          einzeln
          beschriftung={t('baustelle.filter')}
          optionen={RAPPORT_FILTER.map((f) => ({ wert: f, text: t(`baustelle.rapportFilter.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as RapportFilter)
          }}
        />
      </Werkzeugleiste>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(r) => r.id}
          aktiveId={aktiveId}
          onOeffnen={(r) => {
            onOeffnen(r.id)
          }}
          beschriftung={t('baustelle.reiter.rapporte')}
          leer={<Leerzustand icon={ClipboardList} titel={t('baustelle.leer')} text={t('baustelle.leerText')} />}
        />
      )}
      {neu && (
        <NeuerRapportDialog
          onSchliessen={() => {
            setNeu(false)
          }}
          onAngelegt={(id) => {
            setNeu(false)
            onOeffnen(id)
          }}
        />
      )}
    </div>
  )
}
