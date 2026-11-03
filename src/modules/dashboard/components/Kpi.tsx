import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { veraenderung } from '../lib/verkauf'
import { erreicht, zielTon } from '../lib/ziele'

/** Vergleichswert einer Kennzahl: Text (z. B. «CHF 2'513'000») und Zahl für die Veränderung. */
export interface KpiVergleich {
  text: string
  wert: number | null
  /** Bei Dauern (Tage) ist weniger besser: dann ist eine Abnahme grün. */
  wenigerBesser?: boolean
}

/**
 * Eine Kennzahl als Kachel: grosse Zahl, Vergleich mit Pfeil, Ziel mit Balken (anteilig bis heute), Zusatzzeile.
 * Die ganze Kachel ist ein Knopf und zeigt die Zeilen dahinter.
 */
export function Kpi({
  titel,
  wert,
  zahl,
  vergleich,
  ziel,
  zielText,
  unter,
  unterTon,
  onKlick,
  testId,
}: {
  titel: string
  wert: string
  /** Zahl hinter `wert` für Vergleich und Ziel. */
  zahl?: number | null | undefined
  vergleich?: KpiVergleich | null | undefined
  ziel?: number | null | undefined
  zielText?: string | undefined
  unter?: string | undefined
  unterTon?: 'ok' | 'warnung' | 'kritisch' | undefined
  onKlick?: (() => void) | undefined
  testId?: string
}) {
  const { t } = useTranslation()
  const delta = vergleich && zahl !== undefined ? veraenderung(zahl ?? null, vergleich.wert) : null
  const gut = delta !== null && (vergleich?.wenigerBesser ? delta <= 0 : delta >= 0)
  const prozent = ziel !== undefined && zahl !== undefined && zahl !== null ? erreicht(zahl, ziel ?? null) : null
  const ton = zielTon(prozent)
  return (
    <button
      type="button"
      onClick={onKlick}
      disabled={!onKlick}
      data-testid={testId}
      className="bg-surface hover:border-border-strong focus-visible:ring-ring flex min-w-0 flex-col gap-1 rounded-lg border p-4 text-left outline-none focus-visible:ring-2 disabled:cursor-default"
    >
      <span className="text-muted-foreground text-xs font-medium">{titel}</span>
      <span className="font-display zahlen text-2xl font-semibold">{wert}</span>
      {vergleich && (
        <span className="text-muted-foreground zahlen text-xs">
          {t('kz.kpi.vergleich', { text: vergleich.text })}{' '}
          {delta !== null && (
            <span className={cn('font-semibold', gut ? 'text-ok' : 'text-bad')}>
              {delta >= 0 ? '▲ +' : '▼ '}
              {delta} %
            </span>
          )}
        </span>
      )}
      {unter && (
        <span
          className={cn(
            'zahlen text-xs',
            unterTon === 'ok' && 'text-ok',
            unterTon === 'warnung' && 'text-warn',
            unterTon === 'kritisch' && 'text-bad',
            !unterTon && 'text-muted-foreground',
          )}
        >
          {unter}
        </span>
      )}
      {prozent !== null && (
        <>
          <span className="text-muted-foreground zahlen text-xs">{t('kz.kpi.ziel', { ziel: zielText, prozent })}</span>
          <span className="bg-muted mt-1 block h-1.5 w-full overflow-hidden rounded-full" aria-hidden="true">
            <span
              className={cn(
                'block h-full rounded-full',
                ton === 'ok' && 'bg-ok',
                ton === 'warnung' && 'bg-reihe-2',
                ton === 'kritisch' && 'bg-bad',
              )}
              style={{ width: `${String(Math.min(prozent, 100))}%` }}
            />
          </span>
        </>
      )}
    </button>
  )
}

/** Waagrechter Balken mit Beschriftung und Zahl (Trichter, Produktmix, Verlustgründe). */
export function BalkenZeile({
  text,
  anteil,
  zahl,
  zweite = false,
  onKlick,
}: {
  text: string
  anteil: number
  zahl: string
  zweite?: boolean
  onKlick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onKlick}
      disabled={!onKlick}
      className="hover:bg-muted focus-visible:ring-ring grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded px-1 py-1 text-left text-sm outline-none focus-visible:ring-2 disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className="truncate">{text}</span>
      <span className="bg-muted block h-2 overflow-hidden rounded-full" aria-hidden="true">
        <span
          className={cn('block h-full rounded-full', zweite ? 'bg-reihe-2' : 'bg-reihe-1')}
          style={{ width: `${String(Math.max(0, Math.min(anteil, 100)))}%` }}
        />
      </span>
      <span className="zahlen text-muted-foreground text-right text-xs whitespace-nowrap">{zahl}</span>
    </button>
  )
}
