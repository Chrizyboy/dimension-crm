import { QrCode } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { pdfZeigen } from '@/lib/datei'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { etikettLink, type Etikett } from '../lib/etikett'

/** Eine Sache, für die ein Etikett gedruckt wird. */
export interface EtikettSache {
  bezug: { fahrzeug?: string; geraet?: string }
  titel: string
  nummer: string | null
}

/**
 * Druckt QR-Etiketten (PDF in neuem Fenster). Der Code öffnet am Handy die Akte mit «Nehmen», «Zurück» und
 * «Schaden melden», darum genügt die normale Handy-Kamera zum Scannen.
 */
export function EtikettenKnopf({ sachen, nurIcon = false }: { sachen: readonly EtikettSache[]; nurIcon?: boolean }) {
  const { t } = useTranslation()
  const [laeuft, setLaeuft] = useState(false)
  async function drucken() {
    setLaeuft(true)
    try {
      const { etikettenPdf } = await import('../services/etikettenPdf')
      const etiketten: Etikett[] = sachen.map((s) => ({
        link: etikettLink(s.bezug, window.location),
        titel: s.titel,
        nummer: s.nummer,
      }))
      pdfZeigen(await etikettenPdf(etiketten, t('fuhrpark.etikett.fuss')))
    } catch (e) {
      meldeFehler(e, 'fuhrpark')
      melde('kritisch', { de: 'Etiketten nicht erstellt', fr: 'Étiquettes non créées' })
    } finally {
      setLaeuft(false)
    }
  }
  return (
    <Button
      variant="secondary"
      {...(nurIcon ? { size: 'icon' as const, 'aria-label': t('fuhrpark.etikett.einzeln') } : {})}
      laedt={laeuft}
      disabled={sachen.length === 0}
      onClick={() => void drucken()}
    >
      <QrCode />
      {!nurIcon && t('fuhrpark.etikett.knopf', { count: sachen.length })}
    </Button>
  )
}
