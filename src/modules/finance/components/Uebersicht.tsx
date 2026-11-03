import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { heuteZuerich } from '../lib/datum'
import { vorschau } from '../lib/vorschau'
import type { Finanzdaten, Szenario } from '../types'
import { BewegungZeile, type BewegungAktion } from './BewegungZeile'
import type { Bewegung } from '../types'
import { Wochenbalken } from './Wochenbalken'
import { ReserveHinweis } from './ReserveHinweis'

/**
 * Liquidität Woche für Woche (V233 «Finanzen»): Szenario, Balken mit Reserve und jede Woche aufklappbar mit allen
 * Bewegungen und ihren Schritten. Zahlen und Warnungen stehen im Cockpit.
 */
export function Uebersicht({
  daten,
  lohnZeigen,
  reserve,
  onAktion,
}: {
  daten: Finanzdaten
  lohnZeigen: boolean
  reserve: number
  onAktion: (b: Bewegung, a: BewegungAktion) => void
}) {
  const { t } = useTranslation()
  const [szenario, setSzenario] = useState<Szenario>('real')
  const [offen, setOffen] = useState<number | null>(0)
  const heute = heuteZuerich()
  const v = vorschau(daten, heute, szenario)
  return (
    <div className="flex flex-col gap-4">
      <ReserveHinweis wochen={v.wochen} reserve={reserve} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('finanzen.szenario.titel')}
          optionen={(['real', 'pess', 'opt'] as const).map((s) => ({ wert: s, text: t(`finanzen.szenario.${s}`) }))}
          gewaehlt={[szenario]}
          onChange={([s]) => {
            if (s) setSzenario(s as Szenario)
          }}
        />
        {v.ohneDatum > 0 && (
          <span className="text-muted-foreground text-xs">{t('finanzen.ohneDatumAnzahl', { count: v.ohneDatum })}</span>
        )}
      </div>
      <Wochenbalken wochen={v.wochen} reserve={reserve} />
      <ul className="bg-surface flex flex-col divide-y rounded-lg border">
        {v.wochen.map((w) => (
          <li key={w.i}>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 rounded-none px-3 py-2 text-left"
              aria-expanded={offen === w.i}
              onClick={() => {
                setOffen(offen === w.i ? null : w.i)
              }}
            >
              {offen === w.i ? <ChevronDown /> : <ChevronRight />}
              <span className="text-foreground w-36 font-medium">
                {t('finanzen.kw', { kw: w.kw })}
                <span className="text-muted-foreground ml-2 text-xs font-normal">{formatDatum(w.von).slice(0, 6)}</span>
              </span>
              <span className="zahlen text-ok hidden w-28 text-right sm:inline">+{formatChf(w.ein)}</span>
              <span className="zahlen text-foreground hidden w-28 text-right sm:inline">−{formatChf(w.aus)}</span>
              <span
                className={cn(
                  'zahlen ml-auto w-32 text-right font-semibold',
                  w.ende < 0 ? 'text-bad' : 'text-foreground',
                )}
              >
                {formatChf(w.ende, { mitWaehrung: true })}
              </span>
            </Button>
            {offen === w.i && (
              <ul className="divide-y px-4 pb-2">
                {w.bewegungen.length === 0 ? (
                  <li className="text-muted-foreground py-2 text-sm">{t('finanzen.keineBewegung')}</li>
                ) : (
                  [...w.bewegungen]
                    .sort((a, b) => a.richtung - b.richtung || (a.datum ?? '0').localeCompare(b.datum ?? '0'))
                    .map((b) => (
                      <BewegungZeile
                        key={`${b.quelle}-${b.id}-${String(b.idx ?? b.monat ?? '')}`}
                        b={b}
                        lohnZeigen={lohnZeigen}
                        onAktion={onAktion}
                      />
                    ))
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
