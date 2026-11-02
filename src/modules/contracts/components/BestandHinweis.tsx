import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { formatChf } from '@/lib/format'
import type { Bestandsaufnahme, Katalog } from '../types'

/**
 * Hinweis aus den Bedingungen der Website: Fremdanlage oder älter als 2 Jahre braucht vor Vertragsbeginn die
 * Bestandsaufnahme (CHF 290). Verrechnen setzt sie auf die erste Jahresrechnung, Erlassen nicht.
 */
export function BestandHinweis({
  katalog,
  wert,
  onChange,
}: {
  katalog: Katalog
  wert: Bestandsaufnahme
  onChange: (b: Bestandsaufnahme) => void
}) {
  const { t } = useTranslation()
  const z = katalog.zusatz.find((x) => x.id === 'bestandsaufnahme')
  return (
    <div className="border-warn bg-warn-soft/40 flex flex-col gap-2 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">{t('wartung.bestand.titel')}</h3>
      <p className="text-sm">
        {t('wartung.bestand.text', {
          jahre: katalog.bedingungen.bestandsaufnahme_ab_jahren,
          betrag: z?.rappen != null ? `CHF ${formatChf(z.rappen)}` : '–',
        })}
      </p>
      {wert === 'verrechnet' ? (
        <p className="text-muted-foreground text-xs">{t('wartung.bestand.status.verrechnet')}</p>
      ) : (
        <Filterchips
          einzeln
          beschriftung={t('wartung.bestand.titel')}
          optionen={[
            { wert: 'verrechnen', text: t('wartung.bestand.verrechnen') },
            { wert: 'erlassen', text: t('wartung.bestand.erlassen') },
          ]}
          gewaehlt={[wert]}
          onChange={([b]) => {
            if (b === 'verrechnen' || b === 'erlassen') onChange(b)
          }}
        />
      )}
    </div>
  )
}
