import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { anlageKurz, ortZeile } from '../lib/anzeige'
import { BAU_TON } from '../lib/fahrplan'
import type { Projekt } from '../types'
import { FahrplanBalken } from './FahrplanBalken'

/**
 * Karte einer Baustelle: Baubeginn und Elektriker, Kunde, Ort und Anlage, Status und Fahrplan.
 * Die ganze Karte ist ein Knopf und öffnet die Akte.
 */
export function ProjektKarte({ p, aktiv, onOeffnen }: { p: Projekt; aktiv: boolean; onOeffnen: () => void }) {
  const { t } = useTranslation()
  const anlage = anlageKurz(p, t)
  return (
    <button
      type="button"
      onClick={onOeffnen}
      aria-current={aktiv || undefined}
      className={cn(
        'bg-surface hover:border-border-strong focus-visible:ring-ring flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left shadow-xs outline-none focus-visible:ring-2',
        aktiv && 'border-accent',
      )}
    >
      <span className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="truncate">
          {p.baubeginn ? formatDatum(p.baubeginn) : t('projekte.baubeginnOffen')}
          {p.elektriker ? ` · ${p.elektriker}` : ''}
        </span>
        <span className="zahlen font-mono">{p.nummer}</span>
      </span>
      <span className="line-clamp-2 text-sm font-semibold">{p.kunde}</span>
      <span className="text-muted-foreground line-clamp-2 text-xs">
        {[ortZeile(p), anlage].filter(Boolean).join(' · ') || '–'}
      </span>
      <span className="flex flex-wrap gap-1">
        {p.bau_status && (
          <Badge ton={BAU_TON[p.bau_status] ?? 'neutral'} punkt>
            {t(`projekte.bauStatus.${p.bau_status}`)}
          </Badge>
        )}
        {p.material_status && <Badge>{t(`projekte.material.${p.material_status}`)}</Badge>}
        {p.stand && p.stand.checkliste_gesamt > 0 && (
          <Badge ton={p.stand.checkliste_erledigt === p.stand.checkliste_gesamt ? 'ok' : 'neutral'}>
            {t('projekte.checkliste', { erledigt: p.stand.checkliste_erledigt, gesamt: p.stand.checkliste_gesamt })}
          </Badge>
        )}
      </span>
      <FahrplanBalken stand={p.stand} />
    </button>
  )
}
