import { useQueryClient } from '@tanstack/react-query'
import { Camera, CloudUpload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { verkleinern } from '@/lib/bild'
import { melde } from '@/services/meldungen'
import { useBilder } from '../hooks/useBaustelle'
import { bildAblegen } from '../services/monteur'

/** Fotos der Baustelle: direkt mit der Kamera, verkleinert, auch ohne Netz (gehen später hoch). */
export function FotoAbschnitt({ rapportId, offen }: { rapportId: string; offen: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const bilder = useBilder(rapportId)
  const eingabe = useRef<HTMLInputElement>(null)
  const [laedt, setLaedt] = useState(false)
  const fotos = (bilder.data ?? []).filter((b) => b.ordner === 'fotos')

  async function hinzufuegen(dateien: FileList | null) {
    if (!dateien?.length) return
    setLaedt(true)
    try {
      for (const d of Array.from(dateien)) await bildAblegen(rapportId, await verkleinern(d), 'fotos')
      await qc.invalidateQueries({ queryKey: ['baustelle', 'bilder', rapportId] })
    } catch {
      melde('kritisch', { de: 'Foto nicht gespeichert', fr: 'Photo non enregistrée' })
    } finally {
      setLaedt(false)
      if (eingabe.current) eingabe.current.value = ''
    }
  }

  return (
    <AkteAbschnitt titel={t('baustelle.foto.titel')} zusatz={fotos.length ? String(fotos.length) : undefined}>
      {bilder.isPending ? (
        <Skelett className="h-20" />
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((f) => (
            <li key={f.id} className="bg-muted relative aspect-square overflow-hidden rounded-md">
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer">
                  <img src={f.url} alt={f.name} className="size-full object-cover" loading="lazy" />
                </a>
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center p-1 text-center text-xs">
                  {f.name}
                </span>
              )}
              {f.lokal && (
                <span
                  className="bg-surface/90 absolute right-1 bottom-1 rounded p-0.5"
                  title={t('baustelle.foto.wartet')}
                >
                  <CloudUpload className="text-warn size-3.5" aria-label={t('baustelle.foto.wartet')} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {offen && (
        <>
          <input
            ref={eingabe}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            aria-label={t('baustelle.foto.aufnehmen')}
            onChange={(e) => void hinzufuegen(e.target.files)}
          />
          <Button className="mt-2" size="lg" variant="secondary" laedt={laedt} onClick={() => eingabe.current?.click()}>
            <Camera />
            {t('baustelle.foto.aufnehmen')}
          </Button>
        </>
      )}
    </AkteAbschnitt>
  )
}
