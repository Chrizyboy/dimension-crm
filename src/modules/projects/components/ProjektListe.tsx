import { FolderKanban } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { useProjekte } from '../hooks/useProjekte'
import type { ProjektStatus } from '../types'
import { projektSpalten } from './projektSpalten'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'

const ALLE: ProjektStatus[] = ['auftrag', 'im_bau', 'abgeschlossen']

/** Alle Projekte als Liste mit Filter nach Status und Suche nach Kunde, Nummer oder Ort. */
export function ProjektListe({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const liste = useProjekte(ALLE)
  const [status, setStatus] = useState<string[]>(['auftrag', 'im_bau'])
  const [suche, setSuche] = useState('')
  const spalten = useMemo(() => projektSpalten(t), [t])
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? [])
      .filter((p) => status.length === 0 || status.includes(p.status))
      .filter((p) => !s || `${p.kunde} ${p.nummer} ${p.ort ?? ''} ${p.plz ?? ''}`.toLowerCase().includes(s))
  }, [liste.data, status, suche])

  return (
    <div className="flex flex-col gap-3">
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('projekte.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
      >
        <Filterchips
          beschriftung={t('projekte.spalte.status')}
          optionen={ALLE.map((s) => ({
            wert: s,
            text: t(`projekte.status.${s}`),
            anzahl: (liste.data ?? []).filter((p) => p.status === s).length,
          }))}
          gewaehlt={status}
          onChange={setStatus}
        />
      </Werkzeugleiste>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(p) => p.id}
          aktiveId={aktiveId}
          sortierung={[{ id: 'nummer', desc: true }]}
          onOeffnen={(p) => {
            onOeffnen(p.id)
          }}
          beschriftung={t('projekte.reiter.alle')}
          leer={<Leerzustand icon={FolderKanban} titel={t('projekte.leer')} text={t('projekte.leerText')} />}
        />
      )}
    </div>
  )
}
