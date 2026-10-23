import { Plus, ShieldCheck, Workflow } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useKatalog } from '../hooks/useAutomationen'
import type { Ansicht, Automation } from '../types'
import { NEU, type Entwurf } from '../lib/entwurf'
import { AutomationEditor } from './AutomationEditor'
import { AutomationsListe } from './AutomationsListe'
import { Einstellungen } from './Einstellungen'
import { Protokoll } from './Protokoll'

interface Props {
  ansicht: Ansicht
  automationId: string | null
  onAdresse: (a: { ansicht: Ansicht; automation?: string | null }) => void
}

/**
 * Automationen (Phase 12): Abläufe «wenn … dann …», die der Server alle paar Minuten abarbeitet.
 * Was nach aussen geht, landet als Entwurf im Ausgangskorb, ausser eine Automation steht auf «automatisch».
 * #/automations?ansicht=protokoll&automation=…
 */
export default function Automationen({ ansicht, automationId, onAdresse }: Props) {
  const { t } = useTranslation()
  const katalog = useKatalog()
  const [bearbeiten, setBearbeiten] = useState<Entwurf | null>(null)
  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Workflow} titel={t('automationen.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('automationen.titel')}
        beschreibung={t('automationen.beschreibung')}
        aktionen={
          <Button
            disabled={!katalog.data}
            onClick={() => {
              setBearbeiten({ ...NEU })
            }}
          >
            <Plus />
            {t('automationen.neu')}
          </Button>
        }
      />
      <p className="bg-info-soft text-info flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('automationen.regel')}
      </p>
      <Reiter
        value={ansicht}
        onValueChange={(a) => {
          onAdresse({ ansicht: a as Ansicht })
        }}
      >
        <ReiterListe>
          <ReiterKnopf value="liste">{t('automationen.ansicht.liste')}</ReiterKnopf>
          <ReiterKnopf value="protokoll">{t('automationen.ansicht.protokoll')}</ReiterKnopf>
          <ReiterKnopf value="einstellungen">{t('automationen.ansicht.einstellungen')}</ReiterKnopf>
        </ReiterListe>
        <ReiterInhalt value="liste" className="pt-4">
          {ansicht === 'liste' && (
            <AutomationsListe
              onBearbeiten={(a: Automation) => {
                setBearbeiten(a)
              }}
              onLaeufe={(a) => {
                onAdresse({ ansicht: 'protokoll', automation: a.id })
              }}
            />
          )}
        </ReiterInhalt>
        <ReiterInhalt value="protokoll" className="pt-4">
          {ansicht === 'protokoll' && (
            <Protokoll
              automationId={automationId}
              onAutomation={(id) => {
                onAdresse({ ansicht: 'protokoll', automation: id })
              }}
            />
          )}
        </ReiterInhalt>
        <ReiterInhalt value="einstellungen" className="pt-4">
          {ansicht === 'einstellungen' && <Einstellungen />}
        </ReiterInhalt>
      </Reiter>
      {bearbeiten && katalog.data && (
        <AutomationEditor
          key={bearbeiten.id ?? 'neu'}
          start={bearbeiten}
          katalog={katalog.data}
          onSchliessen={() => {
            setBearbeiten(null)
          }}
        />
      )}
    </div>
  )
}
