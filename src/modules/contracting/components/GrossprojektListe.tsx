import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { useGrossprojekte } from '../hooks/useGrossprojekte'
import { inAnsicht } from '../lib/anzeige'
import type { Ansicht, ContractingArt, Grossprojekt } from '../types'
import { grossprojektSpalten } from './spalten'

type ArtFilter = 'alle' | ContractingArt

/**
 * Liste eines Reiters, die besten zuerst. Filter nach Contracting-Art (PV, Wärme, beides). Ausgeschlossene
 * (Einfamilienhaus, zu weit, geschützt) stehen nur unter «Alle», damit «Prüfen» kurz bleibt.
 */
export function GrossprojektListe({
  ansicht,
  aktiveId,
  onOeffnen,
}: {
  ansicht: Ansicht
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const daten = useGrossprojekte()
  const [art, setArt] = useState<ArtFilter>('alle')
  const imReiter = (daten.data ?? []).filter(
    (g) => inAnsicht(g, ansicht) && (ansicht === 'alle' || !g.ausschluss || g.stand !== 'pruefen'),
  )
  const passt = (g: Grossprojekt, a: ArtFilter) => a === 'alle' || g.art === a || (a !== 'beides' && g.art === 'beides')
  const liste = imReiter.filter((g) => passt(g, art))

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('grossprojekte.filter')}
        optionen={(['alle', 'pv', 'waerme', 'beides'] as const).map((a) => ({
          wert: a,
          text: t(`grossprojekte.filterwert.${a}`),
          anzahl: imReiter.filter((g) => passt(g, a)).length,
        }))}
        gewaehlt={[art]}
        onChange={([a]) => {
          if (a) setArt(a as ArtFilter)
        }}
      />
      <Datentabelle
        daten={liste}
        spalten={grossprojektSpalten(t)}
        kennung={(g) => g.id}
        aktiveId={aktiveId}
        onOeffnen={(g) => {
          onOeffnen(g.id)
        }}
        laedt={daten.isPending}
        fehler={daten.error}
        onNochmal={() => void daten.refetch()}
        beschriftung={t(`grossprojekte.reiter.${ansicht}`)}
        leer={
          <Leerzustand
            icon={Building2}
            titel={t(`grossprojekte.leer.${ansicht}`)}
            text={t('grossprojekte.leer.text')}
          />
        }
      />
    </div>
  )
}
