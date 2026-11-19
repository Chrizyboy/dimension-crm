import { ImagePlus, Paperclip } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DateiFenster,
  DateiMailKnopf,
  ZipKnopf,
  type DateiFensterZustand,
  type DateiMailEmpfaenger,
} from '@/components/shared/dateien/DateiFenster'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { anhangHochladen } from '../services/service'
import { Box } from './Box'

/**
 * Fotos und Dateien des Falls (privater Speicher); mehrere auf einmal, am Handy direkt mit der Kamera.
 * Klick zeigt sie in der App, ✉ schickt eine an den Kunden, «Alle als ZIP» z. B. für den Hersteller.
 */
export function AnhaengeBox({
  id,
  anhaenge,
  mail,
  zipName,
}: {
  id: string
  mail?: DateiMailEmpfaenger | null | undefined
  zipName: string
  anhaenge: {
    id: string
    name: string
    mime_typ?: string | null
    erstellt_am: string
    sharepoint_url: string | null
    speicher_pfad: string | null
  }[]
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const datei = useRef<HTMLInputElement>(null)
  const [fenster, setFenster] = useState<DateiFensterZustand>(null)
  return (
    <Box
      titel={t('service.akte.anhaenge')}
      rechts={
        <span className="flex items-center gap-1">
          <ZipKnopf dateien={anhaenge} name={zipName} />
          <Button variant="ghost" size="sm" laedt={laeuft} onClick={() => datei.current?.click()}>
            <ImagePlus />
            {t('service.akte.hochladen')}
          </Button>
        </span>
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
                  if (!d.speicher_pfad && d.sharepoint_url) window.open(d.sharepoint_url, '_blank', 'noopener')
                  else setFenster({ art: 'vorschau', id: d.id })
                }}
              >
                <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{d.name}</span>
              </button>
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-muted-foreground text-xs">{formatDatum(d.erstellt_am)}</span>
                {mail?.an && (
                  <DateiMailKnopf
                    name={d.name}
                    onClick={() => {
                      setFenster({ art: 'mail', id: d.id })
                    }}
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <DateiFenster dateien={anhaenge} zustand={fenster} onZustand={setFenster} mail={mail} />
    </Box>
  )
}
