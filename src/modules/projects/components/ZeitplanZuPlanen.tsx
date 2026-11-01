import { CalendarPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Projekt } from '../types'

/**
 * «Zu planen»: Baustellen ohne Bautermin, älteste Unterschrift zuerst. Ein Klick öffnet die Planung mit einem
 * ersten Einsatz am nächsten Werktag, so braucht ein neuer Termin nur Datum und Team.
 */
export function ZeitplanZuPlanen({
  projekte,
  onPlanen,
  className,
}: {
  projekte: Projekt[]
  onPlanen: (p: Projekt) => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="zu-planen" className={cn('flex min-h-0 flex-col gap-2', className)}>
      <h2 id="zu-planen" className="flex items-center gap-2 text-sm font-semibold">
        {t('projekte.zeitplan.zuPlanen')}
        <Badge ton={projekte.length > 0 ? 'kritisch' : 'neutral'}>{projekte.length}</Badge>
      </h2>
      {projekte.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('projekte.zeitplan.allesGeplant')}</p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
          {projekte.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onPlanen(p)
                }}
                className="bg-surface hover:border-border-strong focus-visible:ring-ring group flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-2"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{p.kunde}</span>
                  <CalendarPlus
                    className="text-muted-foreground group-hover:text-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {[
                    p.ort,
                    p.leistung_kwp ? `${String(p.leistung_kwp)} kWp` : null,
                    p.werktage ? t('projekte.zeitplan.werktage', { n: p.werktage }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                  {p.unterzeichnet_am && t('projekte.zeitplan.seit', { datum: formatDatum(p.unterzeichnet_am) })}
                  {p.material_status && <Badge ton="ok">{t(`projekte.material.${p.material_status}`)}</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
