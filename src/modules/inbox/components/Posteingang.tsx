import { Inbox, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { hatRecht } from '@/lib/rechte'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useNeuLaden } from '../hooks/usePosteingang'
import { jetztAbholen } from '../services/posteingang'
import { REITER, type Ansicht, type Reiter as ReiterTyp } from '../types'
import { AbsenderRegeln } from './AbsenderRegeln'
import { Arbeitsplatz } from './Arbeitsplatz'
import { Auswertung } from './Auswertung'
import { Einstellungen } from './Einstellungen'
import { TeamUebersicht } from './TeamUebersicht'

/** Wohin die Seite springt: Reiter, Filter und offene Mail stehen in der Adresse. */
export interface PosteingangZiel {
  reiter?: ReiterTyp
  ansicht?: Ansicht
  mail?: string | null
}

/**
 * Posteingang (Phase 18, Arbeitsplatz seit 2.11.2026): alle Mails aus info@ und den persönlichen Postfächern,
 * eingeordnet, der Akte zugeordnet, mit zuständiger Person und Antwortfrist in Arbeitszeit. Reiter: Arbeitsplatz
 * (Liste und Mail nebeneinander), Team (Geschäftsleitung), Absender-Regeln, Reaktionszeit, Einstellungen (Administration).
 */
export default function Posteingang({
  reiter,
  ansicht,
  mailId,
  onNavigation,
}: {
  reiter: ReiterTyp
  ansicht: Ansicht
  mailId: string | null
  onNavigation: (z: PosteingangZiel) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const neuLaden = useNeuLaden()
  const [holt, setHolt] = useState(false)
  const admin = hatRecht(ich, 'admin')
  // Team-Übersicht nur für die Geschäftsleitung (Chris 3.11.2026, P5); bis es das Recht «gl» gibt, die Administration.
  const sichtbar = (r: ReiterTyp) => (r === 'einstellungen' || r === 'team' ? admin : true)

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
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, mail: null })
        }}
      >
        <ReiterListe>
          {REITER.filter(sichtbar).map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`posteingang.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="eingang" className="pt-4">
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
        </ReiterInhalt>
        {admin && (
          <ReiterInhalt value="team" className="pt-4">
            <TeamUebersicht />
          </ReiterInhalt>
        )}
        <ReiterInhalt value="regeln" className="pt-4">
          <AbsenderRegeln />
        </ReiterInhalt>
        <ReiterInhalt value="auswertung" className="pt-4">
          <Auswertung />
        </ReiterInhalt>
        {admin && (
          <ReiterInhalt value="einstellungen" className="pt-4">
            <Einstellungen />
          </ReiterInhalt>
        )}
      </Reiter>
    </div>
  )
}
