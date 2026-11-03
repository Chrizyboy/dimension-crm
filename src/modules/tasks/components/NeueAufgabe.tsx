import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { aufgabeSchema } from '../schema'
import { legeAufgabeAn } from '../services/aufgaben'
import type { Person } from '../types'

/** Vorbelegung aus der Schnelleingabe oder von einem Datensatz (Lead, Projekt …). */
export interface AufgabeVorlage {
  titel?: string
  faellig_am?: string
  person_id?: string
  wichtig?: boolean
  bezug_tabelle?: string
  bezug_id?: string
}

/** Neue Aufgabe von Hand: Titel, Notiz, fällig am, für wen (Vorgabe: ich), wichtig, Wiederholung, Bezug. */
export function NeueAufgabe({
  personen,
  ichId,
  vorlage,
  onSchliessen,
}: {
  personen: Person[]
  ichId: string | null
  vorlage?: AufgabeVorlage
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [e, setE] = useState({
    titel: vorlage?.titel ?? '',
    text: '',
    faellig_am: vorlage?.faellig_am ?? '',
    person_id: vorlage?.person_id || ichId || '',
    wichtig: vorlage?.wichtig ?? false,
    wiederholung: 'nie',
  })
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [laeuft, setLaeuft] = useState(false)

  async function speichern() {
    const r = aufgabeSchema.safeParse({
      ...e,
      wiederholung: e.wiederholung === 'nie' ? '' : e.wiederholung,
      ...(vorlage?.bezug_tabelle && vorlage.bezug_id
        ? { bezug_tabelle: vorlage.bezug_tabelle, bezug_id: vorlage.bezug_id }
        : {}),
    })
    if (!r.success) {
      setFehler(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), t(i.message)])))
      return
    }
    setLaeuft(true)
    try {
      await legeAufgabeAn(r.data)
      melde('ok', { de: 'Aufgabe angelegt', fr: 'Tâche créée' })
      void client.invalidateQueries({ queryKey: ['aufgaben'] })
      void client.invalidateQueries({ queryKey: ['mein-tag'] })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'aufgaben')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setLaeuft(false)
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
        titel={t('aufgaben.neu')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button disabled={laeuft} onClick={() => void speichern()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="aufgabe-titel" label={t('aufgaben.feld.titel')} pflicht fehler={fehler.titel}>
            <Input
              id="aufgabe-titel"
              value={e.titel}
              onChange={(x) => {
                setE({ ...e, titel: x.target.value })
              }}
            />
          </Feld>
          <Feld id="aufgabe-text" label={t('aufgaben.feld.text')}>
            <Textarea
              id="aufgabe-text"
              value={e.text}
              onChange={(x) => {
                setE({ ...e, text: x.target.value })
              }}
            />
          </Feld>
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id="aufgabe-faellig" label={t('aufgaben.feld.faellig')} fehler={fehler.faellig_am}>
              <Input
                id="aufgabe-faellig"
                type="date"
                value={e.faellig_am}
                onChange={(x) => {
                  setE({ ...e, faellig_am: x.target.value })
                }}
              />
            </Feld>
            <Feld id="aufgabe-person" label={t('aufgaben.feld.person')} pflicht fehler={fehler.person_id}>
              <Auswahl
                id="aufgabe-person"
                value={e.person_id}
                optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
                onValueChange={(person_id) => {
                  setE({ ...e, person_id })
                }}
              />
            </Feld>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <Feld id="aufgabe-wiederholung" label={t('aufgaben.feld.wiederholung')}>
              <Auswahl
                id="aufgabe-wiederholung"
                value={e.wiederholung}
                optionen={(['nie', 'woche', 'monat', 'quartal', 'jahr'] as const).map((w) => ({
                  wert: w,
                  text: t(`aufgaben.wiederholung.${w}`),
                }))}
                onValueChange={(wiederholung) => {
                  setE({ ...e, wiederholung })
                }}
              />
            </Feld>
            <label className="flex h-8 items-center gap-2 text-sm">
              <Switch
                checked={e.wichtig}
                onCheckedChange={(wichtig) => {
                  setE({ ...e, wichtig })
                }}
              />
              {t('aufgaben.wichtig')}
            </label>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
