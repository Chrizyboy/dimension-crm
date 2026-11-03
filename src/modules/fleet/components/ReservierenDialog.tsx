import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useFahrzeuge, useWahl } from '../hooks/useRessourcen'
import { heuteZuerich } from '../lib/fristen'
import { reservieren } from '../services/belegung'
import type { Belegung } from '../types'

const NIEMAND = '-'

/**
 * Reservieren: ein Fahrzeug oder Gerät für einen Zeitraum (von Hand oder Werkstatt), oder für einen Einsatz aus
 * dem Zeitplan ein anderes Fahrzeug wählen als das, das dem Team automatisch folgt.
 */
export function ReservierenDialog({
  bezug,
  einsatz,
  tag,
  onSchliessen,
}: {
  bezug?: { fahrzeug?: string; geraet?: string }
  einsatz?: Belegung
  /** Vorgeschlagener Tag (Klick in den Plan). */
  tag?: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const personen = useWahl().data?.personen ?? []
  const fahrzeuge = (useFahrzeuge().data ?? []).filter((f) => !f.ausser_betrieb)
  const { laeuft, aus } = useAktion()
  const heute = heuteZuerich()
  const [id] = useState(() => einsatz?.reservierung_id ?? crypto.randomUUID())
  const [von, setVon] = useState(einsatz?.von ?? tag ?? heute)
  const [bis, setBis] = useState(einsatz?.bis ?? tag ?? heute)
  const [art, setArt] = useState<'hand' | 'werkstatt'>('hand')
  const [fahrzeug, setFahrzeug] = useState(einsatz?.fahrzeug_id ?? '')
  const [person, setPerson] = useState(einsatz?.person_id ?? ich?.id ?? NIEMAND)
  const [zweck, setZweck] = useState('')
  const gueltig = von && bis && bis >= von && (!einsatz || fahrzeug)

  async function speichern() {
    const ok = await aus(
      () =>
        reservieren({
          id,
          fahrzeug_id: einsatz ? fahrzeug : (bezug?.fahrzeug ?? null),
          geraet_id: einsatz ? null : (bezug?.geraet ?? null),
          von,
          bis,
          art: einsatz ? 'einsatz' : art,
          einsatz_id: einsatz?.einsatz_id ?? null,
          person_id: person === NIEMAND ? null : person,
          zweck: zweck.trim() || null,
        }),
      { de: 'Reserviert', fr: 'Réservé' },
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
        titel={t(einsatz ? 'fuhrpark.reservieren.titelEinsatz' : 'fuhrpark.reservieren.titel')}
        {...(einsatz?.projekt ? { beschreibung: einsatz.projekt } : {})}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!gueltig}>
              {t('fuhrpark.reservieren.knopf')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {einsatz && (
            <Feld id="rs-fahrzeug" label={t('fuhrpark.spalte.fahrzeug')} pflicht className="sm:col-span-2">
              <Auswahl
                id="rs-fahrzeug"
                value={fahrzeug}
                onValueChange={setFahrzeug}
                optionen={fahrzeuge.map((f) => ({ wert: f.id, text: `${f.bezeichnung} (${f.kennzeichen})` }))}
              />
            </Feld>
          )}
          <Feld id="rs-von" label={t('fuhrpark.reservieren.von')} pflicht>
            <Input
              id="rs-von"
              type="date"
              value={von}
              disabled={Boolean(einsatz)}
              onChange={(e) => {
                setVon(e.target.value)
              }}
            />
          </Feld>
          <Feld id="rs-bis" label={t('fuhrpark.reservieren.bis')} pflicht>
            <Input
              id="rs-bis"
              type="date"
              min={von}
              value={bis}
              disabled={Boolean(einsatz)}
              onChange={(e) => {
                setBis(e.target.value)
              }}
            />
          </Feld>
          {!einsatz && (
            <Feld id="rs-art" label={t('fuhrpark.reservieren.art')} pflicht>
              <Auswahl
                id="rs-art"
                value={art}
                onValueChange={(v) => {
                  setArt(v as 'hand' | 'werkstatt')
                }}
                optionen={(['hand', 'werkstatt'] as const).map((a) => ({
                  wert: a,
                  text: t(`fuhrpark.belegung.art.${a}`),
                }))}
              />
            </Feld>
          )}
          <Feld id="rs-person" label={t('fuhrpark.reservieren.fuer')}>
            <Auswahl
              id="rs-person"
              value={person}
              onValueChange={setPerson}
              optionen={[{ wert: NIEMAND, text: '–' }, ...personen.map((p) => ({ wert: p.id, text: p.name }))]}
            />
          </Feld>
          <Feld id="rs-zweck" label={t('fuhrpark.reservieren.zweck')} className="sm:col-span-2">
            <Input
              id="rs-zweck"
              placeholder={t('fuhrpark.reservieren.zweckBeispiel')}
              value={zweck}
              onChange={(e) => {
                setZweck(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
