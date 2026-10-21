import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAussendienst, useVerkaufAenderung } from '../hooks/useVerkauf'
import { fachFehler } from '../lib/fehler'
import { heuteIso } from '../lib/geschaeft'
import { erfasseKontakt } from '../services/geschaefte'
import type { Geschaeft, StandAngaben } from '../types'

const ARTEN = ['anruf', 'mail', 'sms', 'besuch', 'notiz'] as const
/** Ergebnisse, die den Lead weiterführen (V152); die Liste selbst kommt aus der Datenbank. */
const MIT_DATUM = new Set(['rueckruf', 'meldet_sich'])

/**
 * Kontakt mit einem Lead erfassen (V152): Art, Ergebnis und Notiz. Das Ergebnis führt den Lead nach:
 * Termin → «Termin vereinbart», Rückruf mit Datum → «später kontaktieren», kein Interesse → Grund.
 */
export default function KontaktErfassenDialog({
  geschaeft,
  onSchliessen,
}: {
  geschaeft: Geschaeft
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const arten = useAuswahl('aktivitaet')
  const ergebnisse = useAuswahl('kontaktergebnis')
  const personen = useAussendienst()
  const ich = useAnmeldung((z) => z.ich?.id ?? '')
  const [art, setArt] = useState<string>('anruf')
  const [ergebnis, setErgebnis] = useState<string>('')
  const [text, setText] = useState('')
  const [datum, setDatum] = useState(heuteIso())
  const [zeit, setZeit] = useState('09:00')
  const [dauer, setDauer] = useState('60')
  const [person, setPerson] = useState(
    geschaeft.terminPersonId ?? (personen.data?.some((p) => p.id === ich) ? ich : ''),
  )
  const [grund, setGrund] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useVerkaufAenderung(erfasseKontakt)
  const mitErgebnis = art !== 'notiz'

  async function absenden() {
    const angaben: StandAngaben = {}
    if (ergebnis === 'termin') {
      angaben.termin_am = new Date(`${datum}T${zeit}`).toISOString()
      angaben.dauer_min = Number(dauer)
      angaben.person_id = person
    }
    if (MIT_DATUM.has(ergebnis) && datum > heuteIso()) {
      angaben.datum = datum
      angaben.grund = t(`verkauf.kontakt.grundRueckruf`)
    }
    if (ergebnis === 'kein_interesse') angaben.grund = grund
    try {
      await speichern.mutateAsync({
        verkaufschanceId: geschaeft.verkaufschanceId ?? '',
        art,
        richtung: art === 'notiz' ? null : 'aus',
        ergebnis: mitErgebnis && ergebnis ? ergebnis : null,
        text,
        angaben,
      })
      melde('ok', { de: 'Kontakt erfasst', fr: 'Contact enregistré' })
      onSchliessen()
    } catch (f) {
      const s = fachFehler(f)
      if (s) setFehler(t(s))
      else {
        meldeFehler(f, 'kontakt')
        setFehler(t('verkauf.fehler.allgemein'))
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.akte.kontaktErfassen')}
        beschreibung={geschaeft.name}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label={t('aktivitaet.art')} className="flex flex-wrap gap-1.5">
            {ARTEN.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={art === a}
                onClick={() => {
                  setArt(a)
                }}
                className={cn(
                  'focus-visible:ring-ring h-7 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2',
                  art === a ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
                )}
              >
                {arten.text(a)}
              </button>
            ))}
          </div>
          {mitErgebnis && (
            <div
              role="radiogroup"
              aria-label={t('aktivitaet.ergebnis')}
              className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
            >
              {ergebnisse.werte.map((e) => (
                <button
                  key={e.schluessel}
                  type="button"
                  role="radio"
                  aria-checked={ergebnis === e.schluessel}
                  onClick={() => {
                    setErgebnis(ergebnis === e.schluessel ? '' : e.schluessel)
                  }}
                  className={cn(
                    'focus-visible:ring-ring h-8 rounded-md border px-2 text-xs font-medium outline-none focus-visible:ring-2',
                    ergebnis === e.schluessel ? 'border-accent bg-accent-soft text-accent-ink' : 'hover:bg-muted',
                  )}
                >
                  {ergebnisse.text(e.schluessel)}
                </button>
              ))}
            </div>
          )}
          {(ergebnis === 'termin' || MIT_DATUM.has(ergebnis)) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Feld
                id="kontakt-datum"
                label={t(ergebnis === 'termin' ? 'verkauf.wechsel.terminAm' : 'verkauf.kontakt.wann')}
                pflicht={ergebnis === 'termin'}
              >
                <Input
                  id="kontakt-datum"
                  type="date"
                  min={heuteIso()}
                  value={datum}
                  onChange={(e) => {
                    setDatum(e.target.value)
                  }}
                />
              </Feld>
              {ergebnis === 'termin' && (
                <Feld id="kontakt-zeit" label={t('verkauf.wechsel.zeit')} pflicht>
                  <Input
                    id="kontakt-zeit"
                    type="time"
                    step={900}
                    value={zeit}
                    onChange={(e) => {
                      setZeit(e.target.value)
                    }}
                  />
                </Feld>
              )}
              {ergebnis === 'termin' && (
                <Feld id="kontakt-person" label={t('verkauf.terminBei')} pflicht>
                  <Auswahl
                    id="kontakt-person"
                    value={person}
                    platzhalter={t('verkauf.personWaehlen')}
                    onValueChange={setPerson}
                    optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
                  />
                </Feld>
              )}
              {ergebnis === 'termin' && (
                <Feld id="kontakt-dauer" label={t('verkauf.wechsel.dauer')}>
                  <Auswahl
                    id="kontakt-dauer"
                    value={dauer}
                    onValueChange={setDauer}
                    optionen={['30', '45', '60', '90', '120'].map((m) => ({ wert: m, text: `${m} Min` }))}
                  />
                </Feld>
              )}
            </div>
          )}
          {ergebnis === 'kein_interesse' && (
            <Feld id="kontakt-grund" label={t('verkauf.wechsel.grund')} pflicht>
              <Input
                id="kontakt-grund"
                value={grund}
                onChange={(e) => {
                  setGrund(e.target.value)
                }}
              />
            </Feld>
          )}
          <Feld id="kontakt-text" label={t('aktivitaet.text')}>
            <Textarea
              id="kontakt-text"
              rows={3}
              autoFocus
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void absenden()
              }}
            />
          </Feld>
          {fehler && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
