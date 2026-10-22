import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { stornieren } from '../services/bestellungen'
import type { Bestellung } from '../types'

/**
 * Bestellung stornieren (bleibt sichtbar, nichts wird gelöscht). Ist sie schon beim Lieferanten, braucht es
 * einen Grund; die Absage an den Lieferanten macht die Person selbst.
 */
export function StornoDialog({ bestellung: b, onSchliessen }: { bestellung: Bestellung; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState('')
  const pflicht = b.status === 'bestellt'

  async function los() {
    const ok = await aus(() => stornieren(b.id, grund.trim()), { de: 'Bestellung storniert', fr: 'Commande annulée' })
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('einkauf.storno.titel', { nummer: b.nummer })}
        beschreibung={pflicht ? t('einkauf.storno.bestellt') : t('einkauf.storno.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="danger" onClick={() => void los()} laedt={laeuft} disabled={pflicht && !grund.trim()}>
              {t('einkauf.akte.stornieren')}
            </Button>
          </>
        }
      >
        <Feld id="storno-grund" label={t('einkauf.feld.stornoGrund')} pflicht={pflicht}>
          <Textarea
            id="storno-grund"
            rows={2}
            value={grund}
            onChange={(e) => {
              setGrund(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
