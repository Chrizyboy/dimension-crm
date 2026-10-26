import { Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { useAnmeldung } from '@/stores/anmeldung'
import { useFahrzeuge, useNamen } from '../hooks/useRessourcen'
import { heuteZuerich, istFaellig } from '../lib/fristen'
import type { Fahrzeug } from '../types'
import { fahrzeugSpalten } from './fahrzeugSpalten'

type Filter = 'alle' | 'meine' | 'faellig'

/** Fahrzeuge als Liste; Filter «Meine» und «Fällig». Klick öffnet die Akte. */
export function FahrzeugListe({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const daten = useFahrzeuge()
  const namen = useNamen()
  const [filter, setFilter] = useState<Filter>('alle')
  const heute = heuteZuerich()
  const alle = daten.data ?? []
  const passt = (f: Fahrzeug, x: Filter) =>
    x === 'alle' || (x === 'meine' ? f.person_id === ich?.id : istFaellig(f, heute))
  const liste = alle.filter((f) => passt(f, filter))
  const spalten = fahrzeugSpalten(t, namen.person)

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('fuhrpark.filter')}
        optionen={(['alle', 'meine', 'faellig'] as const).map((x) => ({
          wert: x,
          text: t(`fuhrpark.filterwert.${x}`),
          anzahl: alle.filter((f) => passt(f, x)).length,
        }))}
        gewaehlt={[filter]}
        onChange={([x]) => {
          if (x) setFilter(x as Filter)
        }}
      />
      <Datentabelle
        daten={liste}
        spalten={spalten}
        kennung={(f) => f.id}
        aktiveId={aktiveId}
        onOeffnen={(f) => {
          onOeffnen(f.id)
        }}
        laedt={daten.isPending}
        fehler={daten.error}
        onNochmal={() => void daten.refetch()}
        beschriftung={t('fuhrpark.reiter.fahrzeuge')}
        leer={<Leerzustand icon={Truck} titel={t('fuhrpark.leer.fahrzeuge')} text={t('fuhrpark.leer.fahrzeugeText')} />}
      />
    </div>
  )
}
