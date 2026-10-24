import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useUi } from '@/stores/ui'
import { fassung } from '../lib/handbuch'
import { dateiAdresse } from '../services/handbuch'
import type { HandbuchEintrag } from '../types'

/** Spielt ein Video im CRM ab (V233 vidPlay). Die Adresse gilt nur kurz, deshalb erst beim Öffnen holen. */
export function VideoAbspielen({ eintrag, onSchliessen }: { eintrag: HandbuchEintrag; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const f = fassung(eintrag, sprache)
  const adresse = useQuery({
    queryKey: ['handbuch', 'video', f.datei?.id],
    queryFn: () => (f.datei ? dateiAdresse(f.datei) : null),
    staleTime: 4 * 60_000,
  })
  const bild = useQuery({
    queryKey: ['handbuch', 'bild', eintrag.vorschaubild?.id],
    queryFn: () => (eintrag.vorschaubild ? dateiAdresse(eintrag.vorschaubild) : null),
    enabled: eintrag.vorschaubild !== null,
    staleTime: 4 * 60_000,
  })

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt titel={f.titel} {...(f.beschreibung ? { beschreibung: f.beschreibung } : {})} className="md:max-w-4xl">
        {adresse.error ? (
          <Fehlerzustand details={String(adresse.error)} onNochmal={() => void adresse.refetch()} />
        ) : adresse.data ? (
          <video
            src={adresse.data}
            {...(bild.data ? { poster: bild.data } : {})}
            controls
            autoPlay
            playsInline
            className="aspect-video w-full rounded-md bg-[rgb(2_10_24)]"
          >
            {t('handbuch.videos.keinVideo')}
          </video>
        ) : (
          <Skelett className="aspect-video w-full" />
        )}
      </DialogInhalt>
    </Dialog>
  )
}
