import { Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { REITER, type Reiter as ReiterTyp } from '../types'
import { AnlagenListe } from './AnlagenListe'
import { FallAkte } from './FallAkte'
import { FallDialog } from './FallDialog'
import { FallListe } from './FallListe'

/**
 * Service & Garantie (V233 «Service»): Fälle S001 … mit Kategorie, Priorität, Stand, Garantie, Verlauf und
 * Anhängen; dazu die Anlage-Daten aller gebauten Anlagen. Offener Fall in der Adresse (#/aftersales?fall=…).
 */
export default function Service({
  reiter,
  fallId,
  onNavigation,
}: {
  reiter: ReiterTyp
  fallId: string | null
  onNavigation: (z: { reiter?: ReiterTyp; fall?: string | null }) => void
}) {
  const { t } = useTranslation()
  const [neu, setNeu] = useState(false)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Wrench} titel={t('service.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('service.titel')}
        beschreibung={t('service.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setNeu(true)
            }}
          >
            <Plus />
            {t('service.neu')}
          </Button>
        }
      />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, fall: null })
        }}
      >
        <ReiterListe>
          {REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`service.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="faelle" className="pt-4">
          <FallListe
            aktiveId={fallId}
            onOeffnen={(id) => {
              onNavigation({ fall: id })
            }}
          />
        </ReiterInhalt>
        <ReiterInhalt value="anlagen" className="pt-4">
          <AnlagenListe />
        </ReiterInhalt>
      </Reiter>
      {fallId && (
        <FallAkte
          key={fallId}
          id={fallId}
          onSchliessen={() => {
            onNavigation({ fall: null })
          }}
        />
      )}
      {neu && (
        <FallDialog
          onSchliessen={() => {
            setNeu(false)
          }}
          onErfasst={(id) => {
            setNeu(false)
            onNavigation({ reiter: 'faelle', fall: id })
          }}
        />
      )}
    </div>
  )
}
