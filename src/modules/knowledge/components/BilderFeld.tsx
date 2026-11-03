import { Camera, FileText, ImagePlus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDateienHinzufuegen } from '../hooks/useDateienHinzufuegen'
import { MAX_ANHAENGE, dateienAus } from '../lib/anhaenge'

/** Touch-Gerät (Handy, Tablet): dort gibt es «Foto aufnehmen», am PC den Hinweis auf Strg+V. */
function istTouch(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * Bildschirmfotos und Fotos für eine Meldung. Am PC: Strg+V (das Einfügen hört der ganze Dialog, siehe
 * MeldungDialog), hineinziehen oder «Bild wählen». Am Handy: «Foto aufnehmen» öffnet direkt die Kamera,
 * «Bild wählen» die Galerie. Vorschau als kleine Bilder, jedes mit «Entfernen».
 */
export function BilderFeld({ dateien, onDateien }: { dateien: File[]; onDateien: (d: File[]) => void }) {
  const { t } = useTranslation()
  const kamera = useRef<HTMLInputElement>(null)
  const auswahl = useRef<HTMLInputElement>(null)
  const [ziehen, setZiehen] = useState(false)
  const [touch] = useState(istTouch)
  const dazu = useDateienHinzufuegen(dateien, onDateien)
  const vorschau = useMemo(
    () => dateien.map((f) => ({ f, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null })),
    [dateien],
  )
  useEffect(
    () => () => {
      for (const v of vorschau) if (v.url) URL.revokeObjectURL(v.url)
    },
    [vorschau],
  )

  const gewaehlt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const neu = [...(e.target.files ?? [])]
    e.target.value = ''
    dazu(neu)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium">{t('handbuch.meldungen.dateien')}</span>
      <div
        data-testid="meldung-bilder"
        onDragOver={(e) => {
          e.preventDefault()
          setZiehen(true)
        }}
        onDragLeave={() => {
          setZiehen(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setZiehen(false)
          dazu(dateienAus(e.dataTransfer))
        }}
        className={cn(
          'flex flex-col gap-3 rounded-lg border border-dashed p-3 transition-colors',
          ziehen ? 'border-ring bg-muted' : 'bg-surface',
        )}
      >
        {vorschau.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {vorschau.map(({ f, url }) => (
              <li
                key={`${f.name}-${String(f.size)}`}
                className="bg-muted relative aspect-square overflow-hidden rounded-md border"
              >
                {url ? (
                  <img src={url} alt={f.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
                    <FileText className="text-muted-foreground size-6" />
                    <span className="line-clamp-2 text-xs break-all">{f.name}</span>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 right-1 size-7 rounded-full shadow"
                  aria-label={t('handbuch.meldungen.bildEntfernen', { name: f.name })}
                  onClick={() => {
                    onDateien(dateien.filter((d) => d !== f))
                  }}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {touch && (
            <Button variant="secondary" onClick={() => kamera.current?.click()}>
              <Camera />
              {t('handbuch.meldungen.fotoAufnehmen')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => auswahl.current?.click()}>
            <ImagePlus />
            {t('handbuch.meldungen.bildWaehlen')}
          </Button>
          <span className="text-muted-foreground text-xs">
            {dateien.length >= MAX_ANHAENGE
              ? t('handbuch.meldungen.bilderVoll', { max: MAX_ANHAENGE })
              : touch
                ? t('handbuch.meldungen.bilderHinweisHandy')
                : t('handbuch.meldungen.bilderHinweisPc')}
          </span>
        </div>
      </div>
      <input
        ref={kamera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="meldung-kamera"
        onChange={gewaehlt}
      />
      <input
        ref={auswahl}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        data-testid="meldung-datei"
        onChange={gewaehlt}
      />
    </div>
  )
}
