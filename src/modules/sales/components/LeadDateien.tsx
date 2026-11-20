import { FileText, Image as Bild } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DateiFenster,
  DateiMailKnopf,
  ZipKnopf,
  type DateiFensterZustand,
  type DateiMailEmpfaenger,
} from '@/components/shared/dateien/DateiFenster'
import { formatDatum } from '@/lib/format'
import type { DokumentQuelle } from '@/services/dokumente'

type Datei = DokumentQuelle & { hochgeladen_am: string | null }

/**
 * Dateien des Leads (Fotos, Stromrechnung, Pläne): Klick zeigt sie in der App, ✉ schickt eine an den Kunden,
 * «Alle als ZIP» lädt alle auf einmal (V234).
 */
export function LeadDateien({
  dateien,
  mail,
  zipName,
}: {
  dateien: Datei[]
  mail?: DateiMailEmpfaenger | null | undefined
  zipName: string
}) {
  const { t } = useTranslation()
  const [fenster, setFenster] = useState<DateiFensterZustand>(null)
  if (!dateien.length) return <p className="text-muted-foreground text-sm">{t('verkauf.akte.keineDateien')}</p>
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end empty:hidden">
        <ZipKnopf dateien={dateien} name={zipName} />
      </div>
      <ul className="flex flex-col gap-1">
        {dateien.map((d) => {
          const Icon = d.mime_typ?.startsWith('image/') ? Bild : FileText
          return (
            <li key={d.id} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (!d.speicher_pfad && d.sharepoint_url) window.open(d.sharepoint_url, '_blank', 'noopener')
                  else setFenster({ art: 'vorschau', id: d.id })
                }}
                className="hover:bg-muted focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2"
              >
                <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                <span className="text-muted-foreground zahlen font-mono text-xs">
                  {d.hochgeladen_am ? formatDatum(d.hochgeladen_am) : ''}
                </span>
              </button>
              {mail?.an && (
                <DateiMailKnopf
                  name={d.name}
                  onClick={() => {
                    setFenster({ art: 'mail', id: d.id })
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
      <DateiFenster dateien={dateien} zustand={fenster} onZustand={setFenster} mail={mail} />
    </div>
  )
}
