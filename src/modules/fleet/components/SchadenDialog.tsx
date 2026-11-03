import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatChf, formatDatum, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { schadenSetzen } from '../services/ressourcen'
import type { Schaden, SchadenStand } from '../types'
import { DateienBox } from './DateienBox'

const STAENDE: SchadenStand[] = ['offen', 'in_arbeit', 'erledigt']

/**
 * Schaden weiterbearbeiten: Fotos ansehen oder ergänzen, Stand setzen (offen → in Arbeit → erledigt), festhalten
 * wer repariert und welcher Versicherungsfall es ist, und die Kosten. «Erledigt» setzt ein Gerät wieder in Ordnung.
 */
export function SchadenDialog({ schaden, onSchliessen }: { schaden: Schaden; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [stand, setStand] = useState<SchadenStand>(schaden.stand === 'offen' ? 'in_arbeit' : 'erledigt')
  const [text, setText] = useState(schaden.erledigung ?? '')
  const [kosten, setKosten] = useState(schaden.kosten_rappen !== null ? formatChf(schaden.kosten_rappen) : '')

  async function speichern() {
    const ok = await aus(
      () => schadenSetzen(schaden.id, stand, text.trim() || null, kosten.trim() ? parseChf(kosten) : null),
      { de: 'Schaden aktualisiert', fr: 'Dommage mis à jour' },
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
        titel={t('fuhrpark.schaden.titel')}
        beschreibung={[formatDatum(schaden.datum), schaden.person].filter(Boolean).join(' · ')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="bg-muted rounded-md px-3 py-2 text-sm whitespace-pre-wrap">
            {schaden.text ?? t('fuhrpark.schaden.ohneText')}
          </p>
          <DateienBox ordner="eintrag" id={schaden.id} titel={t('fuhrpark.schaden.fotos')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id="sd-stand" label={t('fuhrpark.schaden.standLabel')} pflicht>
              <Auswahl
                id="sd-stand"
                value={stand}
                onValueChange={(v) => {
                  setStand(v as SchadenStand)
                }}
                optionen={STAENDE.map((s) => ({ wert: s, text: t(`fuhrpark.schaden.stand.${s}`) }))}
              />
            </Feld>
            <Feld id="sd-kosten" label={t('fuhrpark.eintrag.kosten')}>
              <Input
                id="sd-kosten"
                inputMode="decimal"
                placeholder="0.00"
                value={kosten}
                onChange={(e) => {
                  setKosten(e.target.value)
                }}
              />
            </Feld>
            <Feld id="sd-text" label={t('fuhrpark.schaden.erledigung')} className="sm:col-span-2">
              <Textarea
                id="sd-text"
                rows={2}
                placeholder={t('fuhrpark.schaden.erledigungBeispiel')}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                }}
              />
            </Feld>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
