import type { TFunction } from 'i18next'
import type { Projekt } from '../types'

/** Kurzangaben zur Anlage: kWp, Module, Wechselrichter. */
export function anlageKurz(
  p: Pick<Projekt, 'leistung_kwp' | 'anzahl_module' | 'wechselrichter'>,
  t: TFunction,
): string {
  return [
    p.leistung_kwp ? t('projekte.kwp', { wert: p.leistung_kwp }) : null,
    p.anzahl_module ? t('projekte.module', { count: p.anzahl_module }) : null,
    p.wechselrichter,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** PLZ und Ort in einer Zeile. */
export const ortZeile = (p: Pick<Projekt, 'plz' | 'ort'>) => [p.plz, p.ort].filter(Boolean).join(' ')
