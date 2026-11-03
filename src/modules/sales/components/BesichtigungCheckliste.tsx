import { Camera, Check, Circle } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useVerkaufAenderung } from '../hooks/useVerkauf'
import { BESICHTIGUNG_FOTOS, fotoOrdner, type BesichtigungFoto, type CheckPunkt } from '../lib/besichtigung'
import { speichereBesichtigungsFoto } from '../services/leads'

interface Props {
  verkaufschanceId: string
  punkte: CheckPunkt[]
}

/**
 * Checkliste der Besichtigung am Handy: was fehlt noch, und bei den Fotos direkt die Kamera.
 * Ein Foto gilt als erledigt, sobald eines im passenden Ordner liegt.
 */
export function BesichtigungCheckliste({ verkaufschanceId, punkte }: Props) {
  const { t } = useTranslation()
  const kamera = useRef<HTMLInputElement>(null)
  const [art, setArt] = useState<BesichtigungFoto | null>(null)
  const hochladen = useVerkaufAenderung((e: { art: BesichtigungFoto; datei: File }) =>
    speichereBesichtigungsFoto(verkaufschanceId, fotoOrdner(e.art), e.datei),
  )

  async function gewaehlt(datei: File | undefined) {
    if (!datei || !art) return
    try {
      await hochladen.mutateAsync({ art, datei })
      melde('ok', { de: 'Foto gespeichert', fr: 'Photo enregistrée' })
    } catch (f) {
      meldeFehler(f, 'besichtigung-foto')
      melde('kritisch', { de: 'Foto nicht gespeichert', fr: 'Photo non enregistrée' })
    } finally {
      setArt(null)
      if (kamera.current) kamera.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold">{t('verkauf.besichtigung.checkliste')}</h3>
      <ul className="flex flex-col" aria-label={t('verkauf.besichtigung.checkliste')}>
        {punkte.map((p) => {
          const foto = BESICHTIGUNG_FOTOS.find((a) => `foto_${a}` === p.schluessel)
          return (
            <li key={p.schluessel} className="flex min-h-10 items-center gap-2 text-sm">
              {p.erledigt ? (
                <Check className="text-ok size-4 shrink-0" aria-label="✓" />
              ) : (
                <Circle className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              )}
              <span className={p.erledigt ? 'text-muted-foreground flex-1' : 'flex-1'}>
                {t(`verkauf.besichtigung.punkt.${p.schluessel}`)}
              </span>
              {foto && (
                <Button
                  size="sm"
                  variant={p.erledigt ? 'ghost' : 'secondary'}
                  laedt={hochladen.isPending && art === foto}
                  aria-label={`${t('verkauf.besichtigung.foto')}: ${t(`verkauf.besichtigung.punkt.${p.schluessel}`)}`}
                  onClick={() => {
                    setArt(foto)
                    kamera.current?.click()
                  }}
                >
                  <Camera />
                  {t('verkauf.besichtigung.foto')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <input
        ref={kamera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void gewaehlt(e.target.files?.[0])}
      />
    </div>
  )
}
