import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import type { Referenz } from '../types'

type Entwurf = Partial<Referenz>

/** Referenz anlegen oder ändern. «Darf angefragt werden» erst, wenn die Ansprechperson zugestimmt hat. */
export function ReferenzDialog({
  referenz,
  laeuft,
  onSchliessen,
  onSpeichern,
}: {
  referenz: Entwurf
  laeuft: boolean
  onSchliessen: () => void
  onSpeichern: (r: Entwurf & { titel: string }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [w, setW] = useState<Entwurf>(referenz)
  const [fehler, setFehler] = useState(false)
  const setze = (teil: Entwurf) => {
    setW({ ...w, ...teil })
  }
  const text = (
    f: 'titel' | 'ort' | 'gebaeude' | 'auftraggeber' | 'ansprechperson' | 'telefon' | 'notiz',
    pflicht = false,
  ) => (
    <Feld
      id={`rf-${f}`}
      label={t(`ausschreibungen.referenzen.feld.${f}`)}
      pflicht={pflicht}
      {...(pflicht && fehler && !w[f] ? { fehler: t('pruefung.pflicht') } : {})}
    >
      <Input
        id={`rf-${f}`}
        value={w[f] ?? ''}
        onChange={(e) => {
          setze({ [f]: e.target.value || null })
        }}
      />
    </Feld>
  )
  const zahl = (f: 'leistung_kwp' | 'jahr') => (
    <Feld id={`rf-${f}`} label={t(`ausschreibungen.referenzen.feld.${f}`)}>
      <Input
        id={`rf-${f}`}
        type="number"
        min={0}
        value={w[f] ?? ''}
        onChange={(e) => {
          setze({ [f]: e.target.value ? Number(e.target.value) : null })
        }}
      />
    </Feld>
  )

  function speichern() {
    const titel = w.titel?.trim()
    if (!titel) {
      setFehler(true)
      return
    }
    void onSpeichern({ ...w, titel })
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(w.id ? 'ausschreibungen.referenzen.aendern' : 'ausschreibungen.referenzen.neu')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} onClick={speichern}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{text('titel', true)}</div>
          {text('ort')}
          {text('gebaeude')}
          {zahl('leistung_kwp')}
          {zahl('jahr')}
          {text('auftraggeber')}
          <Feld id="rf-sprache" label={t('ausschreibungen.referenzen.feld.sprache')}>
            <Auswahl
              id="rf-sprache"
              value={w.sprache ?? 'de'}
              onValueChange={(v) => {
                setze({ sprache: v as 'de' | 'fr' })
              }}
              optionen={[
                { wert: 'de', text: 'Deutsch' },
                { wert: 'fr', text: 'Français' },
              ]}
            />
          </Feld>
          {text('ansprechperson')}
          {text('telefon')}
          <div className="sm:col-span-2">{text('notiz')}</div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={w.freigegeben ?? false}
              onCheckedChange={(c) => {
                setze({ freigegeben: c === true })
              }}
            />
            {t('ausschreibungen.referenzen.freigegeben')}
          </label>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
