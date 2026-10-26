import { Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAnmeldung } from '@/stores/anmeldung'
import { useGeraete, useNamen } from '../hooks/useRessourcen'
import { fristStand, heuteZuerich } from '../lib/fristen'
import type { Geraet } from '../types'
import { geraetSpalten } from './geraetSpalten'

type Filter = 'alle' | 'meine' | 'faellig' | 'defekt'

/** Geräte als Liste; Filter «Bei mir», «Prüfung fällig», «Defekt oder Mängel». Klick öffnet die Akte. */
export function GeraeteListe({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const daten = useGeraete()
  const namen = useNamen()
  const art = useAuswahl('geraeteart')
  const [filter, setFilter] = useState<Filter>('alle')
  const heute = heuteZuerich()
  const alle = daten.data ?? []
  const passt = (g: Geraet, x: Filter) =>
    x === 'alle' ||
    (x === 'meine'
      ? g.person_id === ich?.id
      : x === 'faellig'
        ? g.zustand !== 'ausser_betrieb' && fristStand(g.naechste_pruefung, heute) !== 'ok'
        : g.zustand === 'defekt' || g.zustand === 'maengel')
  const liste = alle.filter((g) => passt(g, filter))
  const wo = (g: Geraet) =>
    g.person_id ? namen.person(g.person_id) : g.fahrzeug_id ? namen.fahrzeug(g.fahrzeug_id) : t('fuhrpark.lager')
  const spalten = geraetSpalten(t, art.text, wo)

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('fuhrpark.filter')}
        optionen={(['alle', 'meine', 'faellig', 'defekt'] as const).map((x) => ({
          wert: x,
          text: t(`fuhrpark.filterwert.${x === 'meine' ? 'beiMir' : x}`),
          anzahl: alle.filter((g) => passt(g, x)).length,
        }))}
        gewaehlt={[filter]}
        onChange={([x]) => {
          if (x) setFilter(x as Filter)
        }}
      />
      <Datentabelle
        daten={liste}
        spalten={spalten}
        kennung={(g) => g.id}
        aktiveId={aktiveId}
        onOeffnen={(g) => {
          onOeffnen(g.id)
        }}
        laedt={daten.isPending}
        fehler={daten.error}
        onNochmal={() => void daten.refetch()}
        beschriftung={t('fuhrpark.reiter.geraete')}
        leer={<Leerzustand icon={Wrench} titel={t('fuhrpark.leer.geraete')} text={t('fuhrpark.leer.geraeteText')} />}
      />
    </div>
  )
}
