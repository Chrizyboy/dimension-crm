import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { datenblattAdresse } from '../lib/datenblatt'

/** Öffnet ein Datenblatt (Link oder abgelegte Datei) in einem neuen Fenster. */
export function DatenblattLink({ wert, sprache }: { wert: string; sprache: string }) {
  const { t } = useTranslation()
  async function oeffne() {
    // Fenster vorher öffnen, sonst blockiert der Browser das Pop-up nach dem Warten.
    const fenster = window.open('', '_blank')
    if (fenster) fenster.opener = null
    try {
      const adresse = await datenblattAdresse(wert)
      if (adresse && fenster) fenster.location.href = adresse
      else fenster?.close()
    } catch (f) {
      fenster?.close()
      meldeFehler(f, 'preise.datenblatt')
      melde('kritisch', { de: 'Datenblatt nicht geöffnet', fr: 'Fiche technique non ouverte' })
    }
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void oeffne()
      }}
      className="text-primary dark:text-accent hover:bg-muted focus-visible:ring-ring inline-flex h-6 items-center gap-1 rounded px-1 text-xs font-medium uppercase outline-none focus-visible:ring-2"
      aria-label={t('preise.akte.datenblattOeffnen', { sprache: sprache.toUpperCase() })}
    >
      <FileText className="size-3.5" aria-hidden="true" />
      {sprache}
    </button>
  )
}
