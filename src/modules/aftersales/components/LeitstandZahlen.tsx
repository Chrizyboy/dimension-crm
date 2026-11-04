import { useTranslation } from 'react-i18next'
import { Kennzahlleiste } from '@/components/shared/Kennzahlleiste'

/** Eine Kennzahl im Leitstand; mit Klick setzt sie den passenden Filter. */
export interface Kennzahl {
  id: string
  wert: number
  ton?: 'kritisch' | 'warnung'
  onKlick?: () => void
}

/**
 * Kennzahlen oben im Leitstand: offen, zu spät, Termine dieser Woche, Teile, RMA, zu verrechnen.
 * Zahlen mit 0 blendet die gemeinsame `Kennzahlleiste` aus (Entscheid 0058).
 */
export function LeitstandZahlen({ zahlen }: { zahlen: Kennzahl[] }) {
  const { t } = useTranslation()
  return (
    <Kennzahlleiste
      beschriftung={t('service.zahl.titel')}
      zahlen={zahlen.map((z) => ({ ...z, text: t(`service.zahl.${z.id}`) }))}
    />
  )
}
