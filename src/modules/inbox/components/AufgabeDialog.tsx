import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/usePosteingang'
import { absender } from '../lib/anzeige'
import { aufgabeAnlegen } from '../services/arbeit'
import type { Mail } from '../types'

/** Aufgabe aus der Mail (unter «Aufgaben», mit Link zur Mail); für jemand anderen mit Glocke. */
export function AufgabeDialog({ mail, onSchliessen }: { mail: Mail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const personen = usePersonen().data ?? []
  const { laeuft, aus } = useAktion()
  const [titel, setTitel] = useState(`${absender(mail)}: ${mail.betreff ?? ''}`.slice(0, 200))
  const [faellig, setFaellig] = useState('')
  const [wer, setWer] = useState(ich?.id ?? '')
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('posteingang.aufgabe.titel')}
        beschreibung={t('posteingang.aufgabe.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!titel.trim()}
              onClick={() =>
                void aus(() => aufgabeAnlegen(mail.id, titel, faellig || null, wer || null), {
                  de: 'Aufgabe angelegt',
                  fr: 'Tâche créée',
                }).then((ok) => {
                  if (ok) onSchliessen()
                })
              }
            >
              {t('posteingang.aufgabe.knopf')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld label={t('posteingang.aufgabe.was')} id="pe-aufgabe-titel" pflicht>
            <Input
              id="pe-aufgabe-titel"
              value={titel}
              maxLength={300}
              onChange={(e) => {
                setTitel(e.target.value)
              }}
            />
          </Feld>
          <Feld label={t('posteingang.aufgabe.bis')} id="pe-aufgabe-bis">
            <Input
              id="pe-aufgabe-bis"
              type="date"
              value={faellig}
              onChange={(e) => {
                setFaellig(e.target.value)
              }}
            />
          </Feld>
          <Feld label={t('posteingang.aufgabe.wer')} id="pe-aufgabe-wer">
            <Auswahl
              id="pe-aufgabe-wer"
              value={wer}
              onValueChange={setWer}
              optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
