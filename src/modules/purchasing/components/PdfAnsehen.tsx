import { FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { bestellPdf } from '../services/bestellPdf'
import type { Bestellung, Position } from '../types'

/** Bestell-PDF zum Ansehen oder Drucken öffnen (so, wie es der Lieferant bekommt), ohne es abzulegen. */
export function PdfAnsehen({ bestellung, positionen }: { bestellung: Bestellung; positionen: Position[] }) {
  const { t, i18n } = useTranslation()
  const [laeuft, setLaeuft] = useState(false)

  async function oeffnen() {
    setLaeuft(true)
    try {
      const bytes = await bestellPdf(bestellung, positionen, i18n.getFixedT(bestellung.lieferant_sprache))
      const adresse = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
      window.open(adresse, '_blank', 'noopener')
      setTimeout(() => {
        URL.revokeObjectURL(adresse)
      }, 60_000)
    } catch (f) {
      meldeFehler(f, 'einkauf')
      melde('kritisch', { de: 'PDF konnte nicht erstellt werden', fr: 'Le PDF n’a pas pu être créé' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Button variant="ghost" laedt={laeuft} disabled={positionen.length === 0} onClick={() => void oeffnen()}>
      <FileText />
      {t('einkauf.akte.pdf')}
    </Button>
  )
}
