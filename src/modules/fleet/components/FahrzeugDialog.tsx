import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { useWahl } from '../hooks/useRessourcen'
import { ABSCHNITTE, alsFormular, ausFormular, type FeldDef } from '../lib/fahrzeugFelder'
import { heuteZuerich } from '../lib/fristen'
import { entfernen, fahrzeugSpeichern } from '../services/ressourcen'
import { TREIBSTOFFE, type Fahrzeug } from '../types'

const KEINE = '-'
const FUEHRERAUSWEIS = /^fuehrerausweis_/

/**
 * Fahrzeug anlegen oder ändern, in Abschnitten (Grunddaten, Technik, Leasing und Kauf, Versicherung, Weiteres).
 * Die Fristen setzt man hier nur beim Anlegen; danach setzen sie die Einträge (MFK erfasst, Service gemacht,
 * Reifen gewechselt), damit der Verlauf stimmt.
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
  const arten = useAuswahl('fahrzeugart')
  const ausweise = useAuswahl('qualifikation')
  const { laeuft, aus } = useAktion()
  const f = fahrzeug
  const [w, setW] = useState(() => alsFormular(f))
  const [abschnitt, setAbschnitt] = useState('grund')
  const { werte, fehler } = ausFormular(w, !f, heuteZuerich())

  const optionen = (k: FeldDef['k']) => {
    const mitLeer = (liste: { wert: string; text: string }[]) => [{ wert: KEINE, text: '–' }, ...liste]
    if (k === 'art') return arten.werte.map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))
    if (k === 'treibstoff') return mitLeer(TREIBSTOFFE.map((x) => ({ wert: x, text: t(`fuhrpark.treibstoff.${x}`) })))
    if (k === 'standort_id') return mitLeer((wahl?.standorte ?? []).map((s) => ({ wert: s.id, text: s.name })))
    return mitLeer(
      ausweise.werte
        .filter((a) => FUEHRERAUSWEIS.test(a.schluessel))
        .map((a) => ({ wert: a.schluessel, text: ausweise.text(a.schluessel) })),
    )
  }

  const eingabe = (d: FeldDef) => {
    const id = `fz-${d.k}`
    const wert = w[d.k] ?? ''
    const setze = (v: string) => {
      setW({ ...w, [d.k]: v })
    }
    if (d.art === 'schalter')
      return (
        <label key={d.k} className="flex items-center gap-2 text-sm sm:col-span-2">
          <Switch
            checked={wert === 'ja'}
            onCheckedChange={(an) => {
              setze(an ? 'ja' : '')
            }}
          />
          {t(`fuhrpark.feld.${d.k}`)}
        </label>
      )
    return (
      <Feld
        key={d.k}
        id={id}
        label={t(`fuhrpark.feld.${d.k}`)}
        pflicht={d.pflicht ?? false}
        className={d.breit ? 'sm:col-span-2' : ''}
        {...(fehler.includes(d.k) && wert !== '' ? { fehler: t('fuhrpark.feld.ungueltig') } : {})}
      >
        {d.art === 'auswahl' ? (
          <Auswahl
            id={id}
            value={wert || KEINE}
            onValueChange={(v) => {
              setze(v === KEINE ? '' : v)
            }}
            optionen={optionen(d.k)}
          />
        ) : d.k === 'notiz' ? (
          <Textarea
            id={id}
            rows={3}
            value={wert}
            onChange={(e) => {
              setze(e.target.value)
            }}
          />
        ) : (
          <Input
            id={id}
            type={d.art === 'datum' ? 'date' : 'text'}
            inputMode={d.art === 'zahl' ? 'numeric' : d.art === 'chf' ? 'decimal' : undefined}
            placeholder={d.art === 'chf' ? '0.00' : d.k === 'kennzeichen' ? 'AG 123 456' : undefined}
            value={wert}
            onChange={(e) => {
              setze(e.target.value)
            }}
          />
        )}
      </Feld>
    )
  }

  async function speichern() {
    let id: string | null = null
    const ok = await aus(
      async () => {
        id = await fahrzeugSpeichern(werte, f?.id)
      },
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onFertig(id)
  }

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
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={fehler.length > 0}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <Reiter value={abschnitt} onValueChange={setAbschnitt}>
          <ReiterListe>
            {ABSCHNITTE.map((a) => (
              <ReiterKnopf key={a.id} value={a.id}>
                {t(`fuhrpark.abschnitt.${a.id}`)}
              </ReiterKnopf>
            ))}
          </ReiterListe>
          {ABSCHNITTE.map((a) => (
            <ReiterInhalt key={a.id} value={a.id} className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {a.felder.filter((d) => !(d.nurNeu && f) && !(d.nurBearbeiten && !f)).map(eingabe)}
              </div>
            </ReiterInhalt>
          ))}
        </Reiter>
      </DialogInhalt>
    </Dialog>
  )
}
