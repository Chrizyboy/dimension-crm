import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import type { Finanzdaten } from '../types'
import { Bank } from './Bank'
import type { FinanzFenster } from './Fenster'
import { Konten } from './Konten'
import { Monatsabschluss } from './Monatsabschluss'
import { MwstListe } from './MwstListe'

/**
 * Konten, MWST und Abschluss: Bankkonten mit Kontoauszug, MWST-Schätzung je Periode und die Liste für den
 * Monatsabschluss. Die früheren Einstellungen der Vorschau (Wochen, Vorlauf, alter Kontostand) bleiben unten.
 */
export function Abschluss({ daten, onFenster }: { daten: Finanzdaten; onFenster: (f: FinanzFenster) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Konten daten={daten} onFenster={onFenster} />
        <Monatsabschluss daten={daten} />
      </div>
      <MwstListe daten={daten} onFenster={onFenster} />
      <AkteAbschnitt ebene={2} offen={false} titel={t('finanzen.abschluss.vorschauEinstellungen')}>
        <Bank daten={daten} />
      </AkteAbschnitt>
    </div>
  )
}
