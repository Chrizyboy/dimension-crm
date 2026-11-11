import { useTranslation } from 'react-i18next'
import type { Abwesenheit, Zeiterfassung } from '../types'
import { AbwesenheitListe } from './AbwesenheitListe'
import { Antraege } from './Antraege'
import { Kalender } from './Kalender'

/**
 * Abwesenheiten: oben, was die Zeit-Leitung bewilligen soll, dann der Monatskalender (wer ist wann weg) und die
 * Liste des Jahres mit Stand. Ohne Leitung nur die eigenen.
 */
export function AbwesenheitenReiter({
  daten,
  onBearbeiten,
}: {
  daten: Zeiterfassung
  onBearbeiten: (a: Abwesenheit) => void
}) {
  const { t } = useTranslation()
  const offen = daten.offen
  return (
    <div className="flex flex-col gap-6">
      {offen.length > 0 && <Antraege daten={daten} antraege={offen} />}
      <section aria-labelledby="ab-kalender" className="flex flex-col gap-2">
        <h2 id="ab-kalender" className="text-sm font-semibold">
          {t('zeit.kalender.titel')}
        </h2>
        <Kalender daten={daten} />
      </section>
      <AbwesenheitListe daten={daten} onBearbeiten={onBearbeiten} />
    </div>
  )
}
