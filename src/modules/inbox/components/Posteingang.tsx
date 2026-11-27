import { Inbox, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useNeuLaden } from '../hooks/usePosteingang'
import { jetztAbholen } from '../services/posteingang'
import type { Ansicht } from '../types'
import { Arbeitsplatz } from './Arbeitsplatz'

/** Wohin die Seite springt: Filter und offene Mail stehen in der Adresse. */
export interface PosteingangZiel {
  ansicht?: Ansicht
  mail?: string | null
}

/**
 * Posteingang (Phase 18, Arbeitsplatz seit 2.11.2026): alle Mails aus info@ und den persönlichen Postfächern,
 * eingeordnet, der Akte zugeordnet, mit zuständiger Person und Antwortfrist in Arbeitszeit. Seit 27.11.2026 nur noch
 * der Arbeitsplatz (Liste und Mail nebeneinander, Chris: simpel); Absender-Regeln und Einstellungen stehen unter
 * Einstellungen › Posteingang, Team-Übersicht und Reaktionszeit sind ausgeblendet.
 */
export default function Posteingang({
  ansicht,
  mailId,
  onNavigation,
}: {
  ansicht: Ansicht
  mailId: string | null
  onNavigation: (z: PosteingangZiel) => void
}) {
  const { t } = useTranslation()
  const neuLaden = useNeuLaden()
  const [holt, setHolt] = useState(false)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Inbox} titel={t('posteingang.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  async function holen() {
    setHolt(true)
    try {
      const r = await jetztAbholen()
      melde('ok', {
        de: `${r.neu} neue Mails, ${r.beantwortet} als beantwortet erkannt`,
        fr: `${r.neu} nouveaux e-mails, ${r.beantwortet} reconnus comme répondus`,
      })
    } catch (e) {
      meldeIntegrationsFehler(e)
    } finally {
      setHolt(false)
      void neuLaden()
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('posteingang.titel')}
        beschreibung={t('posteingang.beschreibung')}
        aktionen={
          <Button variant="secondary" laedt={holt} onClick={() => void holen()}>
            <RefreshCw />
            {t('posteingang.holen')}
          </Button>
        }
      />
      <Arbeitsplatz
        ansicht={ansicht}
        mailId={mailId}
        onAnsicht={(a) => {
          onNavigation({ ansicht: a, mail: null })
        }}
        onMail={(id) => {
          onNavigation({ mail: id })
        }}
      />
    </div>
  )
}
