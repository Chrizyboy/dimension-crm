import { useDraggable } from '@dnd-kit/core'
import { CalendarClock, MoreHorizontal } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTitel } from '@/components/ui/menue'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { erlaubteZiele, istLiegengeblieben, liegtSeit } from '../lib/geschaeft'
import type { Geschaeft } from '../types'

interface PipelineKarteProps {
  g: Geschaeft
  aktiv: boolean
  kuerzel: string | null
  onOeffnen: (id: string) => void
  onZiel: (g: Geschaeft, ziel: string) => void
  /** Als Vorschau unter dem Mauszeiger beim Ziehen. */
  schwebend?: boolean
}

/**
 * Karte eines Geschäfts: Name, Ort, Nummer, Wert und Leistung, Termin, Person.
 * Rot umrandet, wenn ein Lead seit 5 Tagen liegt. Ziehen oder «…» ändert den Stand (auch per Tastatur).
 */
export const PipelineKarte = memo(function PipelineKarte({
  g,
  aktiv,
  kuerzel,
  onOeffnen,
  onZiel,
  schwebend = false,
}: PipelineKarteProps) {
  const { t } = useTranslation()
  const staende = useAuswahl('kundenstand')
  const ziele = erlaubteZiele(g)
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: g.id,
    data: g,
    disabled: ziele.size === 0,
  })
  const liegt = istLiegengeblieben(g)

  // Ziehen geht mit der Maus oder dem Finger auf der ganzen Karte. Per Tastatur öffnet der Name die
  // Akte und «…» wechselt den Stand; eine Karte als Schaltfläche mit Knöpfen darin wäre für
  // Bildschirmleser verschachtelt (axe «nested-interactive»).
  return (
    <article
      ref={schwebend ? undefined : setNodeRef}
      {...(schwebend ? {} : listeners)}
      aria-label={`${g.name}, ${g.ort ?? ''}`}
      onClick={() => {
        onOeffnen(g.id)
      }}
      className={cn(
        'bg-surface group relative flex cursor-grab flex-col gap-1 rounded-lg border p-2.5 text-left text-sm shadow-xs active:cursor-grabbing',
        liegt && 'border-bad',
        aktiv && 'ring-accent ring-2',
        isDragging && 'opacity-40',
        schwebend && 'shadow-pop rotate-1',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="focus-visible:ring-ring min-w-0 truncate rounded text-left font-medium outline-none focus-visible:ring-2"
          onClick={(e) => {
            e.stopPropagation()
            onOeffnen(g.id)
          }}
        >
          {g.name}
        </button>
        {ziele.size > 0 && !schwebend && (
          <Menue>
            <MenueAusloeser
              aria-label={t('verkauf.pipeline.standAendern')}
              onClick={(e) => {
                e.stopPropagation()
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              className="text-muted-foreground hover:bg-muted focus-visible:ring-ring -m-1 rounded p-1 opacity-60 outline-none group-hover:opacity-100 focus-visible:ring-2"
            >
              <MoreHorizontal className="size-4" />
            </MenueAusloeser>
            <MenueInhalt
              align="end"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <MenueTitel>{t('verkauf.pipeline.standAendern')}</MenueTitel>
              {staende.werte
                .filter((s) => ziele.has(s.schluessel) && s.schluessel !== g.stand)
                .map((s) => (
                  <MenueEintrag
                    key={s.schluessel}
                    onSelect={() => {
                      onZiel(g, s.schluessel)
                    }}
                  >
                    {staende.text(s.schluessel)}
                  </MenueEintrag>
                ))}
            </MenueInhalt>
          </Menue>
        )}
      </div>
      <span className="text-muted-foreground truncate text-xs">
        {[g.nummer, [g.plz, g.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
      </span>
      {g.terminAm && (g.stand === 'termin' || g.stand === 'nach_termin') && (
        <span className="text-info flex items-center gap-1 text-xs">
          <CalendarClock className="size-3" aria-hidden="true" />
          {formatDatum(g.terminAm)}{' '}
          {new Date(g.terminAm).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      {(g.wertRappen || g.kwp || kuerzel || liegt) && (
        <div className="flex items-end justify-between gap-2 text-xs">
          <span className="flex min-w-0 flex-col">
            {(g.wertRappen || g.kwp) && (
              <span className="zahlen text-muted-foreground font-mono">
                {[g.wertRappen ? formatChf(g.wertRappen) : null, g.kwp ? `${g.kwp} kWp` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
            {liegt && (
              <span className="text-bad text-xs font-medium">{t('verkauf.liegt', { count: liegtSeit(g) ?? 0 })}</span>
            )}
          </span>
          {kuerzel && (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">
              {kuerzel}
            </span>
          )}
        </div>
      )}
    </article>
  )
})
