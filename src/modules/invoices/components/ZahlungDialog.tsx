import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/rechnung'
import { zahlungErfassen } from '../services/rechnungen'
import type { Rechnung } from '../types'

/** Zahlung von Hand erfassen (V233 «Zahlung erfassen»); vorgeschlagen ist der offene Betrag. */
export function ZahlungDialog({ rechnung: r, onSchliessen }: { rechnung: Rechnung; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [betrag, setBetrag] = useState(() => formatChf(r.offen_rappen))
  const [datum, setDatum] = useState(heuteZuerich())
  const [notiz, setNotiz] = useState('')
  const rappen = parseChf(betrag)

  async function los() {
    if (!rappen) return
    const ok = await aus(
      () => zahlungErfassen({ rechnung_id: r.id, betrag_rappen: rappen, datum, notiz: notiz.trim() || null }),
      { de: 'Zahlung erfasst', fr: 'Paiement enregistré' },
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
        titel={t('rechnungen.zahlung.titel', { nummer: r.nummer })}
        beschreibung={t('rechnungen.zahlung.text', { offen: formatChf(r.offen_rappen, { mitWaehrung: true }) })}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void los()} laedt={laeuft} disabled={!rappen || !datum}>
              {t('rechnungen.zahlung.erfassen')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="zahlung-betrag" label={t('rechnungen.zahlung.betrag')} pflicht>
            <Input
              id="zahlung-betrag"
              inputMode="decimal"
              value={betrag}
              onChange={(e) => {
                setBetrag(e.target.value)
              }}
            />
          </Feld>
          <Feld id="zahlung-datum" label={t('rechnungen.zahlung.datum')} pflicht>
            <Input
              id="zahlung-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld id="zahlung-notiz" label={t('rechnungen.zahlung.notiz')} className="sm:col-span-2">
            <Input
              id="zahlung-notiz"
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
