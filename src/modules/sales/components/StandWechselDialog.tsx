import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAussendienst, useVerkaufAenderung } from '../hooks/useVerkauf'
import { fachFehler } from '../lib/fehler'
import { heuteIso, standBedarf } from '../lib/geschaeft'
import { setzeStand } from '../services/geschaefte'
import type { Geschaeft, StandAngaben } from '../types'

interface StandWechselDialogProps {
  geschaeft: Geschaeft
  ziel: string
  /** Vorschlag aus dem Kalender: Tag, Uhrzeit und Person des gewählten freien Platzes. */
  vorschlag?: { datum: string; zeit: string; personId: string }
  onSchliessen: (gespeichert: boolean) => void
}

/** Häufige Gründe aus V233 als Vorschläge; der Text bleibt frei. */
const GRUENDE = [
  'zu_teuer',
  'anderer_anbieter',
  'kein_bedarf',
  'nicht_erreichbar',
  'dach_ungeeignet',
  'spaeter',
] as const

/** Ein Datum in einigen Tagen (ISO), Vorschlag für «später kontaktieren» und «vertagt». */
function inTagenIso(tage: number): string {
  const d = new Date()
  d.setDate(d.getDate() + tage)
  return heuteIso(d)
}

/**
 * Fragt beim Wechsel des Stands ab, was der neue Stand braucht (V170, V200): Grund bei «kein Interesse»
 * und «verloren», Datum und Grund bei «später» und «vertagt», Termin mit Person, Datum beim Versand,
 * Notiz bei einer Richtofferte ohne Besuch. Die Datenbank prüft dieselben Regeln noch einmal.
 */
export default function StandWechselDialog({ geschaeft, ziel, vorschlag, onSchliessen }: StandWechselDialogProps) {
  const { t } = useTranslation()
  const staende = useAuswahl('kundenstand')
  const personen = useAussendienst()
  const bedarf = standBedarf(geschaeft.stand, ziel)
  const [datum, setDatum] = useState(
    vorschlag?.datum ?? (bedarf === 'gesendet' ? heuteIso() : inTagenIso(bedarf === 'datumGrund' ? 30 : 0)),
  )
  const [zeit, setZeit] = useState(vorschlag?.zeit ?? '09:00')
  const [dauer, setDauer] = useState(String(geschaeft.terminDauerMin ?? 60))
  const [person, setPerson] = useState(vorschlag?.personId ?? geschaeft.terminPersonId ?? geschaeft.personId ?? '')
  const [grund, setGrund] = useState('')
  const [notiz, setNotiz] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useVerkaufAenderung((a: StandAngaben) => setzeStand(geschaeft.id, ziel, a))

  async function absenden() {
    const a: StandAngaben = {}
    if (bedarf === 'grund' || bedarf === 'datumGrund') a.grund = grund
    if (bedarf === 'datumGrund' || bedarf === 'gesendet') a.datum = datum
    if (bedarf === 'termin') {
      a.termin_am = new Date(`${datum}T${zeit}`).toISOString()
      a.dauer_min = Number(dauer) || 60
      a.person_id = person
    }
    if (bedarf === 'richtofferte') a.richtofferte = true
    if (notiz) a.notiz = notiz
    try {
      await speichern.mutateAsync(a)
      melde('ok', {
        de: `Neu: ${staende.finde(ziel)?.text_de ?? ziel}`,
        fr: `Nouveau : ${staende.finde(ziel)?.text_fr ?? ziel}`,
      })
      onSchliessen(true)
    } catch (f) {
      const schluessel = fachFehler(f)
      if (schluessel) setFehler(t(schluessel))
      else {
        meldeFehler(f, 'stand')
        setFehler(t('verkauf.fehler.allgemein'))
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen(false)
      }}
    >
      <DialogInhalt
        titel={t('verkauf.wechsel.titel', { name: geschaeft.name })}
        beschreibung={`${staende.text(geschaeft.stand)} → ${staende.text(ziel)}`}
        fuss={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onSchliessen(false)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <ArrowRight />
              {t('verkauf.wechsel.speichern')}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void absenden()
          }}
        >
          {bedarf === 'richtofferte' && (
            <p className="bg-info-soft text-info rounded-md p-3 text-sm">{t('verkauf.wechsel.richtofferteHinweis')}</p>
          )}
          {(bedarf === 'datumGrund' || bedarf === 'gesendet' || bedarf === 'termin') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Feld
                id="wechsel-datum"
                label={t(
                  bedarf === 'gesendet'
                    ? 'verkauf.wechsel.gesendetAm'
                    : bedarf === 'termin'
                      ? 'verkauf.wechsel.terminAm'
                      : 'verkauf.wechsel.wiederAm',
                )}
                pflicht
              >
                <Input
                  id="wechsel-datum"
                  type="date"
                  value={datum}
                  min={bedarf === 'gesendet' ? undefined : heuteIso()}
                  onChange={(e) => {
                    setDatum(e.target.value)
                  }}
                />
              </Feld>
              {bedarf === 'termin' && (
                <Feld id="wechsel-zeit" label={t('verkauf.wechsel.zeit')} pflicht>
                  <Input
                    id="wechsel-zeit"
                    type="time"
                    step={900}
                    value={zeit}
                    onChange={(e) => {
                      setZeit(e.target.value)
                    }}
                  />
                </Feld>
              )}
              {bedarf === 'datumGrund' && (
                <div className="flex flex-wrap items-end gap-1.5 pb-0.5">
                  {[7, 30, 90, 180].map((tage) => (
                    <Button
                      key={tage}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDatum(inTagenIso(tage))
                      }}
                    >
                      {t('verkauf.wechsel.inTagen', { count: tage })}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          {bedarf === 'termin' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Feld id="wechsel-person" label={t('verkauf.terminBei')} pflicht>
                <Auswahl
                  id="wechsel-person"
                  value={person}
                  platzhalter={t('verkauf.personWaehlen')}
                  onValueChange={setPerson}
                  optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
                />
              </Feld>
              <Feld id="wechsel-dauer" label={t('verkauf.wechsel.dauer')}>
                <Auswahl
                  id="wechsel-dauer"
                  value={dauer}
                  onValueChange={setDauer}
                  optionen={['30', '45', '60', '90', '120'].map((m) => ({ wert: m, text: `${m} Min` }))}
                />
              </Feld>
            </div>
          )}
          {(bedarf === 'grund' || bedarf === 'datumGrund') && (
            <Feld id="wechsel-grund" label={t('verkauf.wechsel.grund')} pflicht>
              <Input
                id="wechsel-grund"
                autoFocus
                list="wechsel-gruende"
                value={grund}
                onChange={(e) => {
                  setGrund(e.target.value)
                }}
              />
              <datalist id="wechsel-gruende">
                {GRUENDE.map((g) => (
                  <option key={g} value={t(`verkauf.grund.${g}`)} />
                ))}
              </datalist>
            </Feld>
          )}
          <Feld id="wechsel-notiz" label={t('verkauf.wechsel.notiz')} pflicht={bedarf === 'richtofferte'}>
            <Textarea
              id="wechsel-notiz"
              rows={3}
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
          {fehler && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
