import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { stornieren } from '../services/rechnungen'
import type { Rechnung } from '../types'

/**
 * Gestellte Rechnung stornieren (mit Grund, bleibt sichtbar) oder Entwurf in den Papierkorb. Tranche und
 * Nachträge werden wieder frei. Ist sie schon in AbaNinja, muss sie dort von Hand storniert werden.
 */
export function StornoDialog({
  rechnung: r,
  onSchliessen,
  onFertig,
}: {
  rechnung: Rechnung
  onSchliessen: () => void
  onFertig: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState('')
  const entwurf = r.status === 'entwurf'

  async function los() {
    const ok = await aus(
      () => stornieren(r.id, grund.trim()),
      entwurf
        ? { de: 'Entwurf gelöscht', fr: 'Brouillon supprimé' }
        : { de: 'Rechnung storniert', fr: 'Facture annulée' },
    )
    if (ok) onFertig()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={entwurf ? t('rechnungen.storno.entwurfTitel') : t('rechnungen.storno.titel', { nummer: r.nummer })}
        beschreibung={
          entwurf
            ? t('rechnungen.storno.entwurfText')
            : r.abaninja_uuid
              ? t('rechnungen.storno.abaninja')
              : t('rechnungen.storno.text')
        }
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="danger" onClick={() => void los()} laedt={laeuft} disabled={!entwurf && !grund.trim()}>
              {entwurf ? t('rechnungen.akte.entwurfLoeschen') : t('rechnungen.akte.stornieren')}
            </Button>
          </>
        }
      >
        <Feld id="rechnung-storno-grund" label={t('rechnungen.storno.grund')} pflicht={!entwurf}>
          <Textarea
            id="rechnung-storno-grund"
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
