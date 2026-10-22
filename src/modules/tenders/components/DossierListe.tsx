import { SearchCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useDossiers } from '../hooks/useAusschreibungen'
import { LISTEN_FILTER, type ListenFilter } from '../types'
import { dossierSpalten } from './dossierSpalten'

/**
 * Liste der Dossiers. «Prüfen» zeigt, was einen Entscheid braucht (neu, Kontakt fehlt, Antwort da);
 * «Alle» lässt nach Spur filtern. Ein Klick öffnet die Akte.
 */
export function DossierListe({
  ansicht,
  aktiveId,
  onOeffnen,
}: {
  ansicht: 'pruefen' | 'alle'
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<ListenFilter>('offen')
  const liste = useDossiers(ansicht === 'pruefen' ? 'pruefen' : filter)
  const spalten = useMemo(() => dossierSpalten(t), [t])

  return (
    <div className="flex flex-col gap-3">
      {ansicht === 'alle' && (
        <Filterchips
          einzeln
          beschriftung={t('ausschreibungen.filter')}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as ListenFilter)
          }}
          optionen={LISTEN_FILTER.map((f) => ({ wert: f, text: t(`ausschreibungen.filterwert.${f}`) }))}
        />
      )}
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : liste.isPending ? (
        <Skelett className="h-96" />
      ) : (
        <Datentabelle
          daten={liste.data}
          spalten={spalten}
          kennung={(d) => d.id}
          aktiveId={aktiveId}
          onOeffnen={(d) => {
            onOeffnen(d.id)
          }}
          beschriftung={t('ausschreibungen.titel')}
          leer={
            <Leerzustand
              icon={SearchCheck}
              titel={t(ansicht === 'pruefen' ? 'ausschreibungen.leerPruefen' : 'ausschreibungen.leer')}
              text={t('ausschreibungen.leerText')}
            />
          }
        />
      )}
    </div>
  )
}
