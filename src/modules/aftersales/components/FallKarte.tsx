import { useDraggable } from '@dnd-kit/core'
import { CalendarClock, Globe, MoreHorizontal, ShieldCheck, UserRound } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTitel } from '@/components/ui/menue'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { dauerText, reaktion } from '../lib/reaktion'
import type { ServiceFall } from '../types'

/**
 * Karte eines Falls im Leitstand: Nummer, worum es geht, Kunde und Ort, Reaktionszeit, Termin, Zuständige und
 * Merkmale (Anlage steht, Garantie, Website, ohne Kunde). Ziehen oder «…» wechselt den Stand (auch per Tastatur).
 */
export const FallKarte = memo(function FallKarte({
  f,
  aktiv,
  onOeffnen,
  onStand,
  schwebend = false,
}: {
  f: ServiceFall
  aktiv: boolean
  onOeffnen: (id: string) => void
  onStand: (f: ServiceFall, status: string) => void
  schwebend?: boolean
}) {
  const { t } = useTranslation()
  const staende = useAuswahl('servicestatus')
  const wirkung = useAuswahl('serviceauswirkung')
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: f.id, data: f })
  const r = reaktion(f)
  const kunde = f.kontakt_id ? f.kunde : `${f.kunde} · ${t('service.leitstand.ohneKunde')}`
  return (
    <article
      ref={schwebend ? undefined : setNodeRef}
      {...(schwebend ? {} : listeners)}
      aria-label={`${f.nummer} ${f.titel}`}
      onClick={() => {
        onOeffnen(f.id)
      }}
      className={cn(
        'bg-surface group relative flex cursor-grab flex-col gap-1.5 rounded-lg border border-l-4 p-2.5 text-left text-sm shadow-xs active:cursor-grabbing',
        r.ueberfaellig ? 'border-l-bad' : f.auswirkung === 'steht' ? 'border-l-warn' : 'border-l-border',
        aktiv && 'ring-accent ring-2',
        isDragging && 'opacity-40',
        schwebend && 'shadow-pop rotate-1',
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="zahlen font-mono">{f.nummer}</span>
        {!schwebend && (
          <Menue>
            <MenueAusloeser
              aria-label={t('service.leitstand.standAendern')}
              onClick={(e) => {
                e.stopPropagation()
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              className="hover:bg-muted focus-visible:ring-ring -m-1 rounded p-1 opacity-60 outline-none group-hover:opacity-100 focus-visible:ring-2"
            >
              <MoreHorizontal className="size-4" />
            </MenueAusloeser>
            <MenueInhalt
              align="end"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <MenueTitel>{t('service.leitstand.standAendern')}</MenueTitel>
              {staende.werte
                .filter((s) => s.schluessel !== f.status)
                .map((s) => (
                  <MenueEintrag
                    key={s.schluessel}
                    onSelect={() => {
                      onStand(f, s.schluessel)
                    }}
                  >
                    {staende.text(s.schluessel)}
                  </MenueEintrag>
                ))}
            </MenueInhalt>
          </Menue>
        )}
      </div>
      <button
        type="button"
        className="focus-visible:ring-ring line-clamp-2 min-w-0 rounded text-left font-medium outline-none focus-visible:ring-2"
        onClick={(e) => {
          e.stopPropagation()
          onOeffnen(f.id)
        }}
      >
        {f.titel}
      </button>
      <p className="text-muted-foreground truncate text-xs">
        {[kunde, f.ort, f.kwp ? `${String(f.kwp)} kWp` : null].filter(Boolean).join(' · ')}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {r.laeuft && r.minuten !== null && (
          <Badge ton={r.ueberfaellig ? 'kritisch' : r.minuten < 240 ? 'warnung' : 'neutral'}>
            {r.ueberfaellig
              ? t('service.reaktion.zuSpaet', { dauer: dauerText(r.minuten) })
              : t('service.reaktion.noch', { dauer: dauerText(r.minuten) })}
          </Badge>
        )}
        {f.auswirkung && f.auswirkung !== 'keine' && (
          <Badge ton={f.auswirkung === 'steht' ? 'kritisch' : 'warnung'}>{wirkung.text(f.auswirkung)}</Badge>
        )}
        {f.garantie && (
          <Badge ton="ok">
            <ShieldCheck />
            {t('service.garantie')}
          </Badge>
        )}
        {f.quelle === 'website' && (
          <Badge ton="info">
            <Globe />
            {t('service.leitstand.website')}
          </Badge>
        )}
      </div>
      {(f.termin_am || f.person) && (
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1">
            {f.termin_am && (
              <>
                <CalendarClock className="size-3.5" aria-hidden="true" />
                {formatDatumZeit(f.termin_am)}
              </>
            )}
          </span>
          {f.person && (
            <span className="flex items-center gap-1 truncate">
              <UserRound className="size-3.5" aria-hidden="true" />
              {f.person}
            </span>
          )}
        </div>
      )}
    </article>
  )
})
