import { useTranslation } from 'react-i18next'
import { Kennzahlleiste, type Kennzahlkachel } from '@/components/shared/Kennzahlleiste'
import { stundenText, tageText } from '../lib/zeit'
import type { Zeitkonto } from '../types'

/**
 * Zahlen oben in «Meine Zeit»: Woche (Ist inkl. Abwesenheiten / Soll), Saldo seit Jahresbeginn (mit Übertrag),
 * Restferien und geplante Ferien. Negativer Saldo gelb, damit man früh merkt, wenn Stunden fehlen.
 */
export function KontoKacheln({ konto }: { konto: Zeitkonto }) {
  const { t } = useTranslation()
  const w = konto.woche
  const zahlen: Kennzahlkachel[] = [
    {
      id: 'woche',
      wert: `${stundenText(w.ist_h + w.gutschrift_h)} / ${stundenText(w.soll_h)}`,
      text: t('zeit.konto.woche'),
    },
    {
      id: 'saldo',
      wert: stundenText(konto.saldo_h, true),
      text: t('zeit.konto.saldo'),
      ...(konto.saldo_h < -0.01 ? { ton: 'warnung' as const } : {}),
    },
    { id: 'rest', wert: tageText(konto.ferien.rest), text: t('zeit.konto.ferienRest') },
    { id: 'bezogen', wert: tageText(konto.ferien.bezogen), text: t('zeit.konto.ferienBezogen') },
    { id: 'geplant', wert: tageText(konto.ferien.geplant), text: t('zeit.konto.ferienGeplant') },
    { id: 'beantragt', wert: tageText(konto.ferien.beantragt), text: t('zeit.konto.ferienBeantragt'), ton: 'warnung' },
  ]
  return <Kennzahlleiste zahlen={zahlen} beschriftung={t('zeit.konto.titel')} />
}
