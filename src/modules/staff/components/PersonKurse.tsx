import { CalendarPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf } from '@/lib/format'
import { kursDatum, offeneRueckzahlung } from '../lib/kurse'
import type { Kurs } from '../types'
import { KursStandBadge } from './KursStandBadge'

/**
 * Reiter «Kurse» einer Person: alle Kurse des Jahres mit Stand, offene Rückzahlung aus einer
 * Weiterbildungsvereinbarung (nur wer die Kosten sehen darf) und «Kurs planen» bzw. «beantragen».
 */
export function PersonKurse({
  kurse,
  heute,
  eigene,
  darfPlanen,
  onKurs,
  onNeu,
}: {
  kurse: Kurs[]
  heute: string
  eigene: boolean
  darfPlanen: boolean
  onKurs: (k: Kurs) => void
  onNeu: () => void
}) {
  const { t } = useTranslation()
  const quali = useAuswahl('qualifikation')
  const rueckzahlung = kurse.filter((k) => k.stand === 'besucht').reduce((s, k) => s + offeneRueckzahlung(k, heute), 0)
  return (
    <div className="flex flex-col gap-3">
      {rueckzahlung > 0 && (
        <p className="bg-warn-soft text-warn rounded-lg px-3 py-2 text-sm">
          {t('team.kurs.rueckzahlungOffen', { betrag: formatChf(rueckzahlung, { mitWaehrung: true }) })}
        </p>
      )}
      {kurse.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">{t('team.kurs.keineFuerPerson')}</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {kurse.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                className="hover:bg-muted focus-visible:ring-ring flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left outline-none focus-visible:ring-2"
                onClick={() => {
                  onKurs(k)
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{k.titel}</span>
                  <span className="text-muted-foreground text-xs">
                    {[
                      kursDatum(k, t('team.kurs.ohneDatum')),
                      k.art ? quali.text(k.art) : t('team.kurs.weiterbildung'),
                      k.ort,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <KursStandBadge stand={k.stand} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(eigene || darfPlanen) && (
        <Button variant="secondary" className="self-start" onClick={onNeu}>
          <CalendarPlus />
          {darfPlanen ? t('team.kurs.neu') : t('team.kurs.beantragen')}
        </Button>
      )}
    </div>
  )
}
