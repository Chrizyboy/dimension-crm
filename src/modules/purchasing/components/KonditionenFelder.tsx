import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import type { Konditionen } from '../lib/konditionen'
import type { Bestellweg } from '../types'

/** Felder für Fracht, Mindestwert, Lieferzeit, Zahlung und Bestellweg. */
export function KonditionenFelder({ k, onChange }: { k: Konditionen; onChange: (k: Konditionen) => void }) {
  const { t } = useTranslation()
  const feld = (name: Exclude<keyof Konditionen, 'bestellweg'>, art: 'text' | 'url' = 'text') => (
    <Feld id={`lk-${name}`} label={t(`einkauf.kond.${name}`)}>
      <Input
        id={`lk-${name}`}
        type={art}
        inputMode={art === 'text' && name !== 'bestellschluss' ? 'decimal' : undefined}
        value={k[name]}
        onChange={(e) => {
          onChange({ ...k, [name]: e.target.value })
        }}
      />
    </Feld>
  )
  return (
    <fieldset className="flex flex-col gap-3 border-t pt-3">
      <legend className="text-sm font-semibold">{t('einkauf.kond.titel')}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {feld('fracht_frei_ab')}
        {feld('fracht')}
        {feld('mindestwert')}
        {feld('lieferzeit')}
        {feld('zahlungsziel')}
        {feld('skonto_prozent')}
        {feld('skonto_tage')}
        {feld('bestellschluss')}
        <Feld id="lk-bestellweg" label={t('einkauf.kond.bestellweg')}>
          <Auswahl
            id="lk-bestellweg"
            value={k.bestellweg}
            onValueChange={(w) => {
              onChange({ ...k, bestellweg: w as Bestellweg })
            }}
            optionen={(['mail', 'webshop', 'telefon'] as const).map((w) => ({
              wert: w,
              text: t(`einkauf.kond.weg.${w}`),
            }))}
          />
        </Feld>
      </div>
      {k.bestellweg === 'webshop' && feld('webshop_url', 'url')}
    </fieldset>
  )
}
