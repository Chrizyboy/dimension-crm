import { useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, CloudUpload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { verkleinern } from '@/lib/bild'
import { melde } from '@/services/meldungen'
import { useBilder, usePflichtfotos } from '../hooks/useBaustelle'
import { pflichtFuer } from '../lib/pflichtfotos'
import { bildAblegen } from '../services/monteur'
import type { RapportArt } from '../types'
import { useUi } from '@/stores/ui'

/**
 * Fotos der Baustelle: direkt mit der Kamera, verkleinert, auch ohne Netz (gehen später hoch).
 * Pflichtfotos der Rapport-Art (Einstellungen › Baustelle) haben je einen eigenen Knopf mit Häkchen,
 * damit der Monteur sieht, was noch fehlt; ohne sie lässt sich der Rapport nicht abschliessen.
 */
export function FotoAbschnitt({ rapportId, art, offen }: { rapportId: string; art: RapportArt; offen: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const qc = useQueryClient()
  const bilder = useBilder(rapportId)
  const pflicht = pflichtFuer(usePflichtfotos().data, art)
  const eingabe = useRef<HTMLInputElement>(null)
  // Welche Pflicht-Kategorie die Kamera gerade aufnimmt (null = freies Foto).
  const [kategorie, setKategorie] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)
  const fotos = (bilder.data ?? []).filter((b) => b.ordner === 'fotos')
  const da = new Set(fotos.map((f) => f.kategorie))

  function aufnehmen(k: string | null) {
    setKategorie(k)
    eingabe.current?.click()
  }

  const titelVon = (k: string | null) => {
    const p = pflicht.find((x) => x.schluessel === k)
    return p ? (sprache === 'fr' ? p.fr : p.de) : undefined
  }

  async function hinzufuegen(dateien: FileList | null) {
    if (!dateien?.length) return
    setLaedt(true)
    try {
      for (const d of Array.from(dateien))
        await bildAblegen(rapportId, await verkleinern(d), 'fotos', kategorie ?? undefined)
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
                <a href={f.url} target="_blank" rel="noreferrer" title={titelVon(f.kategorie)}>
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
      {pflicht.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label={t('baustelle.foto.pflicht')}>
          {pflicht.map((p) => {
            const ok = da.has(p.schluessel)
            const text = sprache === 'fr' ? p.fr : p.de
            return (
              <li key={p.schluessel}>
                {offen ? (
                  <Button
                    size="sm"
                    variant={ok ? 'ghost' : 'secondary'}
                    laedt={laedt && kategorie === p.schluessel}
                    onClick={() => {
                      aufnehmen(p.schluessel)
                    }}
                  >
                    {ok ? <CheckCircle2 className="text-ok" /> : <Camera />}
                    {text}
                  </Button>
                ) : (
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                    {ok && <CheckCircle2 className="text-ok size-3.5" />}
                    {text}
                  </span>
                )}
              </li>
            )
          })}
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
            laedt={laedt && kategorie === null}
            onClick={() => {
              aufnehmen(null)
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
