import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import type { Woche } from '../types'

/**
 * Kontostand am Ende jeder Woche als Balken: über der Nulllinie in der Markenfarbe, darunter rot.
 * Die gestrichelte Linie ist die Reserve (falls eingetragen).
 */
export function Wochenbalken({ wochen, reserve }: { wochen: Woche[]; reserve: number }) {
  const { t } = useTranslation()
  const werte = wochen.map((w) => w.ende)
  const max = Math.max(1, ...werte, reserve)
  const min = Math.min(0, ...werte)
  const H = 160
  const y = (v: number) => ((max - v) / (max - min)) * H
  const breite = 100 / wochen.length
  return (
    <figure className="bg-surface rounded-lg border p-3">
      <figcaption className="text-muted-foreground mb-2 text-xs">{t('finanzen.chartTitel')}</figcaption>
      <svg
        viewBox={`0 0 100 ${String(H)}`}
        preserveAspectRatio="none"
        className="h-44 w-full"
        role="img"
        aria-label={t('finanzen.chartTitel')}
      >
        {wochen.map((w, i) => {
          const oben = Math.min(y(w.ende), y(0))
          const hoehe = Math.max(0.5, Math.abs(y(w.ende) - y(0)))
          return (
            <rect
              key={w.i}
              x={i * breite + breite * 0.15}
              y={oben}
              width={breite * 0.7}
              height={hoehe}
              rx={0.6}
              className={w.ende < 0 ? 'fill-bad' : 'fill-primary'}
            >
              <title>{`${t('finanzen.kw', { kw: w.kw })}: ${formatChf(w.ende, { mitWaehrung: true })}`}</title>
            </rect>
          )
        })}
        <line
          x1={0}
          x2={100}
          y1={y(0)}
          y2={y(0)}
          className="stroke-border"
          strokeWidth={0.3}
          vectorEffect="non-scaling-stroke"
        />
        {reserve > 0 && (
          <line
            x1={0}
            x2={100}
            y1={y(reserve)}
            y2={y(reserve)}
            className="stroke-warn"
            strokeDasharray="2 1.5"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div
        className="text-muted-foreground zahlen grid text-center text-xs"
        style={{ gridTemplateColumns: `repeat(${String(wochen.length)}, 1fr)` }}
      >
        {wochen.map((w) => (
          <span key={w.i}>{w.kw}</span>
        ))}
      </div>
    </figure>
  )
}
