import { useQuery } from '@tanstack/react-query'
import { ExternalLink, ImagePlus, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useDrucken } from '@/hooks/useDrucken'
import { cn } from '@/lib/utils'
import { dokumentAdresse } from '@/services/dokumente'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAussendienst, useLeadAkte, useVerkaufAenderung } from '../hooks/useVerkauf'
import { speichereLuftbild } from '../services/leads'
import type { Geschaeft } from '../types'
import { Terminblatt } from './Terminblatt'

/** Bild auf das Seitenverhältnis des Kastens zuschneiden («cover») und als JPEG vorbereiten (V233 tbPrepImg). */
async function bereiteVor(bild: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(bild)
  const breite = 1200
  const hoehe = Math.round((breite * 70) / 92)
  const c = document.createElement('canvas')
  c.width = breite
  c.height = hoehe
  const g = c.getContext('2d')
  if (!g) return bild
  g.fillStyle = '#fff'
  g.fillRect(0, 0, breite, hoehe)
  const s = Math.max(breite / bmp.width, hoehe / bmp.height)
  g.drawImage(bmp, (breite - bmp.width * s) / 2, (hoehe - bmp.height * s) / 2, bmp.width * s, bmp.height * s)
  return new Promise((ok) => {
    c.toBlob(
      (b) => {
        ok(b ?? bild)
      },
      'image/jpeg',
      0.86,
    )
  })
}

/** Google Maps als Satellitenbild an der Adresse, für den Screenshot. */
function satellit(g: Geschaeft): string {
  const ort = [g.strasse, g.plz, g.ort].filter(Boolean).join(' ')
  if (g.lageGenau && g.breite !== null && g.laenge !== null)
    return `https://www.google.com/maps/@?api=1&map_action=map&center=${g.breite},${g.laenge}&zoom=20&basemap=satellite`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ort)}`
}

/**
 * Terminblatt vorbereiten: Luftbild aus Google Maps als Screenshot einfügen (Strg+V) oder hineinziehen,
 * dann drucken oder als PDF sichern. Das Luftbild wird beim Lead abgelegt.
 */
export default function TerminblattDialog({ g, onSchliessen }: { g: Geschaeft; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const akte = useLeadAkte(g.verkaufschanceId)
  const personen = useAussendienst()
  const druck = useDrucken()
  const [neu, setNeu] = useState<string | null>(null)
  const ablegen = useVerkaufAenderung((b: Blob) => speichereLuftbild(g.verkaufschanceId ?? '', b))
  const vorhanden = (akte.dateien.data ?? []).find((d) => d.ordner === 'luftbild')
  const gespeichert = useQuery({
    queryKey: ['luftbild', vorhanden?.id],
    queryFn: () => (vorhanden ? dokumentAdresse(vorhanden) : null),
    enabled: vorhanden !== undefined,
    staleTime: 4 * 60_000,
  })
  const bild = neu ?? gespeichert.data ?? null

  async function nimm(datei: Blob | null | undefined) {
    if (!datei?.type.startsWith('image/')) {
      melde('warnung', { de: 'Bitte ein Bild einfügen', fr: 'Merci d’insérer une image' })
      return
    }
    try {
      const fertig = await bereiteVor(datei)
      setNeu(URL.createObjectURL(fertig))
      if (g.verkaufschanceId) {
        await ablegen.mutateAsync(fertig)
        melde('ok', { de: 'Luftbild beim Lead gespeichert', fr: 'Vue aérienne enregistrée avec le lead' })
      }
    } catch (f) {
      meldeFehler(f, 'luftbild')
      melde('kritisch', { de: 'Bild nicht gespeichert', fr: 'Image non enregistrée' })
    }
  }

  useEffect(() => {
    const einfuegen = (e: ClipboardEvent) => {
      const datei = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (datei) {
        e.preventDefault()
        void nimm(datei)
      }
    }
    window.addEventListener('paste', einfuegen)
    return () => {
      window.removeEventListener('paste', einfuegen)
    }
  })

  const person = personen.data?.find((p) => p.id === (g.terminPersonId ?? g.personId))?.name ?? null
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.terminblatt.titel')}
        beschreibung={g.name}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.schliessen')}
            </Button>
            <Button onClick={druck.drucke}>
              <Printer />
              {t('verkauf.terminblatt.drucken')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <a
            href={satellit(g)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary dark:text-accent inline-flex items-center gap-1.5 text-sm hover:underline"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t('verkauf.terminblatt.mapsOeffnen')}
          </a>
          <label
            onDragOver={(e) => {
              e.preventDefault()
            }}
            onDrop={(e) => {
              e.preventDefault()
              void nimm(e.dataTransfer.files[0])
            }}
            className={cn(
              'hover:bg-muted/60 focus-within:ring-ring flex aspect-[92/70] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed text-center focus-within:ring-2',
              bild && 'border-solid p-0',
            )}
          >
            {bild ? (
              <img src={bild} alt={t('verkauf.terminblatt.luftbild')} className="size-full object-cover" />
            ) : (
              <>
                <ImagePlus className="text-muted-foreground size-6" aria-hidden="true" />
                <span className="text-muted-foreground max-w-xs px-4 text-sm">
                  {t('verkauf.terminblatt.einfuegen')}
                </span>
              </>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void nimm(e.target.files?.[0])} />
          </label>
          {ablegen.isPending && <p className="text-muted-foreground text-xs">{t('verkauf.terminblatt.speichert')}</p>}
        </div>
        {druck.aktiv && (
          <Terminblatt
            g={g}
            details={akte.details.data}
            verlauf={akte.verlauf.data ?? []}
            luftbild={bild}
            person={person}
          />
        )}
      </DialogInhalt>
    </Dialog>
  )
}
