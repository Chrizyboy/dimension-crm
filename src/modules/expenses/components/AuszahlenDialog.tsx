import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich, summe } from '../lib/spesen'
import { spesenAuszahlen } from '../services/spesen'
import type { Spese } from '../types'

/** Gewählte Spesen als ausbezahlt markieren (V233 «ausbezahlt am / von»); «von» setzt die Datenbank. */
export function AuszahlenDialog({
  spesen,
  onSchliessen,
  onFertig,
}: {
  spesen: Spese[]
  onSchliessen: () => void
  onFertig: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [datum, setDatum] = useState(heuteZuerich())

  async function los() {
    const ok = await aus(
      () =>
        spesenAuszahlen(
          spesen.map((s) => s.id),
          datum,
        ),
      { de: 'Als ausbezahlt markiert', fr: 'Marqués comme payés' },
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
        titel={t('spesen.auszahlen.titel', { count: spesen.length })}
        beschreibung={t('spesen.auszahlen.text', { betrag: formatChf(summe(spesen), { mitWaehrung: true }) })}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void los()} laedt={laeuft} disabled={!datum}>
              {t('spesen.auszahlen.knopf')}
            </Button>
          </>
        }
      >
        <Feld id="spesen-ausbezahlt-am" label={t('spesen.auszahlen.datum')} pflicht>
          <Input
            id="spesen-ausbezahlt-am"
            type="date"
            value={datum}
            onChange={(e) => {
              setDatum(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
