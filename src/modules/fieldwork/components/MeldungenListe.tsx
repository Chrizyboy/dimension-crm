import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { useMeldungen } from '../hooks/useLeitung'
import { MELDUNG_ARTEN } from '../types'
import { MeldungZeileAnzeige } from './MeldungZeileAnzeige'

/** Alle Meldungen von den Baustellen: offene zuerst, Filter nach Art; erledigen mit Notiz. */
export function MeldungenListe() {
  const { t } = useTranslation()
  const [stand, setStand] = useState<'offen' | 'alle'>('offen')
  const [arten, setArten] = useState<string[]>([])
  const liste = useMeldungen(stand === 'offen')
  const daten = (liste.data ?? []).filter((m) => arten.length === 0 || arten.includes(m.art))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Filterchips
          einzeln
          beschriftung={t('baustelle.meldung.stand')}
          optionen={[
            { wert: 'offen', text: t('baustelle.meldung.offen') },
            { wert: 'alle', text: t('baustelle.meldung.alle90') },
          ]}
          gewaehlt={[stand]}
          onChange={(w) => {
            setStand(w[0] === 'alle' ? 'alle' : 'offen')
          }}
        />
        <Filterchips
          beschriftung={t('baustelle.meldung.art')}
          optionen={MELDUNG_ARTEN.map((a) => ({
            wert: a,
            text: t(`baustelle.meldung.arten.${a}`),
            anzahl: (liste.data ?? []).filter((m) => m.art === a).length,
          }))}
          gewaehlt={arten}
          onChange={setArten}
        />
      </div>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : liste.isPending ? (
        <Skelett className="h-64" />
      ) : daten.length === 0 ? (
        <Leerzustand icon={CheckCircle2} titel={t('baustelle.meldung.leer')} text={t('baustelle.meldung.leerText')} />
      ) : (
        <Karte className="flex flex-col gap-2 p-4">
          {daten.map((m) => (
            <MeldungZeileAnzeige key={m.id} m={m} />
          ))}
        </Karte>
      )}
    </div>
  )
}
