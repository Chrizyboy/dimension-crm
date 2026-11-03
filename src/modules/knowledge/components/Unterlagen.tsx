import { FileText, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUi } from '@/stores/ui'
import { useHandbuch } from '../hooks/useHandbuch'
import { dauerText, fassung, sortiere } from '../lib/handbuch'
import type { HandbuchEintrag } from '../types'
import { oeffneDatei } from './Oeffnen'
import { VideoAbspielen } from './VideoAbspielen'

/**
 * Prozesse (PDF) und Videos, die die Administration diesem Bereich zugeordnet hat (Entscheid 0043).
 * Ohne Zuordnung zeigt das Kapitel nichts, die Einträge bleiben in ihren Reitern.
 */
export function Unterlagen({ bereich, kompakt = false }: { bereich: string; kompakt?: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const handbuch = useHandbuch()
  const [video, setVideo] = useState<HandbuchEintrag | null>(null)
  const liste = sortiere(
    (handbuch.data ?? []).filter((e) => e.bereich === bereich),
    sprache,
  )
  if (!liste.length) return null

  return (
    <section aria-labelledby={`unterlagen-${bereich}`} className="flex flex-col gap-2">
      <h3 id={`unterlagen-${bereich}`} className="font-display text-sm font-semibold">
        {t('handbuch.kapitel.unterlagen')}
      </h3>
      <ul className={kompakt ? 'flex flex-col gap-2' : 'grid gap-2 sm:grid-cols-2'}>
        {liste.map((e) => {
          const f = fassung(e, sprache)
          const prozess = e.art === 'prozess'
          const Icon = prozess ? FileText : PlayCircle
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  if (prozess) void oeffneDatei(f.datei)
                  else setVideo(e)
                }}
                className="bg-surface hover:bg-muted focus-visible:ring-ring flex w-full items-start gap-3 rounded-lg border p-3 text-left outline-none focus-visible:ring-2"
              >
                <span className="bg-accent-soft text-accent-ink flex size-9 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-muted-foreground text-xs font-medium uppercase">
                    {prozess
                      ? t('handbuch.kapitel.prozess', { version: e.version ?? '–' })
                      : t('handbuch.kapitel.video', { dauer: dauerText(e.dauer_s) || '–' })}
                  </span>
                  <span className="font-medium">{f.titel}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {video && (
        <VideoAbspielen
          eintrag={video}
          onSchliessen={() => {
            setVideo(null)
          }}
        />
      )}
    </section>
  )
}
