import { useTranslation } from 'react-i18next'
import { nachPerson, nachStandort } from '../lib/auswertung'
import { KennzahlTabelle } from './KennzahlTabelle'
import type { ReiterProps } from './reiterProps'

/**
 * Reiter «Alle Zahlen»: die grosse Tabelle aus V233 nach Standort (mit Spalte Vorjahr bzw. Vorperiode) und nach
 * Person. Nichts aus der Vorlage geht verloren.
 */
export function AlleZahlen(p: ReiterProps) {
  const { t } = useTranslation()
  const standorte = nachStandort(p.fakten).map((s) => ({ ...s, titel: t(`kz.spalte.${s.id}`) }))
  const spalten = p.vorher ? [...standorte, { id: 'vorher', titel: p.vergleichName, fakten: p.vorher }] : standorte
  const personen = nachPerson(p.fakten, p.personen).map((s) => ({
    ...s,
    titel: s.id === 'uebrige' ? t('kz.spalte.uebrige') : (p.personen.find((x) => x.id === s.id)?.name ?? s.id),
  }))
  return (
    <div className="flex flex-col gap-4">
      <KennzahlTabelle titel={t('kz.nachStandort')} spalten={spalten} onDetail={p.onDetail} testId="kz-standort" />
      <KennzahlTabelle titel={t('kz.nachPerson')} spalten={personen} onDetail={p.onDetail} testId="kz-person" />
    </div>
  )
}
