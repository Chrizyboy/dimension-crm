import { FileUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { meldeFehler } from '@/services/fehler'
import { belegHochladen, rechnungLesen, type GelesenRechnung } from '../services/eingang'
import { UploadDialog } from './UploadDialog'

interface Gelesen {
  datei: File
  dokumentId: string
  werte: GelesenRechnung | null
}

/**
 * Rechnung ins CRM schieben (Chris 27.11.2026): PDF oder Foto hierher ziehen oder wählen. Die Datei wird
 * gespeichert und gelesen; danach prüft man die Angaben im Formular und speichert. Mehrere Dateien nacheinander.
 */
export function EingangHochladen({ onGespeichert }: { onGespeichert: (id: string) => void }) {
  const { t } = useTranslation()
  const [schlange, setSchlange] = useState<File[]>([])
  const [liest, setLiest] = useState(false)
  const [offen, setOffen] = useState<Gelesen | null>(null)
  const h = 'rechnungen.eingang.hochladen'

  async function naechste(liste: File[]) {
    const [datei, ...rest] = liste
    setSchlange(rest)
    if (!datei) return
    setLiest(true)
    try {
      const dokumentId = await belegHochladen(datei)
      // Lesen darf scheitern (KI aus, Limit): dann füllt man von Hand aus.
      const werte = await rechnungLesen(datei).catch(() => null)
      setOffen({ datei, dokumentId, werte })
    } catch (f) {
      meldeFehler(f, 'rechnungen')
      void naechste(rest)
    } finally {
      setLiest(false)
    }
  }

  function dazu(dateien: FileList | null) {
    const neu = [...(dateien ?? [])].filter((d) => d.type === 'application/pdf' || d.type.startsWith('image/'))
    if (!neu.length) return
    if (liest || offen) setSchlange([...schlange, ...neu])
    else void naechste([...schlange, ...neu])
  }

  return (
    <>
      <label
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          dazu(e.dataTransfer.files)
        }}
        className="hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-5 text-center focus-within:ring-2"
      >
        <FileUp className="text-muted-foreground size-6" aria-hidden="true" />
        <span className="font-medium">
          {liest ? t(`${h}.liest`) : t(`${h}.ziehen`)}
          {schlange.length > 0 && (
            <span className="text-muted-foreground"> · {t(`${h}.warten`, { n: schlange.length })}</span>
          )}
        </span>
        <span className="text-muted-foreground max-w-xl text-sm">{t(`${h}.hinweis`)}</span>
        <input
          type="file"
          accept="application/pdf,.pdf,image/*"
          multiple
          className="sr-only"
          disabled={liest}
          onChange={(e) => {
            dazu(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {offen && (
        <UploadDialog
          key={offen.dokumentId}
          datei={offen.datei}
          dokumentId={offen.dokumentId}
          gelesen={offen.werte}
          onSchliessen={() => {
            setOffen(null)
            void naechste(schlange)
          }}
          onGespeichert={(id) => {
            setOffen(null)
            if (schlange.length) void naechste(schlange)
            else onGespeichert(id)
          }}
        />
      )}
    </>
  )
}
