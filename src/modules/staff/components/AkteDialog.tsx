import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { akteSchema } from '../schema'
import { akteSpeichern } from '../services/personal'
import type { PersonalAkte } from '../types'

type Text = Exclude<keyof PersonalAkte, 'id' | 'person_id' | 'pensum'>
const PERSON: Text[] = [
  'geburtsdatum',
  'telefon_privat',
  'notfall_name',
  'notfall_telefon',
  'kleidergroesse',
  'schuhgroesse',
]
const ADMIN: Text[] = ['eintritt', 'austritt']
const DATUM = new Set<Text>(['geburtsdatum', 'eintritt', 'austritt'])

/**
 * Personal-Akte bearbeiten: Notfallkontakt, Grössen für Arbeitskleider und Geburtsdatum füllt jede Person selbst;
 * Eintritt, Austritt, Pensum und die Notiz nur die Administration (die Datenbank hält das ein). Lohn bleibt in AbaNinja.
 */
export function AkteDialog({
  personId,
  akte,
  admin,
  onSchliessen,
}: {
  personId: string
  akte: PersonalAkte | null
  admin: boolean
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState<Record<Text, string>>(() => {
    const leer = {} as Record<Text, string>
    for (const k of [...PERSON, ...ADMIN, 'notiz' as const]) leer[k] = akte?.[k] ?? ''
    return leer
  })
  const [pensum, setPensum] = useState(akte?.pensum?.toString() ?? '')
  const pensumZahl = pensum.trim() === '' ? null : Number(pensum)
  const gueltig = akteSchema.safeParse({
    pensum: pensumZahl,
    eintritt: w.eintritt || null,
    austritt: w.austritt || null,
  }).success

  async function speichern() {
    const werte = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.trim() || null])) as Record<
      Text,
      string | null
    >
    const ok = await aus(() => akteSpeichern({ ...werte, person_id: personId, pensum: pensumZahl }, akte?.id ?? null), {
      de: 'Gespeichert',
      fr: 'Enregistré',
    })
    if (ok) onSchliessen()
  }

  const feld = (k: Text) => (
    <Feld key={k} id={`pa-${k}`} label={t(`team.akte.${k}`)}>
      <Input
        id={`pa-${k}`}
        type={DATUM.has(k) ? 'date' : 'text'}
        {...(k.includes('telefon') ? { inputMode: 'tel' as const, placeholder: '+41 79 …' } : {})}
        value={w[k]}
        onChange={(e) => {
          setW({ ...w, [k]: e.target.value })
        }}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('team.akte.titel')}
        beschreibung={t('team.akte.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!gueltig}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {PERSON.map(feld)}
          {admin && (
            <>
              {ADMIN.map(feld)}
              <Feld id="pa-pensum" label={t('team.akte.pensum')}>
                <Input
                  id="pa-pensum"
                  inputMode="numeric"
                  placeholder="100"
                  value={pensum}
                  onChange={(e) => {
                    setPensum(e.target.value)
                  }}
                />
              </Feld>
              <Feld
                id="pa-notiz"
                label={t('team.akte.notiz')}
                hinweis={t('team.akte.notizHinweis')}
                className="sm:col-span-2"
              >
                <Textarea
                  id="pa-notiz"
                  rows={2}
                  value={w.notiz}
                  onChange={(e) => {
                    setW({ ...w, notiz: e.target.value })
                  }}
                />
              </Feld>
            </>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
