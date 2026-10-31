import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { entscheiden } from '../services/grossprojekte'

/** In drei Monaten (Standard für «Beobachten»), als JJJJ-MM-TT. */
function inDreiMonaten(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  return d.toISOString().slice(0, 10)
}

/**
 * Verwerfen (Grund Pflicht, damit der Monitor später lernt, was nicht passt) oder Beobachten (Wiedervorlage am
 * Datum, Grund freiwillig, z. B. «Baubewilligung abwarten»).
 */
export function EntscheidDialog({
  id,
  art,
  onSchliessen,
}: {
  id: string
  art: 'verwerfen' | 'beobachten'
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState('')
  const [datum, setDatum] = useState(inDreiMonaten)
  const [fehler, setFehler] = useState<string>()

  async function ok() {
    if (art === 'verwerfen' && !grund.trim()) {
      setFehler(t('pruefung.pflicht'))
      return
    }
    const fertig = await aus(
      () => entscheiden(id, art, { grund: grund.trim(), ...(art === 'beobachten' ? { wiedervorlage_am: datum } : {}) }),
      art === 'verwerfen' ? { de: 'Verworfen', fr: 'Écarté' } : { de: 'Wird beobachtet', fr: 'En observation' },
    )
    if (fertig) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(`grossprojekte.entscheid.${art}Titel`)}
        beschreibung={t(`grossprojekte.entscheid.${art}Text`)}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void ok()} laedt={laeuft}>
              {t(`grossprojekte.entscheid.${art}`)}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {art === 'beobachten' && (
            <Feld id="gp-wv" label={t('grossprojekte.entscheid.bisDatum')} pflicht>
              <Input
                id="gp-wv"
                type="date"
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
          )}
          <Feld id="gp-grund" label={t('grossprojekte.entscheid.grund')} fehler={fehler} pflicht={art === 'verwerfen'}>
            <Textarea
              id="gp-grund"
              rows={3}
              value={grund}
              onChange={(e) => {
                setGrund(e.target.value)
                setFehler(undefined)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
