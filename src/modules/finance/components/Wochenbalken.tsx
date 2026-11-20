import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Woche } from '../types'

/** Kurz für die Achse: «120k», «−1.2 Mio.», damit die Beschriftung schmal bleibt. */
function kurz(rappen: number): string {
  const franken = rappen / 100
  const abs = Math.abs(franken)
  const zeichen = franken < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${zeichen}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')} Mio.`
  if (abs >= 1_000) return `${zeichen}${String(Math.round(abs / 1_000))}k`
  return `${zeichen}${String(Math.round(abs))}`
}

/**
 * Kontostand am Ende jeder Woche als Balken: über der Nulllinie in der Markenfarbe, darunter rot.
 * Links die Achse (höchster Stand, 0, tiefster Stand), die Nulllinie ist kräftig, die Reserve gestrichelt
 * und beschriftet. So sieht man auf einen Blick, ob und wie tief es unter null geht, statt nur rote Flächen.
 */
export function Wochenbalken({ wochen, reserve }: { wochen: Woche[]; reserve: number }) {
  const { t } = useTranslation()
  const werte = wochen.map((w) => w.ende)
  const max = Math.max(0, ...werte, reserve)
  const min = Math.min(0, ...werte)
  const spanne = max - min || 1
  // Lage in Prozent von oben; HTML-Beschriftungen und SVG nutzen dieselbe Rechnung.
  const prozent = (v: number) => ((max - v) / spanne) * 100
  const breite = 100 / wochen.length
  const tiefste = wochen.reduce<Woche | null>((a, w) => (!a || w.ende < a.ende ? w : a), null)
  const achse = [
    ...(max > 0 ? [{ wert: max, text: kurz(max) }] : []),
    { wert: 0, text: '0' },
    ...(min < 0 ? [{ wert: min, text: kurz(min) }] : []),
  ]

  return (
    <figure className="bg-surface rounded-lg border p-3">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">{t('finanzen.chartTitel')}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {tiefste && (
            <span className="text-muted-foreground">
              {t('finanzen.tiefsterStand')}{' '}
              <span className={cn('zahlen font-medium', tiefste.ende < 0 ? 'text-bad' : 'text-foreground')}>
                {t('finanzen.kw', { kw: tiefste.kw })} · {formatChf(tiefste.ende, { mitWaehrung: true })}
              </span>
            </span>
          )}
          {reserve > 0 && (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="border-warn inline-block w-4 border-t-2 border-dashed" aria-hidden="true" />
              {t('finanzen.reserveLinie', { betrag: formatChf(reserve, { mitWaehrung: true }) })}
            </span>
          )}
        </span>
      </figcaption>
      <div className="flex gap-2">
        <div
          className="text-muted-foreground zahlen relative h-44 w-12 shrink-0 text-right text-[11px]"
          aria-hidden="true"
        >
          {achse.map((a) => (
            <span
              key={a.text}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${String(prozent(a.wert))}%` }}
            >
              {a.text}
            </span>
          ))}
        </div>
        <div className="relative h-44 min-w-0 flex-1">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            role="img"
            aria-label={t('finanzen.chartTitel')}
          >
            {wochen.map((w, i) => {
              const oben = Math.min(prozent(w.ende), prozent(0))
              const hoehe = Math.max(0.6, Math.abs(prozent(w.ende) - prozent(0)))
              return (
                <rect
                  key={w.i}
                  x={i * breite + breite * 0.18}
                  y={oben}
                  width={breite * 0.64}
                  height={hoehe}
                  className={w.ende < 0 ? 'fill-bad/75' : 'fill-primary'}
                >
                  <title>{`${t('finanzen.kw', { kw: w.kw })}: ${formatChf(w.ende, { mitWaehrung: true })}`}</title>
                </rect>
              )
            })}
            <line
              x1={0}
              x2={100}
              y1={prozent(0)}
              y2={prozent(0)}
              className="stroke-foreground/60"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            {reserve > 0 && (
              <line
                x1={0}
                x2={100}
                y1={prozent(reserve)}
                y2={prozent(reserve)}
                className="stroke-warn"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="w-12 shrink-0" />
        <div
          className="text-muted-foreground zahlen grid min-w-0 flex-1 pt-1.5 text-center text-xs"
          style={{ gridTemplateColumns: `repeat(${String(wochen.length)}, minmax(0, 1fr))` }}
        >
          {wochen.map((w) => (
            <span key={w.i} className={cn(w.i === tiefste?.i && 'text-foreground font-semibold')}>
              {w.kw}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}
