import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import type { Tranche } from '../types'
import { Zahlungsplan } from './Zahlungsplan'

/**
 * Zahlungsbedingung mit einem Klick: Vorlagen als Knöpfe (70 / 30, 100 %, 50 / 30 / 20 …), bei «Eigene
 * Anzahlung» ein Betrag in CHF. Darunter sofort der Zahlungsplan, wie er im Vertrag steht.
 */
export function ZahlungWahl({
  kondition,
  anzahlung,
  vorschau,
  onKondition,
  onAnzahlung,
}: {
  kondition: string
  anzahlung: string
  vorschau: Tranche[]
  onKondition: (k: string) => void
  onAnzahlung: (text: string) => void
}) {
  const { t } = useTranslation()
  const konditionen = useAuswahl('zahlungskondition')
  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('werkvertraege.auftrag.kondition')}
        optionen={konditionen.werte.map((k) => ({ wert: k.schluessel, text: konditionen.text(k.schluessel) }))}
        gewaehlt={[kondition]}
        onChange={(w) => {
          if (w[0]) onKondition(w[0])
        }}
      />
      {kondition === 'anzahlung' && (
        <Feld
          id="auftrag-anzahlung"
          label={t('werkvertraege.auftrag.anzahlung')}
          hinweis={t('werkvertraege.auftrag.anzahlungHinweis')}
          pflicht
        >
          <Input
            id="auftrag-anzahlung"
            inputMode="decimal"
            value={anzahlung}
            onChange={(e) => {
              onAnzahlung(e.target.value)
            }}
          />
        </Feld>
      )}
      <Zahlungsplan tranchen={vorschau} />
    </div>
  )
}
