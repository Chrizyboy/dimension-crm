import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import type { MailEntwurf } from '@/services/ausgang'
import type { KiBezug, KundenArt } from '@/services/ki'
import { supabase } from '@/services/supabase'
import { KiKnopf } from './KiKnopf'
import { KiZusammenfassung } from './KiZusammenfassung'

/** Abschnitt «KI» in einer Akte (Offerte, Projekt, Service-Fall): Zusammenfassung und «Mit KI schreiben». */
export function KiAkteAbschnitt({
  bezug,
  art,
  mail,
}: {
  bezug: KiBezug
  art?: KundenArt
  mail?: Partial<Omit<MailEntwurf, 'anhaenge' | 'betreff' | 'text'>>
}) {
  const { t } = useTranslation()
  if (!supabase) return null
  return (
    <AkteAbschnitt titel={t('ki.abschnitt')} offen={false}>
      <div className="flex flex-col gap-3">
        <KiZusammenfassung bezug={bezug} />
        <KiKnopf bezug={bezug} {...(art ? { art } : {})} {...(mail ? { mail } : {})} />
      </div>
    </AkteAbschnitt>
  )
}
