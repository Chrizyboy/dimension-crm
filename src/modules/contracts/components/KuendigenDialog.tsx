import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { zweisprachig } from '@/services/fachfehler'
import { useAktion } from '../hooks/useAktion'
import { inTagen } from '../lib/anzeige'
import { laeuftBis } from '../lib/tarif'
import { wartungKuendigen } from '../services/vertraege'
import type { Vertrag } from '../types'

/** Kündigung erfassen: Eingangsdatum; das Ende (erster Ablauf mindestens n Monate danach) zeigt der Dialog sofort. */
export function KuendigenDialog({
  vertrag: v,
  monate,
  onSchliessen,
}: {
  vertrag: Vertrag
  monate: number
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [am, setAm] = useState(() => inTagen(new Date(), 0))
  const d = new Date(`${am || inTagen(new Date(), 0)}T12:00:00`)
  const ende = laeuftBis(
    v.start_am,
    v.laufzeit_jahre,
    inTagen(new Date(d.getFullYear(), d.getMonth() + monate, d.getDate(), 12), 0),
  )

  async function speichern() {
    let per = ''
    const ok = await aus(async () => {
      per = await wartungKuendigen(v.id, am)
    })
    if (ok) {
      melde('ok', zweisprachig('wartung.kuendigen.gespeichert', { datum: formatDatum(per) }))
      onSchliessen()
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('wartung.kuendigen.titel')}
        beschreibung={t('wartung.kuendigen.text', { monate })}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!am}>
              {t('wartung.akte.kuendigen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="wv-kuendigung" label={t('wartung.kuendigen.am')}>
            <Input
              id="wv-kuendigung"
              type="date"
              value={am}
              onChange={(e) => {
                setAm(e.target.value)
              }}
            />
          </Feld>
          {ende && <p className="text-sm font-medium">{t('wartung.kuendigen.endet', { datum: formatDatum(ende) })}</p>}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
