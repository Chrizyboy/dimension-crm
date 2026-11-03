import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { useVersaende, useWerbekampagnen } from '../hooks/useKampagnen'
import { useNewsletter, usePosts, useVorlagen } from '../hooks/useMarketing'
import { kalenderEintraege, monatPlus, monatsRaster, type KalenderEintrag } from '../lib/kalender'
import type { Ansicht } from '../types'

const FARBE: Record<KalenderEintrag['art'], string> = {
  post: 'bg-info-soft text-info',
  mail: 'bg-accent-soft text-accent-ink',
  messe: 'bg-primary text-primary-foreground',
  frist: 'bg-muted text-muted-foreground',
  thema: 'bg-ok-soft text-ok',
}

/**
 * Redaktionsplan als Monat: alles, was nach aussen geht (Posts, Newsletter, Serien-Mails), Messen, Kampagnen-Ende
 * und das Saison-Thema des Monats. Blass = noch nicht freigegeben. Klick führt in den Reiter, wo man es bearbeitet.
 */
export function Kalender({ onAnsicht }: { onAnsicht: (a: Ansicht) => void }) {
  const { t, i18n } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [monat, setMonat] = useState(() => new Date().toISOString().slice(0, 7))
  const eintraege = kalenderEintraege({
    posts: usePosts().data ?? [],
    newsletter: useNewsletter().data ?? [],
    versaende: useVersaende().data ?? [],
    kampagnen: useWerbekampagnen().data ?? [],
    themen: useVorlagen().data?.saison_themen,
    sprache,
    monat,
  })
  const raster = monatsRaster(monat)
  const heute = new Date().toISOString().slice(0, 10)
  const titel = new Date(`${monat}-15T12:00:00Z`).toLocaleDateString(i18n.language === 'fr' ? 'fr-CH' : 'de-CH', {
    month: 'long',
    year: 'numeric',
  })
  const wochentage = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2026, 10, 2 + i)).toLocaleDateString(i18n.language === 'fr' ? 'fr-CH' : 'de-CH', {
      weekday: 'short',
    }),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('werbung.kalender.zurueck')}
            onClick={() => {
              setMonat(monatPlus(monat, -1))
            }}
          >
            <ChevronLeft />
          </Button>
          <h2 className="font-display min-w-40 text-center text-base font-semibold capitalize">{titel}</h2>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('werbung.kalender.weiter')}
            onClick={() => {
              setMonat(monatPlus(monat, 1))
            }}
          >
            <ChevronRight />
          </Button>
        </div>
        <ul className="flex flex-wrap gap-2 text-xs" aria-label={t('werbung.kalender.legende')}>
          {(Object.keys(FARBE) as KalenderEintrag['art'][]).map((a) => (
            <li key={a} className={cn('rounded px-1.5 py-0.5', FARBE[a])}>
              {t(`werbung.kalender.art.${a}`)}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-surface grid grid-cols-7 overflow-hidden rounded-lg border">
        {wochentage.map((w) => (
          <div key={w} className="text-muted-foreground border-b px-2 py-1 text-xs font-medium">
            {w}
          </div>
        ))}
        {raster.map((tag) => {
          const imMonat = tag.startsWith(monat)
          const liste = eintraege.filter((e) => e.datum === tag)
          return (
            <div
              key={tag}
              className={cn('min-h-24 border-t border-l p-1 first:border-l-0', !imMonat && 'bg-muted/40')}
              aria-label={tag}
            >
              <span
                className={cn(
                  'zahlen inline-block px-1 text-xs',
                  tag === heute && 'bg-primary text-primary-foreground rounded font-semibold',
                  !imMonat && 'text-muted-foreground',
                )}
              >
                {Number(tag.slice(8))}
              </span>
              <ul className="flex flex-col gap-0.5">
                {liste.slice(0, 4).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      title={e.text}
                      onClick={() => {
                        onAnsicht(e.ansicht)
                      }}
                      className={cn(
                        'w-full truncate rounded px-1 text-left text-xs',
                        FARBE[e.art],
                        e.offen && 'opacity-70 outline-1 outline-current outline-dashed',
                      )}
                    >
                      {e.text}
                    </button>
                  </li>
                ))}
                {liste.length > 4 && (
                  <li className="text-muted-foreground px-1 text-xs">
                    {t('werbung.kalender.mehr', { anzahl: liste.length - 4 })}
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
