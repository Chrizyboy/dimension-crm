import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { buchungErledigen, type KartenBuchung } from '../services/firmenkarte'

/** Kartenbuchung ohne Beleg erledigen (z. B. Abo mit Rechnung per Mail, Gebühr, privat und abgezogen). */
export function ErledigenDialog({ buchung: b, onSchliessen }: { buchung: KartenBuchung; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState('')

  async function los() {
    if (await aus(() => buchungErledigen(b.id, grund.trim()), { de: 'Erledigt', fr: 'Réglé' })) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('spesen.karte.erledigenTitel')}
        beschreibung={`${formatDatum(b.datum)} · ${b.text} · ${formatChf(b.betrag_rappen, { mitWaehrung: true })}`}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void los()} laedt={laeuft} disabled={!grund.trim()}>
              {t('spesen.karte.erledigen')}
            </Button>
          </>
        }
      >
        <Feld id="karte-grund" label={t('spesen.karte.grund')} hinweis={t('spesen.karte.grundHinweis')} pflicht>
          <Input
            id="karte-grund"
            value={grund}
            list="karte-gruende"
            onChange={(e) => {
              setGrund(e.target.value)
            }}
          />
          <datalist id="karte-gruende">
            {(['abo', 'gebuehr', 'privat'] as const).map((g) => (
              <option key={g} value={t(`spesen.karte.grundVorschlag.${g}`)} />
            ))}
          </datalist>
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
