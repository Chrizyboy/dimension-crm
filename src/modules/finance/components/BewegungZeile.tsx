import { CalendarClock, Check, Pencil, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Bewegung } from '../types'

export type BewegungAktion = 'bezahlt' | 'planen' | 'bearbeiten' | 'anpassen' | 'eingegangen'

const PRIO_TON = { normal: 'neutral', wichtig: 'info', mahnung: 'warnung', betreibung: 'kritisch' } as const
const PROB_TON = { sicher: 'ok', wahrscheinlich: 'info', unsicher: 'neutral', aus: 'neutral' } as const

/** Welche Schritte es je Herkunft gibt (wie V233). */
const AKTIONEN: Record<Bewegung['quelle'], BewegungAktion[]> = {
  zahlung: ['bezahlt', 'planen', 'bearbeiten'],
  material: ['bezahlt', 'planen', 'bearbeiten'],
  fix: ['bezahlt', 'planen'],
  rechnung: ['anpassen'],
  tranche: ['anpassen'],
  eingang: ['eingegangen', 'bearbeiten'],
}
const ICON = {
  bezahlt: Check,
  eingegangen: Check,
  planen: CalendarClock,
  bearbeiten: Pencil,
  anpassen: SlidersHorizontal,
}

/**
 * Eine erwartete Bewegung: wer, was, wann (rot wenn überfällig), Betrag (Löhne verdeckt, bis man sie zeigt),
 * Dringlichkeit oder Wahrscheinlichkeit und die passenden Schritte.
 */
export function BewegungZeile({
  b,
  lohnZeigen,
  onAktion,
}: {
  b: Bewegung
  lohnZeigen: boolean
  onAktion: (b: Bewegung, a: BewegungAktion) => void
}) {
  const { t } = useTranslation()
  const verdeckt = b.lohn && !lohnZeigen
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <span className="flex min-w-0 flex-1 basis-56 flex-col">
        <span className="truncate font-medium">{b.titel}</span>
        <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-xs">
          <span>{t(`finanzen.quelle.${b.quelle}`)}</span>
          {b.zusatz && <span className="truncate">· {b.zusatz}</span>}
          {b.prioritaet !== 'normal' && (
            <Badge ton={PRIO_TON[b.prioritaet]}>{t(`finanzen.prio.${b.prioritaet}`)}</Badge>
          )}
          {b.richtung > 0 && (
            <Badge ton={PROB_TON[b.wahrscheinlichkeit]}>{t(`finanzen.prob.${b.wahrscheinlichkeit}`)}</Badge>
          )}
        </span>
      </span>
      <span className="zahlen flex w-24 flex-col text-xs">
        <span className={cn(!b.datum || b.spaet ? 'text-bad font-medium' : '')}>
          {b.datum ? formatDatum(b.datum) : t('finanzen.ohneDatum')}
        </span>
        {b.geplant && b.faellig && b.faellig !== b.datum && (
          <span className="text-muted-foreground">{t('finanzen.faelligKurz', { datum: formatDatum(b.faellig) })}</span>
        )}
      </span>
      <span className={cn('zahlen w-28 text-right font-medium', b.richtung > 0 ? 'text-ok' : '')}>
        {verdeckt ? '••••' : `${b.richtung > 0 ? '+' : '−'}${formatChf(b.rappen)}`}
      </span>
      <span className="flex gap-0.5">
        {AKTIONEN[b.quelle].map((a) => {
          const Icon = ICON[a]
          return (
            <Button
              key={a}
              variant="ghost"
              size="icon"
              aria-label={t(`finanzen.aktion.${a}`)}
              title={t(`finanzen.aktion.${a}`)}
              onClick={() => {
                onAktion(b, a)
              }}
            >
              <Icon />
            </Button>
          )
        })}
      </span>
    </li>
  )
}
