import { useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, CalendarX, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { meldeIntegrationsFehler, microsoft } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { VERKAUF_SCHLUESSEL } from '../hooks/useVerkauf'

/** Was das CRM über den Outlook-Termin speichert (V233 olEventId …). */
interface OutlookAngaben {
  olEventId?: string
  olEventLink?: string
  olOrganizer?: string
  olInvite?: boolean
}

/**
 * Beratungstermin in Outlook (V233 «In Outlook eintragen»): im Kalender der Person, die eintraegt; die
 * Person mit dem Termin wird eingeladen, auf Wunsch auch der Kunde (das ist eine Mail nach aussen, darum
 * nur auf ausdrücklichen Klick). Ändert sich der Termin im CRM, aktualisiert derselbe Knopf den Eintrag.
 */
export function OutlookTermin({ verkaufschanceId, outlook }: { verkaufschanceId: string; outlook: unknown }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const o = (outlook ?? {}) as OutlookAngaben
  const [kunde, setKunde] = useState(o.olInvite ?? false)
  const [laeuft, setLaeuft] = useState<'eintragen' | 'absagen' | null>(null)

  async function mache(was: 'eintragen' | 'absagen') {
    setLaeuft(was)
    try {
      if (was === 'eintragen') {
        await microsoft.terminEintragen({ verkaufschance_id: verkaufschanceId, kunde_einladen: kunde })
        melde('ok', { de: 'In Outlook eingetragen', fr: 'Inscrit dans Outlook' })
      } else {
        await microsoft.terminAbsagen(verkaufschanceId)
        melde('ok', { de: 'Outlook-Termin abgesagt', fr: 'Rendez-vous Outlook annulé' })
      }
      await qc.invalidateQueries({ queryKey: VERKAUF_SCHLUESSEL })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(null)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{t('verkauf.outlook.titel')}</span>
        {o.olEventId ? (
          <span className="text-ok flex items-center gap-1.5">
            <CalendarCheck className="size-4" aria-hidden="true" />
            {t('verkauf.outlook.eingetragen', { person: o.olOrganizer ?? '' })}
            {o.olEventLink && (
              <a
                href={o.olEventLink}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary dark:text-accent inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                {t('verkauf.outlook.oeffnen')}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">{t('verkauf.outlook.nicht')}</span>
        )}
      </div>
      <label className="flex items-center gap-2">
        <Checkbox
          checked={kunde}
          onCheckedChange={(w) => {
            setKunde(w === true)
          }}
        />
        {t('verkauf.outlook.kundeEinladen')}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" laedt={laeuft === 'eintragen'} onClick={() => void mache('eintragen')}>
          <CalendarCheck />
          {o.olEventId ? t('verkauf.outlook.aktualisieren') : t('verkauf.outlook.eintragen')}
        </Button>
        {o.olEventId && (
          <Button size="sm" variant="ghost" laedt={laeuft === 'absagen'} onClick={() => void mache('absagen')}>
            <CalendarX />
            {t('verkauf.outlook.absagen')}
          </Button>
        )}
      </div>
    </div>
  )
}
