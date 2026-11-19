import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { MailSearch } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { meldeIntegrationsFehler, microsoft, useMeineMicrosoftVerbindung } from '@/services/integrationen'
import { melde } from '@/services/meldungen'

/**
 * «E-Mails aus Outlook laden» (V81, V227, V234) in Kundenakte und Lead-Akte: mit Adresse der ganze Mailverlauf mit
 * diesem Kunden (alle Ordner, auch Team-Postfächer), sonst die Mails der letzten Tage mit allen Kunden. Übernommen
 * werden Betreff, Vorschau, Richtung und Zeitpunkt. Läuft zusätzlich alle 15 Minuten für alle Verbundenen.
 */
export function OutlookMailsKnopf({ adresse, neuLaden }: { adresse?: string | null | undefined; neuLaden: QueryKey }) {
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
        ;(adresse ? microsoft.mailsKontakt(adresse) : microsoft.mailsAbgleichen())
          .then((r) => {
            melde('ok', {
              de: r.anzahl ? `${String(r.anzahl)} Mails übernommen` : 'Keine neuen Mails',
              fr: r.anzahl ? `${String(r.anzahl)} e-mails repris` : 'Aucun nouvel e-mail',
            })
            return qc.invalidateQueries({ queryKey: neuLaden })
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
