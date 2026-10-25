import { useQuery } from '@tanstack/react-query'
import { Play, Video } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useHandbuch'
import { dauerText, fassung } from '../lib/handbuch'
import { dateiAdresse, entferneEintrag } from '../services/handbuch'
import type { HandbuchEintrag } from '../types'

/** Ein Video als Karte: Vorschaubild mit Dauer, Titel, Text; Klick spielt ab. */
export function VideoKarte({
  eintrag: e,
  admin,
  onAbspielen,
  onBearbeiten,
}: {
  eintrag: HandbuchEintrag
  admin: boolean
  onAbspielen: () => void
  onBearbeiten: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const f = fassung(e, sprache)
  const { laeuft, aus } = useAktion()
  const [wegFragen, setWegFragen] = useState(false)
  const bild = useQuery({
    queryKey: ['handbuch', 'bild', e.vorschaubild?.id],
    queryFn: () => (e.vorschaubild ? dateiAdresse(e.vorschaubild) : null),
    enabled: e.vorschaubild !== null,
    staleTime: 4 * 60_000,
  })
  const angaben = [e.sprache ? t(`handbuch.videos.sprache.${e.sprache}`) : null, formatDatum(e.erstellt_am)].filter(
    Boolean,
  )

  return (
    <li>
      <Karte className="flex h-full flex-col overflow-hidden">
        <button
          type="button"
          className="group focus-visible:ring-ring bg-primary relative block aspect-video w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset"
          aria-label={t('handbuch.videos.abspielen', { titel: f.titel })}
          onClick={onAbspielen}
        >
          {bild.data ? (
            <img src={bild.data} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <Video
              className="text-primary-foreground/60 absolute top-1/2 left-1/2 size-10 -translate-1/2"
              aria-hidden="true"
            />
          )}
          <span className="bg-surface text-primary absolute top-1/2 left-1/2 flex size-12 -translate-1/2 items-center justify-center rounded-full shadow transition group-hover:scale-110">
            <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
          </span>
          {e.dauer_s ? (
            <span className="absolute right-2 bottom-2 rounded bg-[rgb(2_10_24/0.75)] px-1.5 py-0.5 text-xs font-medium text-white">
              {dauerText(e.dauer_s)}
            </span>
          ) : null}
        </button>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="font-medium">{f.titel}</p>
          {f.beschreibung && <p className="text-muted-foreground text-sm">{f.beschreibung}</p>}
          <p className="text-muted-foreground mt-auto pt-1 text-xs">{angaben.join(' · ')}</p>
          {admin && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={onBearbeiten}>
                {t('allgemein.bearbeiten')}
              </Button>
              <Button
                size="sm"
                variant={wegFragen ? 'danger' : 'ghost'}
                laedt={laeuft}
                onClick={() => {
                  if (!wegFragen) {
                    setWegFragen(true)
                    return
                  }
                  void aus(() => entferneEintrag(e.id), { de: 'Video entfernt', fr: 'Vidéo retirée' })
                }}
                onBlur={() => {
                  setWegFragen(false)
                }}
              >
                {wegFragen ? t('handbuch.wirklichEntfernen') : t('handbuch.entfernen')}
              </Button>
            </div>
          )}
        </div>
      </Karte>
    </li>
  )
}
