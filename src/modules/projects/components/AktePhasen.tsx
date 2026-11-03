import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { aktuellePhase } from '../lib/leitstand'
import { PHASEN, type Projekt } from '../types'

/** Die sechs Phasen als Leiste: fertig grün, aktuelle orange, mit erledigten Schritten je Phase. */
export function Phasen({ p }: { p: Projekt }) {
  const { t } = useTranslation()
  const jetzt = aktuellePhase(p)
  const idx = PHASEN.indexOf(jetzt)
  return (
    <ol
      className="wischzeile bg-surface flex overflow-x-auto rounded-lg border"
      aria-label={t('projekte.seite.phasen')}
    >
      {PHASEN.map((ph, i) => {
        const s = p.stand?.phasen.find((x) => x.phase === ph)
        const fertig = s ? s.gesamt > 0 && s.erledigt === s.gesamt : i < idx
        return (
          <li
            key={ph}
            aria-current={ph === jetzt ? 'step' : undefined}
            className={cn(
              'flex min-w-28 flex-1 flex-col gap-0.5 border-r px-3 py-2 text-xs last:border-r-0',
              fertig && 'bg-ok-soft text-ok',
              ph === jetzt && !fertig && 'bg-accent-soft text-accent-ink font-semibold',
              s?.spaet && 'bg-bad-soft text-bad',
            )}
          >
            <span>{t(`projekte.phase.${ph}`)}</span>
            {s && s.gesamt > 0 && (
              <span className="zahlen font-normal opacity-90">
                {t('projekte.seite.schritte', { erledigt: s.erledigt, gesamt: s.gesamt })}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
