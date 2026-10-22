import { useQueryClient } from '@tanstack/react-query'
import { MailSearch } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { meldeIntegrationsFehler, microsoft, useMeineMicrosoftVerbindung } from '@/services/integrationen'
import { melde } from '@/services/meldungen'

/**
 * «Mails aus Outlook laden» (V81, V227): Mails der letzten Tage mit Kunden in die Zeitachse übernehmen
 * (nur Betreff, Richtung und Zeitpunkt). Läuft zusätzlich alle 15 Minuten für alle Verbundenen.
 */
export function OutlookMailsKnopf() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const verbindung = useMeineMicrosoftVerbindung()
  const [laeuft, setLaeuft] = useState(false)
  if (!verbindung.data) return null
  return (
    <Button
      size="sm"
      variant="ghost"
      className="self-end"
      laedt={laeuft}
      onClick={() => {
        setLaeuft(true)
        microsoft
          .mailsAbgleichen()
          .then((r) => {
            melde('ok', { de: `${r.anzahl} Mails übernommen`, fr: `${r.anzahl} e-mails repris` })
            return qc.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL })
          })
          .catch(meldeIntegrationsFehler)
          .finally(() => {
            setLaeuft(false)
          })
      }}
    >
      <MailSearch />
      {t('akte.mailsAusOutlook')}
    </Button>
  )
}
