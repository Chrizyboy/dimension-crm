import { FileSignature, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import type { Json } from '@/types/datenbank'
import { useVerkaufAenderung } from '../hooks/useVerkauf'
import { besichtigungCheckliste, type Besichtigung } from '../lib/besichtigung'
import { aendereLead } from '../services/leads'
import { useLuftbildAnalyse } from '../hooks/useLuftbildAnalyse'
import { BesichtigungCheckliste } from './BesichtigungCheckliste'

const AUSRICHTUNG = ['sued', 'suedost', 'suedwest', 'ost', 'west', 'ost_west', 'nord', 'flach'] as const
const MATERIAL = [
  'tonziegel',
  'betonziegel',
  'eternit',
  'blech',
  'flach_kies',
  'flach_begruent',
  'schiefer',
  'andere',
] as const
const LEER = '_leer'

/**
 * Vor-Ort-Besichtigung (V233): Dachfläche, Ausrichtung, Neigung, Material, Hausanschluss,
 * Verbrauch und Besonderheiten. Am Handy beim Kunden mit Checkliste und Kamera; «Abschliessen» speichert
 * und gibt den Lead an die Offerten-Erstellung weiter (nur solange er im Stand «Termin» ist).
 */
export function LeadBesichtigung({
  verkaufschanceId,
  wert,
  dateiOrdner = [],
  onAbschliessen,
}: {
  verkaufschanceId: string
  wert: Besichtigung | null
  dateiOrdner?: readonly (string | null)[]
  onAbschliessen?: (() => void) | undefined
}) {
  const { t } = useTranslation()
  const [b, setB] = useState<Besichtigung>(wert ?? {})
  const luftbild = useLuftbildAnalyse(verkaufschanceId).data?.inhalt
  const kiAusrichtung = luftbild && luftbild.ausrichtung !== b.ausrichtung ? luftbild.ausrichtung : null
  const speichern = useVerkaufAenderung((neu: Besichtigung) =>
    aendereLead(verkaufschanceId, { besichtigung: neu as unknown as Json }),
  )
  const setze = (feld: keyof Besichtigung) => (v: string) => {
    setB((alt) => ({ ...alt, [feld]: v === LEER ? '' : v }))
  }
  const feld = (f: keyof Besichtigung, art: 'text' | 'number' | 'date' = 'text', einheit?: string) => (
    <Feld id={`besichtigung-${f}`} label={t(`verkauf.besichtigung.${f}`) + (einheit ? ` (${einheit})` : '')}>
      <Input
        id={`besichtigung-${f}`}
        type={art}
        inputMode={art === 'number' ? 'decimal' : undefined}
        value={b[f] ?? ''}
        onChange={(e) => {
          setze(f)(e.target.value)
        }}
      />
    </Feld>
  )

  async function sichern(): Promise<boolean> {
    // Wer vor Ort speichert, war heute da: Datum vorschlagen, damit es nicht vergessen geht.
    const neu = b.datum ? b : { ...b, datum: new Date().toISOString().slice(0, 10) }
    try {
      await speichern.mutateAsync(neu)
      setB(neu)
      melde('ok', { de: 'Besichtigung gespeichert', fr: 'Visite enregistrée' })
      return true
    } catch (f) {
      meldeFehler(f, 'besichtigung')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      return false
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <BesichtigungCheckliste verkaufschanceId={verkaufschanceId} punkte={besichtigungCheckliste(b, dateiOrdner)} />
      <div className="grid grid-cols-2 gap-3">
        {feld('datum', 'date')}
        {feld('flaeche', 'number', 'm²')}
        <Feld id="besichtigung-ausrichtung" label={t('verkauf.besichtigung.ausrichtung')}>
          <Auswahl
            id="besichtigung-ausrichtung"
            value={b.ausrichtung || LEER}
            onValueChange={setze('ausrichtung')}
            optionen={[
              { wert: LEER, text: '–' },
              ...AUSRICHTUNG.map((a) => ({ wert: a, text: t(`verkauf.besichtigung.richtung.${a}`) })),
            ]}
          />
          {kiAusrichtung && (
            <button
              type="button"
              className="text-primary dark:text-accent self-start text-xs hover:underline"
              onClick={() => {
                setze('ausrichtung')(kiAusrichtung)
              }}
            >
              {t('ki.luftbild.uebernehmen', { richtung: t(`verkauf.besichtigung.richtung.${kiAusrichtung}`) })}
            </button>
          )}
        </Feld>
        {feld('neigung', 'number', '°')}
        <Feld id="besichtigung-material" label={t('verkauf.besichtigung.material')}>
          <Auswahl
            id="besichtigung-material"
            value={b.material || LEER}
            onValueChange={setze('material')}
            optionen={[
              { wert: LEER, text: '–' },
              ...MATERIAL.map((m) => ({ wert: m, text: t(`verkauf.besichtigung.materialien.${m}`) })),
            ]}
          />
        </Feld>
        {feld('anschluss', 'number', 'A')}
        {feld('verbrauch', 'number', 'kWh/Jahr')}
      </div>
      <Feld id="besichtigung-notiz" label={t('verkauf.besichtigung.notiz')}>
        <Textarea
          id="besichtigung-notiz"
          rows={3}
          value={b.notiz ?? ''}
          onChange={(e) => {
            setze('notiz')(e.target.value)
          }}
        />
      </Feld>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" laedt={speichern.isPending} onClick={() => void sichern()}>
          <Save />
          {t('verkauf.besichtigung.speichern')}
        </Button>
        {onAbschliessen && (
          <Button
            size="sm"
            title={t('verkauf.besichtigung.abschliessenHinweis')}
            disabled={speichern.isPending}
            onClick={() => {
              void sichern().then((ok) => {
                if (ok) onAbschliessen()
              })
            }}
          >
            <FileSignature />
            {t('verkauf.besichtigung.abschliessen')}
          </Button>
        )}
      </div>
    </div>
  )
}
