import { useTranslation } from 'react-i18next'
import { Kennzahlleiste } from '@/components/shared/Kennzahlleiste'

/** Eine Kennzahl im Leitstand; mit Klick setzt sie den passenden Filter. */
export interface Kennzahl {
  id: string
  wert: number | string
  ton?: 'kritisch' | 'warnung'
  aktiv?: boolean
  onKlick?: () => void
}

/** Kennzahlen oben im Leitstand; Zahlen mit 0 blendet die gemeinsame `Kennzahlleiste` aus (Entscheid 0058). */
export function Kennzahlen({ zahlen }: { zahlen: Kennzahl[] }) {
  const { t } = useTranslation()
  return (
    <Kennzahlleiste
      beschriftung={t('projekte.zahl.titel')}
      zahlen={zahlen.map((z) => ({ ...z, text: t(`projekte.zahl.${z.id}`) }))}
    />
  )
}
