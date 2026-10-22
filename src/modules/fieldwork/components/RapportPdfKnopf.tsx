import { FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { pdfOeffnen } from '../services/pdf'
import { rapportPdf } from '../services/rapportPdf'
import type { Rapport } from '../types'

/** Abgeschlossenen Rapport als PDF öffnen (mit Unterschrift und Fotos), zum Ablegen oder Weitergeben. */
export function RapportPdfKnopf({ rapport }: { rapport: Rapport }) {
  const { t, i18n } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [laeuft, setLaeuft] = useState(false)

  async function oeffnen() {
    setLaeuft(true)
    try {
      pdfOeffnen(await rapportPdf(rapport, i18n.getFixedT(sprache), sprache))
    } catch (f) {
      meldeFehler(f, 'baustelle')
      melde('kritisch', { de: 'PDF konnte nicht erstellt werden', fr: 'Le PDF n’a pas pu être créé' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Button variant="ghost" laedt={laeuft} onClick={() => void oeffnen()}>
      <FileText />
      {t('baustelle.rapport.pdf')}
    </Button>
  )
}
