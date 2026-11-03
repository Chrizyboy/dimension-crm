import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Paperclip } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { melde } from '@/services/meldungen'
import { useAktion, useAnhaenge } from '../hooks/useHandbuch'
import { MAX_ANHAENGE, hinzufuegen } from '../lib/anhaenge'
import { anhaengen } from '../services/meldungen'
import type { HandbuchDatei } from '../types'
import { oeffneDatei } from './Oeffnen'

/**
 * Bilder und Dateien einer Meldung: Bildschirmfotos als Vorschau (Klick = gross, mit Blättern), PDFs als Knopf.
 * Solange die Meldung offen ist, kann man mit «Bild anhängen» nachreichen (z. B. nach einer Rückfrage).
 */
export function MeldungAnhaenge({ meldungId, nachreichen }: { meldungId: string; nachreichen: boolean }) {
  const { t } = useTranslation()
  const anhaenge = useAnhaenge(meldungId)
  const qc = useQueryClient()
  const { laeuft, aus } = useAktion()
  const auswahl = useRef<HTMLInputElement>(null)
  const [gross, setGross] = useState<number | null>(null)
  const dateien = anhaenge.data?.dateien ?? []
  const adressen = anhaenge.data?.adressen ?? {}
  const bilder = dateien.filter((d) => adressen[d.id])
  const andere = dateien.filter((d) => !adressen[d.id])
  const platz = MAX_ANHAENGE - dateien.length

  async function dazu(neu: File[]) {
    const r = hinzufuegen([], neu.slice(0, Math.max(0, platz)))
    const zuviel = neu.length - r.dateien.length
    if (!r.dateien.length) {
      melde('warnung', { de: 'Nur Bilder oder PDF bis 20 MB', fr: 'Images ou PDF jusqu’à 20 Mo uniquement' })
      return
    }
    await aus(async () => {
      const fehlend = await anhaengen(meldungId, r.dateien)
      await qc.invalidateQueries({ queryKey: ['meldungen', 'anhaenge', meldungId] })
      if (fehlend) throw new Error(`${String(fehlend)} Anhang/Anhänge nicht hochgeladen`)
      melde(zuviel ? 'warnung' : 'ok', {
        de: zuviel ? `Angehängt, ${String(zuviel)} weggelassen (höchstens ${String(MAX_ANHAENGE)})` : 'Angehängt',
        fr: zuviel ? `Joint, ${String(zuviel)} ignoré(s) (${String(MAX_ANHAENGE)} au maximum)` : 'Joint',
      })
    })
  }

  if (!dateien.length && !nachreichen) return null
  const aktuell: HandbuchDatei | undefined = gross !== null ? bilder[gross] : undefined

  return (
    <div className="flex flex-col gap-2" data-testid="meldung-anhaenge">
      {bilder.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {bilder.map((d, i) => (
            <li key={d.id}>
              <button
                type="button"
                className="bg-muted focus-visible:ring-ring block size-24 overflow-hidden rounded-md border outline-none focus-visible:ring-2 sm:size-28"
                aria-label={t('handbuch.meldungen.bildGross', { name: d.name })}
                onClick={() => {
                  setGross(i)
                }}
              >
                <img src={adressen[d.id]} alt={d.name} loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {andere.map((d) => (
          <Button key={d.id} size="sm" variant="secondary" onClick={() => void oeffneDatei(d)}>
            <Paperclip />
            {d.name}
          </Button>
        ))}
        {nachreichen && platz > 0 && (
          <Button size="sm" variant="ghost" laedt={laeuft} onClick={() => auswahl.current?.click()}>
            <ImagePlus />
            {t('handbuch.meldungen.bildAnhaengen')}
          </Button>
        )}
      </div>
      <input
        ref={auswahl}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        data-testid="meldung-nachreichen"
        onChange={(e) => {
          const neu = [...(e.target.files ?? [])]
          e.target.value = ''
          void dazu(neu)
        }}
      />
      {aktuell && gross !== null && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setGross(null)
          }}
        >
          <DialogInhalt
            titel={aktuell.name}
            beschreibung={t('handbuch.meldungen.bildVon', { nr: gross + 1, von: bilder.length })}
            className="md:max-w-4xl"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setGross((g) => ((g ?? 0) + 1) % bilder.length)
              if (e.key === 'ArrowLeft') setGross((g) => ((g ?? 0) - 1 + bilder.length) % bilder.length)
            }}
            fuss={
              <>
                {bilder.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      aria-label={t('handbuch.meldungen.bildZurueck')}
                      onClick={() => {
                        setGross((g) => ((g ?? 0) - 1 + bilder.length) % bilder.length)
                      }}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={t('handbuch.meldungen.bildWeiter')}
                      onClick={() => {
                        setGross((g) => ((g ?? 0) + 1) % bilder.length)
                      }}
                    >
                      <ChevronRight />
                    </Button>
                  </>
                )}
                <Button variant="secondary" onClick={() => void oeffneDatei(aktuell)}>
                  <ExternalLink />
                  {t('handbuch.meldungen.bildOeffnen')}
                </Button>
              </>
            }
          >
            <img
              src={adressen[aktuell.id]}
              alt={aktuell.name}
              className="mx-auto max-h-[65vh] w-auto max-w-full rounded-md object-contain"
            />
          </DialogInhalt>
        </Dialog>
      )}
    </div>
  )
}
