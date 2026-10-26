import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { useWahl } from '../hooks/useRessourcen'
import { fahrzeugSchema } from '../schema'
import { entfernen, fahrzeugSpeichern } from '../services/ressourcen'
import type { Fahrzeug } from '../types'

const KEINE = '-'
const zahl = (s: string) => (s.trim() === '' ? null : Number(s.replace(/['\s]/g, '')))

/**
 * Fahrzeug anlegen oder ändern. Die Fristen (MFK, Service) setzt man hier nur beim Anlegen; danach setzen
 * sie die Einträge (MFK erfasst, Service gemacht), damit der Verlauf stimmt.
 */
export function FahrzeugDialog({
  fahrzeug,
  onFertig,
  onSchliessen,
}: {
  fahrzeug: Fahrzeug | null
  onFertig: (id: string | null) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const wahl = useWahl().data
  const { laeuft, aus } = useAktion()
  const f = fahrzeug
  const [w, setW] = useState({
    kennzeichen: f?.kennzeichen ?? '',
    bezeichnung: f?.bezeichnung ?? '',
    marke_modell: f?.marke_modell ?? '',
    jahrgang: f?.jahrgang?.toString() ?? '',
    km_stand: f?.km_stand?.toString() ?? '',
    naechste_mfk: f?.naechste_mfk ?? '',
    naechster_service: f?.naechster_service ?? '',
    standort_id: f?.standort_id ?? KEINE,
    leasing_bis: f?.leasing_bis ?? '',
    versicherung: f?.versicherung ?? '',
    ausser_betrieb: f?.ausser_betrieb ?? false,
    notiz: f?.notiz ?? '',
  })
  const setze = (teil: Partial<typeof w>) => {
    setW({ ...w, ...teil })
  }
  const gueltig = fahrzeugSchema.safeParse({
    kennzeichen: w.kennzeichen,
    bezeichnung: w.bezeichnung,
    jahrgang: zahl(w.jahrgang),
    km_stand: zahl(w.km_stand),
  }).success

  async function speichern() {
    const leer = (s: string) => s.trim() || null
    let id: string | null = null
    const ok = await aus(
      async () => {
        id = await fahrzeugSpeichern(
          {
            kennzeichen: w.kennzeichen.trim().toUpperCase(),
            bezeichnung: w.bezeichnung.trim(),
            marke_modell: leer(w.marke_modell),
            jahrgang: zahl(w.jahrgang),
            standort_id: w.standort_id === KEINE ? null : w.standort_id,
            leasing_bis: leer(w.leasing_bis),
            versicherung: leer(w.versicherung),
            ausser_betrieb: w.ausser_betrieb,
            notiz: leer(w.notiz),
            // Beim Anlegen: Startwerte; später setzen sie die Einträge.
            ...(f
              ? {}
              : {
                  km_stand: zahl(w.km_stand),
                  km_stand_am: zahl(w.km_stand) === null ? null : new Date().toISOString().slice(0, 10),
                  naechste_mfk: leer(w.naechste_mfk),
                  naechster_service: leer(w.naechster_service),
                }),
          },
          f?.id,
        )
      },
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onFertig(id)
  }

  const feld = (k: 'kennzeichen' | 'bezeichnung' | 'marke_modell' | 'versicherung', pflicht = false, ph?: string) => (
    <Feld id={`fz-${k}`} label={t(`fuhrpark.feld.${k}`)} pflicht={pflicht}>
      <Input
        id={`fz-${k}`}
        value={w[k]}
        {...(ph ? { placeholder: ph } : {})}
        onChange={(e) => {
          setze({ [k]: e.target.value })
        }}
      />
    </Feld>
  )
  const datum = (k: 'naechste_mfk' | 'naechster_service' | 'leasing_bis') => (
    <Feld id={`fz-${k}`} label={t(`fuhrpark.feld.${k}`)}>
      <Input
        id={`fz-${k}`}
        type="date"
        value={w[k]}
        onChange={(e) => {
          setze({ [k]: e.target.value })
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
        titel={f ? t('fuhrpark.fahrzeug.bearbeiten') : t('fuhrpark.fahrzeug.neu')}
        fuss={
          <>
            {f && (
              <Button
                variant="ghost"
                className="text-bad mr-auto"
                laedt={laeuft}
                onClick={() => {
                  void aus(() => entfernen('fahrzeuge', f.id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then(
                    (ok) => {
                      if (ok) onFertig(null)
                    },
                  )
                }}
              >
                {t('fuhrpark.entfernen')}
              </Button>
            )}
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
          {feld('bezeichnung', true, t('fuhrpark.feld.bezeichnungBeispiel'))}
          {feld('kennzeichen', true, 'AG 123 456')}
          {feld('marke_modell')}
          <Feld id="fz-jahrgang" label={t('fuhrpark.feld.jahrgang')}>
            <Input
              id="fz-jahrgang"
              inputMode="numeric"
              value={w.jahrgang}
              onChange={(e) => {
                setze({ jahrgang: e.target.value })
              }}
            />
          </Feld>
          {!f && (
            <>
              <Feld id="fz-km" label={t('fuhrpark.feld.km_stand')}>
                <Input
                  id="fz-km"
                  inputMode="numeric"
                  value={w.km_stand}
                  onChange={(e) => {
                    setze({ km_stand: e.target.value })
                  }}
                />
              </Feld>
              {datum('naechste_mfk')}
              {datum('naechster_service')}
            </>
          )}
          <Feld id="fz-standort" label={t('fuhrpark.feld.standort')}>
            <Auswahl
              id="fz-standort"
              value={w.standort_id}
              onValueChange={(v) => {
                setze({ standort_id: v })
              }}
              optionen={[
                { wert: KEINE, text: '–' },
                ...(wahl?.standorte ?? []).map((s) => ({ wert: s.id, text: s.name })),
              ]}
            />
          </Feld>
          {datum('leasing_bis')}
          {feld('versicherung')}
          <Feld id="fz-notiz" label={t('fuhrpark.feld.notiz')} className="sm:col-span-2">
            <Textarea
              id="fz-notiz"
              rows={2}
              value={w.notiz}
              onChange={(e) => {
                setze({ notiz: e.target.value })
              }}
            />
          </Feld>
          {f && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Switch
                checked={w.ausser_betrieb}
                onCheckedChange={(an) => {
                  setze({ ausser_betrieb: an })
                }}
              />
              {t('fuhrpark.ausserBetrieb')}
            </label>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
