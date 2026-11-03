import { useNavigate } from '@tanstack/react-router'
import { CalendarClock, ChevronDown, Mail, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useVerkaufAenderung } from '../hooks/useVerkauf'
import { terminLinkSenden } from '../services/leads'

/**
 * «Termin-Link senden» in der Lead-Akte (03.11.2026): der Kunde bucht seine Besichtigung selbst auf der Website.
 * SMS oder Mail landen im Ausgangskorb und gehen erst nach Freigabe raus (Regel 6).
 */
export function TerminLinkKnopf({ verkaufschanceId }: { verkaufschanceId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const senden = useVerkaufAenderung((kanal: 'sms' | 'mail') => terminLinkSenden(verkaufschanceId, kanal))

  async function los(kanal: 'sms' | 'mail') {
    try {
      await senden.mutateAsync(kanal)
      melde('ok', zweisprachig('verkauf.terminLink.bereit'), {
        aktion: {
          text: zweisprachig('verkauf.terminLink.zumAusgang'),
          ausfuehren: () => void navigate({ to: '/outbox' }),
        },
      })
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (s) melde('kritisch', zweisprachig(s))
      else {
        meldeFehler(f, 'termin-link')
        melde('kritisch', zweisprachig('fachfehler.allgemein'))
      }
    }
  }

  return (
    <Menue>
      <MenueAusloeser asChild>
        <Button variant="secondary" laedt={senden.isPending}>
          <CalendarClock />
          {t('verkauf.terminLink.senden')}
          <ChevronDown />
        </Button>
      </MenueAusloeser>
      <MenueInhalt align="end">
        <MenueEintrag onSelect={() => void los('sms')}>
          <MessageSquare />
          {t('verkauf.terminLink.sms')}
        </MenueEintrag>
        <MenueEintrag onSelect={() => void los('mail')}>
          <Mail />
          {t('verkauf.terminLink.mail')}
        </MenueEintrag>
      </MenueInhalt>
    </Menue>
  )
}
