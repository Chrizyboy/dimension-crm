import { FileText, Upload } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { meldeFehler } from '@/services/fehler'
import { useAktion } from '../hooks/useAktion'
import { useDateien } from '../hooks/useRessourcen'
import { dateiHochladen, dateiLink, type Ordner } from '../services/dateien'
import { Box } from './Box'

/**
 * Dokumente eines Fahrzeugs oder Geräts (Fahrzeugausweis, Police, Leasingvertrag, Prüfprotokoll) oder Fotos
 * eines Schadens. Öffnen über einen kurzlebigen Link, weil der Speicher privat ist.
 */
export function DateienBox({ ordner, id, titel }: { ordner: Ordner; id: string; titel?: string }) {
  const { t } = useTranslation()
  const dateien = useDateien(ordner, id)
  const { laeuft, aus } = useAktion()
  const eingabe = useRef<HTMLInputElement>(null)
  async function oeffnen(pfad: string) {
    try {
      window.open(await dateiLink(pfad), '_blank', 'noopener')
    } catch (e) {
      meldeFehler(e, 'fuhrpark')
    }
  }
  return (
    <Box
      titel={titel ?? t('fuhrpark.akte.dokumente')}
      rechts={
        <>
          <input
            ref={eingabe}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            aria-label={t('fuhrpark.dateien.hochladen')}
            onChange={(e) => {
              const liste = [...(e.target.files ?? [])]
              e.target.value = ''
              if (liste.length > 0)
                void aus(
                  async () => {
                    for (const d of liste) await dateiHochladen(ordner, id, d)
                  },
                  { de: 'Hochgeladen', fr: 'Téléversé' },
                )
            }}
          />
          <Button variant="ghost" size="sm" laedt={laeuft} onClick={() => eingabe.current?.click()}>
            <Upload />
            {t('fuhrpark.dateien.hochladen')}
          </Button>
        </>
      }
    >
      {(dateien.data ?? []).length === 0 ? (
        <p className="text-muted-foreground">{t('fuhrpark.dateien.leer')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {(dateien.data ?? []).map((d) => (
            <li key={d.pfad}>
              <button
                type="button"
                className="bg-background hover:bg-muted flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                onClick={() => void oeffnen(d.pfad)}
              >
                <FileText className="size-3.5" aria-hidden />
                {d.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Box>
  )
}
