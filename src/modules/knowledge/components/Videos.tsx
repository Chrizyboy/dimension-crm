import { Plus, Search, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { useUi } from '@/stores/ui'
import { useHandbuch } from '../hooks/useHandbuch'
import { passt, sortiere } from '../lib/handbuch'
import type { HandbuchEintrag } from '../types'
import { VideoAbspielen } from './VideoAbspielen'
import { VideoDialog } from './VideoDialog'
import { VideoKarte } from './VideoKarte'

/**
 * Videos (V219): kurze Erklärvideos zum CRM, abspielen direkt im CRM. Die Administration legt neue an,
 * ändert Titel und Text oder entfernt sie (die Datei bleibt im Speicher).
 */
export function Videos({ admin }: { admin: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const daten = useHandbuch()
  const [suche, setSuche] = useState('')
  const [dialog, setDialog] = useState<HandbuchEintrag | 'neu' | null>(null)
  const [laeuft, setLaeuft] = useState<HandbuchEintrag | null>(null)
  const alle = useMemo(() => (daten.data ?? []).filter((e) => e.art === 'video'), [daten.data])
  const liste = useMemo(() => sortiere(alle.filter((e) => passt(e, suche)), sprache), [alle, suche, sprache])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">{t('handbuch.videos.intro')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              type="search"
              aria-label={t('handbuch.videos.suche')}
              placeholder={t('handbuch.videos.suche')}
              className="w-64 pl-8"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
              }}
            />
          </div>
          {admin && (
            <Button
              onClick={() => {
                setDialog('neu')
              }}
            >
              <Plus />
              {t('handbuch.videos.neu')}
            </Button>
          )}
        </div>
      </div>
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skelett className="aspect-video" />
          <Skelett className="aspect-video" />
        </div>
      ) : liste.length === 0 ? (
        <Leerzustand
          icon={Video}
          titel={alle.length ? t('handbuch.nichtsGefunden') : t('handbuch.videos.leer')}
          {...(!alle.length && admin ? { text: t('handbuch.videos.leerAdmin') } : {})}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((e) => (
            <VideoKarte
              key={e.id}
              eintrag={e}
              admin={admin}
              onAbspielen={() => {
                setLaeuft(e)
              }}
              onBearbeiten={() => {
                setDialog(e)
              }}
            />
          ))}
        </ul>
      )}
      {laeuft && (
        <VideoAbspielen
          eintrag={laeuft}
          onSchliessen={() => {
            setLaeuft(null)
          }}
        />
      )}
      {dialog && (
        <VideoDialog
          eintrag={dialog === 'neu' ? null : dialog}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
