import { Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import type { Ansicht } from '../types'
import { Anschreiben } from './Anschreiben'
import { NewsletterSeite } from './NewsletterSeite'
import { Social } from './Social'
import { Vorlagen } from './Vorlagen'

/**
 * Marketing (Phase 11): Kunden anschreiben (Serienbrief, Serien-Mail, Adressliste), Social Media (Instagram,
 * Facebook, LinkedIn mit Bild aus Canva), Newsletter und Vorlagen. Alles, was nach aussen geht, braucht eine
 * Freigabe (Regel 6). #/marketing?ansicht=…
 */
export default function Marketing({ ansicht, onAnsicht }: { ansicht: Ansicht; onAnsicht: (a: Ansicht) => void }) {
  const { t } = useTranslation()
  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Megaphone} titel={t('marketing.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
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
        <ReiterListe>
          <ReiterKnopf value="anschreiben">{t('marketing.ansicht.anschreiben')}</ReiterKnopf>
          <ReiterKnopf value="social">{t('marketing.ansicht.social')}</ReiterKnopf>
          <ReiterKnopf value="newsletter">{t('marketing.ansicht.newsletter')}</ReiterKnopf>
          <ReiterKnopf value="vorlagen">{t('marketing.ansicht.vorlagen')}</ReiterKnopf>
        </ReiterListe>
        <ReiterInhalt value="anschreiben" className="pt-4">
          {ansicht === 'anschreiben' && <Anschreiben />}
        </ReiterInhalt>
        <ReiterInhalt value="social" className="pt-4">
          {ansicht === 'social' && <Social />}
        </ReiterInhalt>
        <ReiterInhalt value="newsletter" className="pt-4">
          {ansicht === 'newsletter' && <NewsletterSeite />}
        </ReiterInhalt>
        <ReiterInhalt value="vorlagen" className="pt-4">
          {ansicht === 'vorlagen' && <Vorlagen />}
        </ReiterInhalt>
      </Reiter>
    </div>
  )
}
