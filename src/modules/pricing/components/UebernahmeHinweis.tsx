import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatChf } from '@/lib/format'
import { werteFuerOfferte } from '../lib/kalkulation'
import type { Kalkulation } from '../types'

/**
 * Rückfrage im Blatt statt Bestätigungsfenster (das in der Desktop-App nicht überall erscheint):
 * zeigt bei «In Offerte übernehmen» genau, welche Werte die Offerte bekommt.
 */
export function UebernahmeHinweis({
  art,
  k,
  satz,
  offerte,
  onJa,
  onNein,
}: {
  art: 'offerte' | 'vorlage' | 'neu'
  k: Kalkulation
  satz: number
  offerte: { nummer: string; name: string } | null
  onJa: () => void
  onNein: () => void
}) {
  const { t } = useTranslation()
  const w = werteFuerOfferte(k, satz)
  const zeilen =
    art === 'offerte'
      ? [
          t('preise.kalk.uebernahme.betrag', { betrag: formatChf(w.betrag_rappen) }),
          w.leistung_kwp ? t('preise.kalk.uebernahme.kwp', { kwp: w.leistung_kwp }) : null,
          w.anzahl_module ? t('preise.kalk.uebernahme.module', { n: w.anzahl_module }) : null,
          w.wechselrichter ? t('preise.kalk.uebernahme.wr', { namen: w.wechselrichter }) : null,
          w.batterie ? t('preise.kalk.uebernahme.batterie', { namen: w.batterie }) : null,
        ].filter(Boolean)
      : []
  return (
    <div
      role="alertdialog"
      aria-label={t(`preise.kalk.frage.${art}`, { nummer: offerte?.nummer ?? '', name: offerte?.name ?? '' })}
      className="bg-info-soft flex flex-col gap-2 rounded-lg p-3 text-sm"
    >
      <p className="font-medium">
        {t(`preise.kalk.frage.${art}`, { nummer: offerte?.nummer ?? '', name: offerte?.name ?? '', titel: k.titel })}
      </p>
      {zeilen.length > 0 && (
        <ul className="list-inside list-disc">
          {zeilen.map((z) => (
            <li key={z}>{z}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onJa}>
          {t(`preise.kalk.ja.${art}`)}
        </Button>
        <Button size="sm" variant="secondary" onClick={onNein}>
          {t('allgemein.abbrechen')}
        </Button>
      </div>
    </div>
  )
}
