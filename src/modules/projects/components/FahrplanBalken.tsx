import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import type { Projekt } from '../types'

/**
 * Fahrplan als Balken in sechs Teilen (Auftrag · Bewilligungen · Vorbereitung · Montage · IBN · Abschluss)
 * mit dem nächsten Schritt darunter (V108). Rot, wenn in der Phase etwas überfällig ist.
 */
export function FahrplanBalken({ stand, gross = false }: { stand: Projekt['stand']; gross?: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  if (!stand) return null
  const n = stand.naechster
  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn('grid grid-cols-6 gap-0.5', gross ? 'h-2.5' : 'h-1.5')}
        role="img"
        aria-label={t('projekte.fahrplan.balken', { erledigt: stand.erledigt, gesamt: stand.gesamt })}
      >
        {stand.phasen.map((ph) => (
          <span
            key={ph.phase}
            title={`${t(`projekte.phase.${ph.phase}`)}: ${ph.erledigt}/${ph.gesamt}`}
            className={cn('bg-muted overflow-hidden rounded-full', ph.spaet && 'ring-bad ring-1')}
          >
            <span
              className={cn('block h-full', ph.erledigt === ph.gesamt ? 'bg-ok' : ph.spaet ? 'bg-bad' : 'bg-accent')}
              style={{ width: `${Math.round((ph.erledigt / Math.max(1, ph.gesamt)) * 100)}%` }}
            />
          </span>
        ))}
      </div>
      <p className="text-muted-foreground line-clamp-2 text-xs">
        {n ? (
          <>
            <span className="text-foreground font-medium">{t(`projekte.phase.${n.phase}`)}</span>
            {' · '}
            <span className={cn(n.ueberfaellig && 'text-bad font-medium')}>
              {sprache === 'fr' ? n.name_fr : n.name_de}
            </span>
          </>
        ) : (
          <span className="text-ok font-medium">{t('projekte.fahrplan.alleErledigt')}</span>
        )}
      </p>
    </div>
  )
}
