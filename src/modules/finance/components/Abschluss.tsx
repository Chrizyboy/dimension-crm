import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import type { Finanzdaten } from '../types'
import { Bank } from './Bank'
import type { FinanzFenster } from './Fenster'
import { Konten } from './Konten'

/**
 * Kontostand unter «Liquidität»: Konten je Gesellschaft (Stand von Hand) und darunter die Einstellungen wie in V233
 * (Kontostand, Wochen, Vorlauf). Kontoauszug, MWST-Liste und Monatsabschluss sind seit 27.11.2026 ausgeblendet
 * (Chris: nie besprochen); `MwstListe.tsx` und `Monatsabschluss.tsx` bleiben für eine spätere Rückkehr liegen.
 */
export function Kontostand({ daten, onFenster }: { daten: Finanzdaten; onFenster: (f: FinanzFenster) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <Konten daten={daten} onFenster={onFenster} />
      <AkteAbschnitt ebene={2} offen={false} titel={t('finanzen.abschluss.vorschauEinstellungen')}>
        <Bank daten={daten} />
      </AkteAbschnitt>
    </div>
  )
}
