import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { anlageKurz, ortZeile } from '../lib/anzeige'
import type { Hinweis, Projekt } from '../types'
import { FahrplanBalken } from './FahrplanBalken'

const RAND: Record<Hinweis['ton'], string> = {
  kritisch: 'border-l-bad',
  warnung: 'border-l-warn',
  ok: 'border-l-ok',
  info: 'border-l-border',
  neutral: 'border-l-border',
}

/**
 * Karte im Leitstand: Bautermin und Projektleitung, Kunde, Ort und Anlage, was blockiert oder fehlt (Hinweise)
 * und der Fahrplan mit dem nächsten Schritt. Der linke Rand zeigt das Dringendste: rot blockiert, gelb zu tun.
 */
export function LeitstandKarte({
  p,
  hinweise,
  aktiv,
  onOeffnen,
}: {
  p: Projekt
  hinweise: Hinweis[]
  aktiv: boolean
  onOeffnen: () => void
}) {
  const { t } = useTranslation()
  const rand = hinweise.find((h) => h.ton === 'kritisch' || h.ton === 'warnung')?.ton ?? 'ok'
  return (
    <button
      type="button"
      onClick={onOeffnen}
      aria-current={aktiv || undefined}
      className={cn(
        'bg-surface hover:border-border-strong focus-visible:ring-ring flex w-full flex-col gap-1.5 rounded-lg border border-l-[3px] p-3 text-left shadow-xs outline-none focus-visible:ring-2',
        RAND[rand],
        aktiv && 'border-accent',
      )}
    >
      <span className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="truncate">
          {p.baubeginn
            ? t('projekte.leitstand.bau', { datum: formatDatum(p.baubeginn) })
            : t('projekte.baubeginnOffen')}
          {p.verantwortlich ? ` · ${p.verantwortlich}` : ''}
        </span>
        <span className="zahlen font-mono">{p.nummer}</span>
      </span>
      <span className="line-clamp-2 text-sm font-semibold">{p.kunde}</span>
      <span className="text-muted-foreground line-clamp-2 text-xs">
        {[ortZeile(p), anlageKurz(p, t)].filter(Boolean).join(' · ') || '–'}
      </span>
      {hinweise.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {hinweise.slice(0, 3).map((h) => (
            <Badge key={h.schluessel} ton={h.ton}>
              {t(`projekte.hinweis.${h.schluessel}`, h.werte ?? {})}
            </Badge>
          ))}
        </span>
      )}
      <FahrplanBalken stand={p.stand} />
    </button>
  )
}
