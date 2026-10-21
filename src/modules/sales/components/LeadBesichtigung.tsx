import { Save } from 'lucide-react'
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
import type { Besichtigung } from '../lib/besichtigung'
import { aendereLead } from '../services/leads'

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
 * Verbrauch und Besonderheiten. Geht auch am Handy beim Kunden; Fotos kommen unter «Dateien».
 */
export function LeadBesichtigung({ verkaufschanceId, wert }: { verkaufschanceId: string; wert: Besichtigung | null }) {
  const { t } = useTranslation()
  const [b, setB] = useState<Besichtigung>(wert ?? {})
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

  async function sichern() {
    try {
      await speichern.mutateAsync(b)
      melde('ok', { de: 'Besichtigung gespeichert', fr: 'Visite enregistrée' })
    } catch (f) {
      meldeFehler(f, 'besichtigung')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <div className="flex flex-col gap-3">
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
      <Button
        variant="secondary"
        size="sm"
        className="self-end"
        laedt={speichern.isPending}
        onClick={() => void sichern()}
      >
        <Save />
        {t('verkauf.besichtigung.speichern')}
      </Button>
    </div>
  )
}
