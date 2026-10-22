import { FileSpreadsheet, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { usePreisAenderung } from '../hooks/usePreise'
import { leseVkBerechnung } from '../lib/vkExcel'
import { importiere } from '../services/preise'
import type { ImportZeile } from '../types'

type Zaehlung = Awaited<ReturnType<typeof importiere>>

/**
 * Excel «VK Berechnung …» übernehmen (V89, V226): Datei wählen, die Datenbank zählt zuerst
 * («N gelesen: X Preise ändern sich, Y Artikel sind neu»), gespeichert wird erst mit «Übernehmen».
 * Gleiche Artikelnummer ändert den Artikel, sonst entsteht ein neuer.
 */
export default function ExcelImportDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const { t } = useTranslation()
  const [zeilen, setZeilen] = useState<ImportZeile[] | null>(null)
  const [zaehlung, setZaehlung] = useState<Zaehlung | null>(null)
  const [datei, setDatei] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [liest, setLiest] = useState(false)
  const uebernehmen = usePreisAenderung((z: ImportZeile[]) => importiere(z, false))

  async function lies(f: File | undefined) {
    if (!f) return
    setFehler(null)
    setZaehlung(null)
    setLiest(true)
    try {
      const { default: leseExcel } = await import('read-excel-file/browser')
      const blaetter = await leseExcel(f)
      const z = leseVkBerechnung(blaetter as unknown as Parameters<typeof leseVkBerechnung>[0])
      setDatei(f.name)
      if (z.length === 0) {
        setFehler(t('preise.import.keineBlaetter'))
        return
      }
      setZeilen(z)
      setZaehlung(await importiere(z, true))
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (!s) meldeFehler(e, 'preise.import')
      setFehler(t(s ?? 'preise.import.unlesbar'))
    } finally {
      setLiest(false)
    }
  }

  async function absenden() {
    if (!zeilen) return
    try {
      const r = await uebernehmen.mutateAsync(zeilen)
      melde('ok', zweisprachig('preise.import.fertig', { geaendert: r.geaendert, neu: r.neu }))
      onSchliessen()
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (!s) meldeFehler(e, 'preise.import')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  const nichts = zaehlung !== null && zaehlung.geaendert + zaehlung.neu === 0
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('preise.import.titel')}
        beschreibung={t('preise.import.beschreibung')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button disabled={!zaehlung || nichts} laedt={uebernehmen.isPending} onClick={() => void absenden()}>
              <Upload />
              {t('preise.import.uebernehmen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center focus-within:ring-2">
            <FileSpreadsheet className="text-muted-foreground size-6" aria-hidden="true" />
            <span className="text-sm font-medium">
              {liest ? t('preise.import.liest') : (datei ?? t('preise.import.waehlen'))}
            </span>
            <input
              type="file"
              accept=".xlsx,.xlsm"
              className="sr-only"
              onChange={(e) => void lies(e.target.files?.[0])}
            />
          </label>
          {zaehlung && (
            <p role="status" className="bg-muted rounded-md p-3 text-sm">
              {nichts
                ? t('preise.import.aktuell', { gelesen: zaehlung.gelesen })
                : t('preise.import.zaehlung', {
                    gelesen: zaehlung.gelesen,
                    geaendert: zaehlung.geaendert,
                    neu: zaehlung.neu,
                    gleich: zaehlung.gleich,
                  })}
            </p>
          )}
          {fehler && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
