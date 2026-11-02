import { useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, CloudUpload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { verkleinern } from '@/lib/bild'
import { melde } from '@/services/meldungen'
import { useBilder } from '../hooks/useBaustelle'
import { bildAblegen } from '../services/monteur'
import type { Schritt } from '../types'

/** Fotos der Baustelle: direkt mit der Kamera, verkleinert, auch ohne Netz (gehen später hoch). */
export function FotoAbschnitt({
  rapportId,
  offen,
  pflicht = [],
  da = [],
}: {
  rapportId: string
  offen: boolean
  /** Pflichtfotos der Baustelle (Montage) und die Kategorien, die schon da sind. */
  pflicht?: Schritt[]
  da?: string[]
}) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const bilder = useBilder(rapportId)
  const eingabe = useRef<HTMLInputElement>(null)
  const [laedt, setLaedt] = useState(false)
  const [kategorie, setKategorie] = useState<string | null>(null)
  const [neuDa, setNeuDa] = useState<string[]>([])
  const sprache = i18n.language.startsWith('fr') ? 'fr' : 'de'
  const vorhanden = new Set([...da, ...neuDa])
  const fotos = (bilder.data ?? []).filter((b) => b.ordner === 'fotos')

  async function hinzufuegen(dateien: FileList | null) {
    if (!dateien?.length) return
    setLaedt(true)
    try {
      for (const d of Array.from(dateien)) await bildAblegen(rapportId, await verkleinern(d), 'fotos', { kategorie })
      if (kategorie) setNeuDa([...neuDa, kategorie])
      await qc.invalidateQueries({ queryKey: ['baustelle', 'bilder', rapportId] })
    } catch {
      melde('kritisch', { de: 'Foto nicht gespeichert', fr: 'Photo non enregistrée' })
    } finally {
      setLaedt(false)
      setKategorie(null)
      if (eingabe.current) eingabe.current.value = ''
    }
  }

  return (
    <AkteAbschnitt titel={t('baustelle.foto.titel')} zusatz={fotos.length ? String(fotos.length) : undefined}>
      {pflicht.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5" aria-label={t('baustelle.foto.pflicht')}>
          {pflicht.map((f) => {
            const ok = vorhanden.has(f.schluessel)
            return (
              <li key={f.schluessel}>
                <Button
                  size="sm"
                  variant={ok ? 'ghost' : 'secondary'}
                  disabled={!offen}
                  onClick={() => {
                    setKategorie(f.schluessel)
                    eingabe.current?.click()
                  }}
                >
                  {ok ? <CheckCircle2 className="text-ok" /> : <Camera />}
                  {f[sprache]}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
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
          <Button
            className="mt-2"
            size="lg"
            variant="secondary"
            laedt={laedt}
            onClick={() => {
              setKategorie(null)
              eingabe.current?.click()
            }}
          >
            <Camera />
            {t('baustelle.foto.aufnehmen')}
          </Button>
        </>
      )}
    </AkteAbschnitt>
  )
}
