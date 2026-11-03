import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { alsZahl, formatMenge } from '../lib/anzeige'
import { lagerBuchen } from '../services/lager'
import type { MaterialZeile } from '../types'

/**
 * Rückgabe von der Baustelle: Rest kommt zurück ins Lager, die Entnahme der Materialzeile wird kleiner.
 * Mehr als entnommen geht nicht.
 */
export function RueckgabeDialog({
  zeile,
  lagerortId,
  onSchliessen,
}: {
  zeile: MaterialZeile
  lagerortId: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [menge, setMenge] = useState('')
  const [notiz, setNotiz] = useState('')
  const n = alsZahl(menge)
  const gueltig = n !== null && n > 0 && n <= zeile.entnommen

  async function buchen() {
    if (!zeile.artikel_id || n === null) return
    const ok = await aus(
      () =>
        lagerBuchen({
          art: 'rueckgabe',
          lagerort_id: lagerortId,
          artikel_id: zeile.artikel_id ?? '',
          menge: n,
          projekt_material_id: zeile.id,
          notiz: notiz.trim(),
        }),
      { de: 'Zurück im Lager', fr: 'Retour au stock' },
    )
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
        titel={t('einkauf.rueck.titel')}
        beschreibung={t('einkauf.rueck.text', {
          name: zeile.bezeichnung,
          menge: formatMenge(zeile.entnommen),
          einheit: zeile.einheit,
        })}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} disabled={!gueltig} onClick={() => void buchen()}>
              {t('einkauf.rueck.buchen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="rg-menge" label={t('einkauf.zeile.menge')} pflicht>
            <Input
              id="rg-menge"
              inputMode="decimal"
              className="w-32"
              value={menge}
              onChange={(e) => {
                setMenge(e.target.value)
              }}
            />
          </Feld>
          <Feld id="rg-notiz" label={t('einkauf.feld.notiz')}>
            <Input
              id="rg-notiz"
              placeholder={t('einkauf.rueck.notizHinweis')}
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
