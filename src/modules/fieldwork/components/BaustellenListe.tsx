import { HardHat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Leerzustand } from '@/components/shared/Zustaende'
import { useBaustellen } from '../hooks/useLeitung'
import { baustellenSpalten } from './baustellenSpalten'

/** Alle Baustellen der letzten und nächsten Wochen; ein Klick öffnet die Baustellen-Akte. */
export function BaustellenListe({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const liste = useBaustellen()
  const [suche, setSuche] = useState('')
  const spalten = useMemo(() => baustellenSpalten(t), [t])
  const s = suche.trim().toLowerCase()
  const daten = (liste.data ?? []).filter(
    (b) => !s || [b.nummer, b.kunde, b.ort].some((x) => x?.toLowerCase().includes(s)),
  )

  return (
    <div className="flex flex-col gap-3">
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('baustelle.akte.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
      />
      <Datentabelle
        daten={daten}
        spalten={spalten}
        laedt={liste.isPending}
        fehler={liste.error}
        onNochmal={() => void liste.refetch()}
        kennung={(b) => b.projekt_id}
        aktiveId={aktiveId}
        onOeffnen={(b) => {
          onOeffnen(b.projekt_id)
        }}
        beschriftung={t('baustelle.reiter.baustellen')}
        leer={<Leerzustand icon={HardHat} titel={t('baustelle.akte.leer')} text={t('baustelle.akte.leerText')} />}
      />
    </div>
  )
}
