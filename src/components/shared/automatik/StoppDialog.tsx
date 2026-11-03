import { CircleStop } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'

/**
 * Fragt den Grund, bevor eine Automation für einen Datensatz anhält. Der Grund ist Pflicht, weil er in der
 * Zeitachse des Kunden steht und Kolleginnen später verstehen sollen, warum keine Erinnerung mehr kam.
 */
export function StoppDialog({
  name,
  laeuft,
  onStoppen,
  onSchliessen,
}: {
  name: string
  laeuft: boolean
  onStoppen: (grund: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const [grund, setGrund] = useState('')
  const leer = grund.trim().length < 3
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('automatik.stoppenTitel', { name })}
        beschreibung={t('automatik.stoppenText')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              disabled={leer || laeuft}
              onClick={() => {
                onStoppen(grund.trim())
              }}
            >
              <CircleStop />
              {t('automatik.stoppen')}
            </Button>
          </>
        }
      >
        <Feld id="stopp-grund" label={t('automatik.grund')} hinweis={t('automatik.grundHinweis')} pflicht>
          <Textarea
            id="stopp-grund"
            value={grund}
            autoFocus
            placeholder={t('automatik.grundBeispiel')}
            onChange={(e) => {
              setGrund(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
