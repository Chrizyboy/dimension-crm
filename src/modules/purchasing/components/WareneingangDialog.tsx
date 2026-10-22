import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { alsZahl, formatMenge, inTagen } from '../lib/anzeige'
import { wareneingang } from '../services/bestellungen'
import type { Bestellung, Position } from '../types'

/**
 * Wareneingang: vorausgefüllt mit dem, was noch fehlt. Teillieferungen sind möglich. Ware ans Lager wird
 * dort für das Projekt reserviert; Ware auf die Baustelle zählt direkt beim Projekt.
 */
export function WareneingangDialog({
  bestellung: b,
  positionen,
  onSchliessen,
}: {
  bestellung: Bestellung
  positionen: Position[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [datum, setDatum] = useState(() => inTagen(new Date(), 0))
  const offen = positionen.filter((p) => p.geliefert_menge < p.menge)
  const [mengen, setMengen] = useState(() =>
    Object.fromEntries(offen.map((p) => [p.id, formatMenge(p.menge - p.geliefert_menge)])),
  )
  const eingabe = offen.map((p) => ({ id: p.id, menge: alsZahl(mengen[p.id] ?? '') ?? 0 }))
  const gueltig = eingabe.some((e) => e.menge > 0) && eingabe.every((e) => e.menge >= 0)

  async function buchen() {
    let stand = ''
    const ok = await aus(async () => {
      stand = await wareneingang(
        b.id,
        datum,
        eingabe.filter((e) => e.menge > 0),
      )
    })
    if (!ok) return
    melde('ok', {
      de: stand === 'geliefert' ? 'Wareneingang gebucht, alles geliefert' : 'Teillieferung gebucht',
      fr: stand === 'geliefert' ? 'Réception enregistrée, tout est livré' : 'Livraison partielle enregistrée',
    })
    onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('einkauf.eingang.titel', { nummer: b.nummer })}
        beschreibung={
          b.lagerort_id ? t('einkauf.eingang.lager', { lager: b.lagerort ?? '' }) : t('einkauf.eingang.baustelle')
        }
        className="max-w-xl"
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void buchen()} laedt={laeuft} disabled={!gueltig || !datum}>
              {t('einkauf.eingang.buchen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="we-datum" label={t('einkauf.eingang.datum')} pflicht>
            <Input
              id="we-datum"
              type="date"
              className="w-44"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <ul className="flex flex-col divide-y rounded-md border">
            {offen.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{p.bezeichnung}</span>
                  <span className="text-muted-foreground text-xs">
                    {t('einkauf.eingang.offen', {
                      offen: formatMenge(p.menge - p.geliefert_menge),
                      bestellt: formatMenge(p.menge),
                      einheit: p.einheit,
                    })}
                  </span>
                </span>
                <Input
                  aria-label={t('einkauf.eingang.mengeVon', { name: p.bezeichnung })}
                  className="w-24 shrink-0 text-right"
                  inputMode="decimal"
                  value={mengen[p.id] ?? ''}
                  onChange={(e) => {
                    setMengen((m) => ({ ...m, [p.id]: e.target.value }))
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
