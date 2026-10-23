import { ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import type { Ansicht } from '../types'
import { Assistent } from './Assistent'
import { Einstellungen } from './Einstellungen'
import { Kosten } from './Kosten'
import { Stil } from './Stil'

/**
 * KI-Assistent (Phase 13): Briefing, freie Texte und Mails lesen, Kosten, eigener Schreibstil und – für die
 * Administration – Modelle, Limits und Firmen-Schreibstil. #/ai?ansicht=kosten
 */
export default function KiSeite({ ansicht, onAnsicht }: { ansicht: Ansicht; onAnsicht: (a: Ansicht) => void }) {
  const { t } = useTranslation()
  const admin = hatRecht(
    useAnmeldung((z) => z.ich),
    'admin',
  )
  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Sparkles} titel={t('ki.seite.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  const reiter: Ansicht[] = ['assistent', 'kosten', 'stil', ...(admin ? (['einstellungen'] as const) : [])]
  const aktiv = reiter.includes(ansicht) ? ansicht : 'assistent'
  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('ki.seite.titel')} beschreibung={t('ki.seite.beschreibung')} />
      <p className="bg-info-soft text-info flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('ki.seite.regel')}
      </p>
      <Reiter
        value={aktiv}
        onValueChange={(a) => {
          onAnsicht(a as Ansicht)
        }}
      >
        <ReiterListe>
          {reiter.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`ki.seite.ansicht.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="assistent" className="pt-4">
          {aktiv === 'assistent' && <Assistent />}
        </ReiterInhalt>
        <ReiterInhalt value="kosten" className="pt-4">
          {aktiv === 'kosten' && <Kosten />}
        </ReiterInhalt>
        <ReiterInhalt value="stil" className="pt-4">
          {aktiv === 'stil' && <Stil />}
        </ReiterInhalt>
        {admin && (
          <ReiterInhalt value="einstellungen" className="pt-4">
            {aktiv === 'einstellungen' && <Einstellungen />}
          </ReiterInhalt>
        )}
      </Reiter>
    </div>
  )
}
