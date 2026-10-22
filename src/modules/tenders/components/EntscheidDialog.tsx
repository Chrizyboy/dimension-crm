import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { feldFehler } from '@/lib/formular'
import { BRAUCHT } from '../lib/entscheide'
import { entscheidSchema, type EntscheidFormular } from '../schema'

/**
 * Fragt die Angaben zu einem Entscheid ab: Grund bei «nicht teilnehmen», Datum bei «später», Form der
 * Eingabe, Auslöser beim Beobachten. Gibt die Angaben an onOk weiter.
 */
export function EntscheidDialog({
  entscheid,
  titel,
  laeuft,
  onOk,
  onAbbrechen,
}: {
  entscheid: string
  titel: string
  laeuft: boolean
  onOk: (angaben: Record<string, string>) => void
  onAbbrechen: () => void
}) {
  const { t } = useTranslation()
  const felder = BRAUCHT[entscheid] ?? []
  const [w, setW] = useState<EntscheidFormular>({
    entscheid,
    grund: '',
    datum: entscheid === 'eingereicht' ? new Date().toISOString().slice(0, 10) : '',
    form: '',
    ausloeser: entscheid === 'beobachten' ? 'datum' : '',
  })
  const [fehler, setFehler] = useState<Partial<Record<keyof EntscheidFormular, string>>>({})
  const setze = (f: keyof EntscheidFormular, v: string) => {
    setW({ ...w, [f]: v })
  }

  function ok() {
    const g = entscheidSchema.safeParse(w)
    if (!g.success) {
      setFehler(feldFehler(g.error.issues, t))
      return
    }
    const angaben: Record<string, string> = {}
    for (const f of felder) if (g.data[f]) angaben[f] = g.data[f]
    onOk(angaben)
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onAbbrechen()
      }}
    >
      <DialogInhalt
        titel={titel}
        fuss={
          <>
            <Button variant="ghost" onClick={onAbbrechen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              onClick={ok}
              laedt={laeuft}
              variant={['verwerfen', 'ablehnen'].includes(entscheid) ? 'danger' : 'primary'}
            >
              {t('ausschreibungen.bestaetigen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {felder.includes('ausloeser') && (
            <Feld id="as-ausloeser" label={t('ausschreibungen.feld.ausloeser')}>
              <Auswahl
                id="as-ausloeser"
                value={w.ausloeser}
                onValueChange={(v) => {
                  setze('ausloeser', v)
                }}
                optionen={['datum', 'zuschlag', 'planer', 'baubewilligung'].map((a) => ({
                  wert: a,
                  text: t(`ausschreibungen.ausloeser.${a}`),
                }))}
              />
            </Feld>
          )}
          {felder.includes('datum') && (entscheid !== 'beobachten' || w.ausloeser === 'datum') && (
            <Feld id="as-datum" label={t(`ausschreibungen.feld.datum_${entscheid}`)} fehler={fehler.datum} pflicht>
              <Input
                id="as-datum"
                type="date"
                value={w.datum}
                onChange={(e) => {
                  setze('datum', e.target.value)
                }}
              />
            </Feld>
          )}
          {felder.includes('form') && (
            <Feld id="as-form" label={t('ausschreibungen.feld.form')} fehler={fehler.form} pflicht>
              <Auswahl
                id="as-form"
                value={w.form}
                platzhalter={t('ausschreibungen.feld.formWaehlen')}
                onValueChange={(v) => {
                  setze('form', v)
                }}
                optionen={['simap', 'post', 'mail', 'hand'].map((f) => ({
                  wert: f,
                  text: t(`ausschreibungen.form.${f}`),
                }))}
              />
            </Feld>
          )}
          {felder.includes('grund') && (
            <Feld
              id="as-grund"
              label={t('ausschreibungen.feld.grund')}
              fehler={fehler.grund}
              pflicht={entscheid !== 'spaeter'}
            >
              <Input
                id="as-grund"
                value={w.grund}
                autoFocus
                onChange={(e) => {
                  setze('grund', e.target.value)
                }}
              />
            </Feld>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
