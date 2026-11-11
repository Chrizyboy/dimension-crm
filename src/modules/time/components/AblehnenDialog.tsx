import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { abwesenheitEntscheiden } from '../services/zeit'
import type { Abwesenheit } from '../types'

/** Antrag ablehnen: nur mit Grund, den die Person in der Glocke liest. */
export function AblehnenDialog({ abwesenheit, onSchliessen }: { abwesenheit: Abwesenheit; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState('')
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('zeit.ablehnen.titel')}
        beschreibung={t('zeit.ablehnen.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              variant="danger"
              laedt={laeuft}
              disabled={!grund.trim()}
              onClick={() =>
                void aus(() => abwesenheitEntscheiden(abwesenheit.id, false, grund.trim()), {
                  de: 'Abgelehnt',
                  fr: 'Refusée',
                }).then((ok) => {
                  if (ok) onSchliessen()
                })
              }
            >
              {t('zeit.antraege.ablehnen')}
            </Button>
          </>
        }
      >
        <Feld id="ab-grund" label={t('zeit.ablehnen.grund')} pflicht>
          <Textarea
            id="ab-grund"
            rows={3}
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
