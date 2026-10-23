import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { formatChf } from '@/lib/format'
import { heuteZuerich } from '../lib/datum'
import { bewegungen } from '../lib/vorschau'
import type { Bewegung, Finanzdaten } from '../types'
import { BewegungZeile, type BewegungAktion } from './BewegungZeile'

/**
 * Erwartete Eingänge (V233): offene Rechnungen und Tranchen aus dem CRM (Wahrscheinlichkeit und Datum
 * anpassbar) und von Hand erfasste Eingänge, z. B. Förderbeiträge oder Rückzahlungen.
 */
export function Eingaenge({
  daten,
  onAktion,
  onNeu,
}: {
  daten: Finanzdaten
  onAktion: (b: Bewegung, a: BewegungAktion) => void
  onNeu: () => void
}) {
  const { t } = useTranslation()
  const alle = bewegungen({ ...daten, zahlungen: [], material: [], fixkosten: [] }, heuteZuerich()).sort((a, b) =>
    (a.datum ?? '9').localeCompare(b.datum ?? '9'),
  )
  const gruppen = [
    { titel: t('finanzen.eingang.rechnungen'), liste: alle.filter((b) => b.quelle === 'rechnung') },
    { titel: t('finanzen.eingang.tranchen'), liste: alle.filter((b) => b.quelle === 'tranche') },
    { titel: t('finanzen.eingang.vonHand'), liste: alle.filter((b) => b.quelle === 'eingang') },
  ]
  const summe = (l: Bewegung[]) => l.reduce((s, b) => s + b.rappen, 0)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t('finanzen.eingang.text')}</p>
        <Button onClick={onNeu}>
          <Plus />
          {t('finanzen.eingang.neu')}
        </Button>
      </div>
      {gruppen.map((g) => (
        <AkteAbschnitt
          key={g.titel}
          titel={g.titel}
          zusatz={`${String(g.liste.length)} · ${formatChf(summe(g.liste))}`}
        >
          {g.liste.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('finanzen.eingang.keine')}</p>
          ) : (
            <ul className="divide-y">
              {g.liste.map((b) => (
                <BewegungZeile key={b.id} b={b} lohnZeigen onAktion={onAktion} />
              ))}
            </ul>
          )}
        </AkteAbschnitt>
      ))}
    </div>
  )
}
