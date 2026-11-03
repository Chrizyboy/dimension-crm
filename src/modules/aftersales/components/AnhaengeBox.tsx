import { ImagePlus, Paperclip } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { dokumentAdresse } from '@/services/dokumente'
import { useAktion } from '../hooks/useAktion'
import { anhangHochladen } from '../services/service'
import { Box } from './Box'

/** Fotos und Dateien des Falls (privater Speicher); mehrere auf einmal, am Handy direkt mit der Kamera. */
export function AnhaengeBox({
  id,
  anhaenge,
}: {
  id: string
  anhaenge: {
    id: string
    name: string
    erstellt_am: string
    sharepoint_url: string | null
    speicher_pfad: string | null
  }[]
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const datei = useRef<HTMLInputElement>(null)
  return (
    <Box
      titel={t('service.akte.anhaenge')}
      rechts={
        <Button variant="ghost" size="sm" laedt={laeuft} onClick={() => datei.current?.click()}>
          <ImagePlus />
          {t('service.akte.hochladen')}
        </Button>
      }
    >
      <input
        ref={datei}
        type="file"
        multiple
        accept="image/*,application/pdf"
        hidden
        aria-label={t('service.akte.hochladen')}
        onChange={(e) => {
          const dateien = [...(e.target.files ?? [])]
          e.target.value = ''
          if (dateien.length > 0)
            void aus(
              async () => {
                for (const d of dateien) await anhangHochladen(id, d)
              },
              { de: 'Abgelegt', fr: 'Déposé' },
            )
        }}
      />
      {anhaenge.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t('service.akte.keineAnhaenge')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {anhaenge.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-accent-ink inline-flex min-w-0 items-center gap-1 truncate underline"
                onClick={() => {
                  void dokumentAdresse(d).then((u) => {
                    if (u) window.open(u, '_blank', 'noopener')
                  })
                }}
              >
                <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{d.name}</span>
              </button>
              <span className="text-muted-foreground text-xs">{formatDatum(d.erstellt_am)}</span>
            </li>
          ))}
        </ul>
      )}
    </Box>
  )
}
