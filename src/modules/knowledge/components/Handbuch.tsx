import { BookOpen, LifeBuoy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useMeldungen } from '../hooks/useHandbuch'
import type { Ansicht } from '../types'
import { Anleitung } from './Anleitung'
import { ErsteSchritte } from './ErsteSchritte'
import { MeldungDialog } from './MeldungDialog'
import { Meldungen } from './Meldungen'
import { Prozesse } from './Prozesse'
import { Videos } from './Videos'

interface Props {
  ansicht: Ansicht
  /** Offene Meldung (Link aus der Glocke). */
  meldung: string | null
  /** «Fehler melden» ist offen; Wert = Bereich, aus dem man kam. */
  neu: string | null
  onAdresse: (a: { ansicht?: Ansicht; meldung?: string | null; neu?: string | null }) => void
}

/**
 * Handbuch (V233 Helpdesk): Anleitung je Bereich, Prozesse als PDF, Erklärvideos und Meldungen («Fehler melden»).
 * Alle lesen alles; Prozesse und Videos pflegt die Administration. #/knowledge?ansicht=…
 */
export default function Handbuch({ ansicht, meldung, neu, onAdresse }: Props) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const admin = hatRecht(ich, 'admin')
  const meldungen = useMeldungen()
  // Zahl am Reiter: für die Administration neue Meldungen, für alle anderen Rückfragen an sie.
  const offen = (meldungen.data ?? []).filter((m) => (admin ? m.status === 'neu' : m.status === 'info')).length

  if (!supabase || !ich) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={BookOpen} titel={t('handbuch.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('handbuch.titel')}
        beschreibung={t('handbuch.beschreibung')}
        aktionen={
          <Button
            variant="secondary"
            onClick={() => {
              onAdresse({ ansicht, neu: 'anderes' })
            }}
          >
            <LifeBuoy />
            {t('handbuch.meldungen.melden')}
          </Button>
        }
      />
      <Reiter
        value={ansicht}
        onValueChange={(a) => {
          onAdresse({ ansicht: a as Ansicht, meldung: null })
        }}
      >
        <ReiterListe>
          <ReiterKnopf value="start">{t('handbuch.reiter.start')}</ReiterKnopf>
          <ReiterKnopf value="anleitung">{t('handbuch.reiter.anleitung')}</ReiterKnopf>
          <ReiterKnopf value="prozesse">{t('handbuch.reiter.prozesse')}</ReiterKnopf>
          <ReiterKnopf value="videos">{t('handbuch.reiter.videos')}</ReiterKnopf>
          <ReiterKnopf value="meldungen">
            {t('handbuch.reiter.meldungen')}
            {offen > 0 && (
              <span className="bg-accent text-accent-foreground ml-1.5 rounded-full px-1.5 text-xs font-semibold">
                <span className="sr-only">{t('handbuch.meldungen.offenSr')} </span>
                {offen}
              </span>
            )}
          </ReiterKnopf>
        </ReiterListe>
        <ReiterInhalt value="anleitung" className="pt-4">
          <Anleitung />
        </ReiterInhalt>
        <ReiterInhalt value="start" className="pt-4">
          <ErsteSchritte />
        </ReiterInhalt>
        <ReiterInhalt value="prozesse" className="pt-4">
          <Prozesse admin={admin} />
        </ReiterInhalt>
        <ReiterInhalt value="videos" className="pt-4">
          <Videos admin={admin} />
        </ReiterInhalt>
        <ReiterInhalt value="meldungen" className="pt-4">
          <Meldungen admin={admin} offen={meldung} />
        </ReiterInhalt>
      </Reiter>
      {neu !== null && (
        <MeldungDialog
          bereich={neu}
          onSchliessen={() => {
            onAdresse({ ansicht, neu: null })
          }}
        />
      )}
    </div>
  )
}
