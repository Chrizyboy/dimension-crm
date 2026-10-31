import { FileSignature } from 'lucide-react'
import { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { supabase } from '@/services/supabase'
import { useVertraege } from '../hooks/useWerkvertraege'
import { passt } from '../lib/status'
import { WERKVERTRAG_STATUS } from '../types'

const VertragListe = lazy(() => import('./VertragListe'))
const VertragAkte = lazy(() => import('./VertragAkte'))
const AuftragDialog = lazy(() => import('./AuftragDialog'))

export interface WerkvertraegeProps {
  /** Offener Werkvertrag aus der Adresse (?vertrag=…). */
  vertragId: string | null
  /** «Auftrag erstellen» für diese Offerte (?auftrag=…), kommt aus «Offerten» nach «Angenommen». */
  auftragOfferteId: string | null
  onAdresse: (a: { vertrag?: string | null; auftrag?: string | null }) => void
}

/**
 * «Werkverträge» (V232, V233 wvPdf): alle Verträge mit Stand und Suche; aus einer angenommenen Offerte
 * entsteht hier der Auftrag mit Zahlungsplan und Werkvertrag in der Sprache des Standorts.
 */
export default function Werkvertraege({ vertragId, auftragOfferteId, onAdresse }: WerkvertraegeProps) {
  const { t } = useTranslation()
  const vertraege = useVertraege()
  const [suche, setSuche] = useState('')
  const [stand, setStand] = useState<string[]>([])
  const s = useDeferredValue(suche)
  const gefunden = useMemo(() => (vertraege.data ?? []).filter((w) => passt(w.suchtext, s)), [vertraege.data, s])
  const sichtbar = useMemo(
    () => gefunden.filter((w) => stand.length === 0 || stand.includes(w.status)),
    [gefunden, stand],
  )

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={FileSignature} titel={t('werkvertraege.vorschau')} text={t('werkvertraege.vorschauText')} />
      </div>
    )
  }

  const offen = vertragId ? (vertraege.data ?? []).find((w) => w.id === vertragId) : undefined

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('werkvertraege.titel')} beschreibung={t('werkvertraege.beschreibung')} />
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('werkvertraege.suche')}
            placeholder={t('werkvertraege.sucheHinweis')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
      >
        <Filterchips
          beschriftung={t('werkvertraege.spalte.status')}
          gewaehlt={stand}
          onChange={setStand}
          optionen={WERKVERTRAG_STATUS.map((x) => ({
            wert: x,
            text: t(`werkvertraege.status.${x}`),
            anzahl: gefunden.filter((w) => w.status === x).length,
          })).filter((o) => o.anzahl > 0)}
        />
      </Werkzeugleiste>

      {vertraege.error ? (
        <Fehlerzustand details={String(vertraege.error)} onNochmal={() => void vertraege.refetch()} />
      ) : vertraege.isPending ? (
        <Skelett className="h-96" />
      ) : (
        <Suspense fallback={<Skelett className="h-96" />}>
          <VertragListe
            vertraege={sichtbar}
            aktiveId={vertragId}
            onOeffnen={(id) => {
              onAdresse({ vertrag: id })
            }}
          />
        </Suspense>
      )}

      <Suspense>
        {vertragId && (
          <VertragAkte
            vertrag={offen ?? null}
            onNeuErstellen={(offerteId) => {
              onAdresse({ vertrag: null, auftrag: offerteId })
            }}
            onSchliessen={() => {
              onAdresse({ vertrag: null })
            }}
          />
        )}
        {auftragOfferteId && (
          <AuftragDialog
            offerteId={auftragOfferteId}
            onSchliessen={(neuerVertrag) => {
              onAdresse({ auftrag: null, vertrag: neuerVertrag })
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
