import { Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { ANSICHTEN, type Ansicht, type ZielFilter } from '../types'
import { Anschreiben } from './Anschreiben'
import { Kalender } from './Kalender'
import { KampagneAkte } from './KampagneAkte'
import { KampagnenListe } from './KampagnenListe'
import { Mediathek } from './Mediathek'
import { Empfehlungen } from './Empfehlungen'
import { NewsletterSeite } from './NewsletterSeite'
import { Social } from './Social'
import { Uebersicht } from './Uebersicht'
import { Vorlagen } from './Vorlagen'

/**
 * Marketing (Phase 11, vollständig Entscheid 0042): Übersicht je Rolle, Kalender, Kampagnen, Messen & Events,
 * Kunden anschreiben, Social Media, Newsletter, Mediathek und Vorlagen. Alles, was nach aussen geht, braucht eine
 * Freigabe (Regel 6). #/marketing?ansicht=…&kampagne=…
 */
export default function Marketing({
  ansicht,
  onAnsicht,
  anlage,
  kampagne,
  onKampagne,
}: {
  ansicht: Ansicht
  onAnsicht: (a: Ansicht) => void
  anlage?: ZielFilter['anlage']
  /** Offene Kampagnen-Akte («neu» für eine neue). */
  kampagne?: string
  onKampagne: (id: string | null) => void
}) {
  const { t } = useTranslation()
  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Megaphone} titel={t('marketing.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  const inhalt: Record<Ansicht, React.ReactNode> = {
    uebersicht: <Uebersicht onAnsicht={onAnsicht} />,
    kalender: <Kalender onAnsicht={onAnsicht} />,
    kampagnen: <KampagnenListe onOeffnen={onKampagne} />,
    messen: <KampagnenListe nurMessen onOeffnen={onKampagne} />,
    anschreiben: <Anschreiben {...(anlage ? { anlage } : {})} />,
    social: <Social />,
    newsletter: <NewsletterSeite />,
    empfehlungen: <Empfehlungen />,
    mediathek: <Mediathek />,
    vorlagen: <Vorlagen />,
  }
  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('marketing.titel')} beschreibung={t('marketing.beschreibung')} />
      <Reiter
        value={ansicht}
        onValueChange={(a) => {
          onAnsicht(a as Ansicht)
        }}
      >
        <ReiterListe className="wischzeile max-w-full overflow-x-auto">
          {ANSICHTEN.map((a) => (
            <ReiterKnopf key={a} value={a}>
              {t(`marketing.ansicht.${a}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        {ANSICHTEN.map((a) => (
          <ReiterInhalt key={a} value={a} className="pt-4">
            {ansicht === a && inhalt[a]}
          </ReiterInhalt>
        ))}
      </Reiter>
      {kampagne && (
        <KampagneAkte
          key={kampagne}
          id={kampagne}
          {...(kampagne === 'neu' && ansicht === 'messen' ? { vorlage: { art: 'messe' as const } } : {})}
          onOeffnen={onKampagne}
          onSchliessen={() => {
            onKampagne(null)
          }}
        />
      )}
    </div>
  )
}
