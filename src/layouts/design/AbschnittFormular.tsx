import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld, Label } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox, Switch } from '@/components/ui/schalter'
import { parseChf } from '@/lib/format'
import { Abschnitt } from './Abschnitt'

/** Formularbausteine mit Beschriftung, Hinweis und Fehlermeldung, wie sie in allen Modulen aussehen. */
export function AbschnittFormular() {
  const { t } = useTranslation()
  const [betrag, setBetrag] = useState("12'500.00")
  const betragOk = parseChf(betrag) !== null

  return (
    <Abschnitt id="formular" titel={t('design.formular')} text={t('design.formularText')}>
      <div className="bg-surface grid gap-x-6 gap-y-5 rounded-lg border p-5 sm:grid-cols-2">
        <Feld id="d-name" label={t('design.feldName')} pflicht>
          <Input id="d-name" defaultValue="Familie Gerber" autoComplete="off" />
        </Feld>
        <Feld id="d-standort" label={t('design.feldStandort')}>
          <Auswahl
            id="d-standort"
            defaultValue="muri"
            optionen={[
              { wert: 'muri', text: 'Muri AG' },
              { wert: 'bulle', text: 'Bulle FR' },
            ]}
          />
        </Feld>
        <Feld
          id="d-betrag"
          label={t('design.feldBetrag')}
          hinweis={t('design.feldBetragHinweis')}
          fehler={betragOk ? undefined : t('design.feldBetragFehler')}
        >
          <Input
            id="d-betrag"
            value={betrag}
            onChange={(e) => {
              setBetrag(e.target.value)
            }}
            inputMode="decimal"
            className="zahlen font-mono"
            aria-invalid={!betragOk}
            aria-describedby="d-betrag-hinweis"
          />
        </Feld>
        <Feld id="d-telefon" label={t('design.feldTelefon')}>
          <Input id="d-telefon" type="tel" placeholder="+41 79 123 45 67" />
        </Feld>
        <Feld id="d-notiz" label={t('design.feldNotiz')} className="sm:col-span-2">
          <Textarea id="d-notiz" placeholder={t('design.feldNotizPlatzhalter')} />
        </Feld>
        <div className="flex items-center gap-2">
          <Checkbox id="d-einwilligung" defaultChecked />
          <Label htmlFor="d-einwilligung" className="font-normal">
            {t('design.feldEinwilligung')}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="d-auto" />
          <Label htmlFor="d-auto" className="font-normal">
            {t('design.feldAutomatisch')}
          </Label>
        </div>
      </div>
    </Abschnitt>
  )
}
