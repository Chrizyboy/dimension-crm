import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import i18n from '@/i18n'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useAnmeldung } from '@/stores/anmeldung'
import { useOffertAenderung } from '../hooks/useOfferten'
import { erfasseNachfassMail } from '../services/ablauf'
import type { Offerte } from '../types'

/**
 * Nachfass-Mail (V234 «✉ Nachfass-Mail»): freundliche Nachfrage zur Offerte in der Sprache des Kunden.
 * Nach dem Senden oder Ablegen steht sie im Verlauf und das nächste Nachfassen rückt nach hinten, damit die
 * Offerte nicht morgen schon wieder auf der Liste steht.
 */
export default function NachfassMail({ o, onSchliessen }: { o: Offerte; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const erfassen = useOffertAenderung((id: string) => erfasseNachfassMail(id))
  const tk = i18n.getFixedT(o.sprache)
  return (
    <MailDialog
      titel={t('mail.nachfassTitel', { nummer: o.nummer })}
      vorlage={{
        an: o.email ?? '',
        betreff: tk('mail.nachfassen.betreff', { nummer: o.nummer }),
        text: tk('mail.nachfassen.text', {
          datum: o.angebotAm ? formatDatum(o.angebotAm) : '',
          absender: ich?.name ?? '',
        }),
        sprache: o.sprache,
        art: 'offerte',
        kontakt_id: o.kontaktId,
        offerte_id: o.id,
        ...(o.verkaufschanceId ? { verkaufschance_id: o.verkaufschanceId } : {}),
      }}
      dateien={[]}
      onFertig={() => {
        erfassen.mutate(o.id, {
          onError: (f) => {
            meldeFehler(f, 'offerten.nachfassMail')
          },
        })
      }}
      onSchliessen={onSchliessen}
    />
  )
}
