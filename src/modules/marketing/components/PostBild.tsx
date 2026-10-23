import { useQuery } from '@tanstack/react-query'
import { Download, ImagePlus, Palette, X } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { useAktion } from '../hooks/useAktion'
import { useVerbindungen } from '../hooks/useMarketing'
import { bildAdressen, bildHochladen, canvaHolen, canvaNeu } from '../services/social'
import { FORMATE, type Format, type SocialPost } from '../types'

/**
 * Bild zum Post (V233 «Bild über Canva»): Format wählen, eigenes Foto hochladen oder in Canva mit dem Markenkit
 * gestalten und als PNG zurückholen. Das erste Bild wird gepostet. braucheId legt den Entwurf an, falls nötig.
 */
export function PostBild({
  post,
  fest,
  braucheId,
  onAenderung,
}: {
  post: Pick<SocialPost, 'bilder' | 'format' | 'details' | 'thema'>
  fest: boolean
  braucheId: () => Promise<string | undefined>
  onAenderung: (a: Partial<Pick<SocialPost, 'bilder' | 'format' | 'details'>>) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const datei = useRef<HTMLInputElement>(null)
  const verbindungen = useVerbindungen()
  const canva = verbindungen.data?.find((v) => v.dienst === 'canva')
  const canvaBereit = Boolean(canva?.verbunden && !canva.fehler)
  const adressen = useQuery({
    queryKey: ['marketing', 'bilder', post.bilder],
    queryFn: () => bildAdressen(post.bilder),
    enabled: post.bilder.length > 0,
    staleTime: 5 * 60_000,
  })
  const format: Format = post.format ?? 'quadrat'

  async function hochladen(f: File) {
    const id = await braucheId()
    if (!id) return
    const dok = await aus(() => bildHochladen(id, f))
    if (dok) onAenderung({ bilder: [...post.bilder, dok] })
  }
  async function inCanva() {
    const r = await aus(() => canvaNeu(format, post.thema ?? 'Dimension Solaire'))
    if (r) onAenderung({ details: { ...post.details, canva: r } })
  }
  async function ausCanva() {
    const id = await braucheId()
    const design = post.details.canva?.id
    if (!id || !design) return
    const dok = await aus(() => canvaHolen(id, design), {
      de: 'Bild aus Canva übernommen',
      fr: 'Image reprise de Canva',
    })
    if (dok) onAenderung({ bilder: [dok, ...post.bilder] })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Auswahl
          aria-label={t('marketing.post.format')}
          className="w-auto min-w-44"
          value={format}
          disabled={fest}
          onValueChange={(f) => {
            onAenderung({ format: f as Format })
          }}
          optionen={FORMATE.map((f) => ({ wert: f, text: t(`marketing.format.${f}`) }))}
        />
        {!fest && (
          <>
            <Button size="sm" variant="secondary" disabled={laeuft} onClick={() => datei.current?.click()}>
              <ImagePlus />
              {t('marketing.post.foto')}
            </Button>
            <Button size="sm" variant="secondary" disabled={!canvaBereit || laeuft} onClick={() => void inCanva()}>
              <Palette />
              {t('marketing.post.inCanva')}
            </Button>
            {post.details.canva && (
              <Button size="sm" disabled={!canvaBereit || laeuft} laedt={laeuft} onClick={() => void ausCanva()}>
                <Download />
                {t('marketing.post.ausCanva')}
              </Button>
            )}
          </>
        )}
        <input
          ref={datei}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={t('marketing.post.foto')}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void hochladen(f)
          }}
        />
      </div>
      {!canvaBereit && !fest && (
        <p className="text-muted-foreground text-xs">{t('marketing.post.canvaNichtVerbunden')}</p>
      )}
      {post.bilder.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {post.bilder.map((b, i) => (
            <li key={b} className="relative">
              {adressen.data?.[b] ? (
                <img
                  src={adressen.data[b]}
                  alt={t('marketing.post.bildNr', { nr: i + 1 })}
                  className="size-24 rounded-md border object-cover"
                />
              ) : (
                <div className="bg-muted size-24 rounded-md border" />
              )}
              {i === 0 && (
                <span className="bg-primary text-primary-foreground absolute bottom-1 left-1 rounded px-1 text-[10px]">
                  {t('marketing.post.wirdGepostet')}
                </span>
              )}
              {!fest && (
                <button
                  type="button"
                  aria-label={t('marketing.post.bildEntfernen')}
                  className="bg-surface absolute -top-2 -right-2 rounded-full border p-0.5"
                  onClick={() => {
                    onAenderung({ bilder: post.bilder.filter((x) => x !== b) })
                  }}
                >
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
