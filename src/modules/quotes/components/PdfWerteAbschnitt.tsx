import { FileUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useOffertAenderung } from '../hooks/useOfferten'
import { leseEturnityOfferte } from '../lib/eturnity'
import { auswahlFuerSpeichern, vergleiche } from '../lib/pdfUebernahme'
import { pdfZeilen } from '../lib/pdfText'
import { legePdfAb, setzeWerte } from '../services/offerten'
import type { Offerte, PdfWerte } from '../types'
import { FeldWert } from './FeldWert'

/**
 * «PDF-Werte übernehmen» (V91, V183): das Eturnity-PDF hineinziehen oder wählen, die gelesenen Werte
 * neben die gespeicherten stellen und erst auf Knopfdruck speichern, wahlweise nur leere Felder.
 */
export function PdfWerteAbschnitt({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const [datei, setDatei] = useState<File | null>(null)
  const [werte, setWerte] = useState<PdfWerte | null>(null)
  const [liest, setLiest] = useState(false)
  const [ablegen, setAblegen] = useState(true)
  const speichern = useOffertAenderung(async (nurLeere: boolean) => {
    if (!werte) return
    const felder = auswahlFuerSpeichern(vergleiche(o, werte), nurLeere)
    await setzeWerte(o.id, { ...felder, wirtschaftlichkeit: werte.wirtschaftlichkeit }, 'eturnity-pdf', nurLeere)
    if (ablegen && datei) await legePdfAb(o, datei)
  })

  async function lies(f: File | undefined) {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      melde('warnung', { de: 'Bitte ein PDF wählen', fr: 'Merci de choisir un PDF' })
      return
    }
    setLiest(true)
    try {
      setDatei(f)
      setWerte(leseEturnityOfferte(await pdfZeilen(f)))
    } catch (fehler) {
      meldeFehler(fehler, 'offerten.pdf')
      melde('kritisch', { de: 'PDF konnte nicht gelesen werden', fr: 'Impossible de lire le PDF' })
    } finally {
      setLiest(false)
    }
  }

  async function uebernimm(nurLeere: boolean) {
    try {
      await speichern.mutateAsync(nurLeere)
      melde('ok', { de: 'Werte übernommen', fr: 'Valeurs reprises' })
      setWerte(null)
      setDatei(null)
    } catch (f) {
      meldeFehler(f, 'offerten.pdf')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const vergleich = werte ? vergleiche(o, werte) : []
  const fremdeNummer = werte?.nummer && werte.nummer !== o.nummer

  return (
    <AkteAbschnitt titel={t('offerten.pdf.titel')} offen={false}>
      <label
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          void lies(e.dataTransfer.files[0])
        }}
        className="hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 text-sm focus-within:ring-2"
      >
        <FileUp className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
        <span className="text-muted-foreground">
          {liest ? t('offerten.pdf.liest') : (datei?.name ?? t('offerten.pdf.waehlen'))}
        </span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => void lies(e.target.files?.[0])}
        />
      </label>
      {werte && (
        <div className="flex flex-col gap-3 pt-3">
          {fremdeNummer && (
            <p role="alert" className="bg-warn-soft text-warn rounded-md p-2 text-sm">
              {t('offerten.pdf.andereNummer', { nummer: werte.nummer })}
            </p>
          )}
          {vergleich.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('offerten.pdf.nichtsGefunden')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th className="py-1 font-medium">{t('offerten.pdf.feld')}</th>
                  <th className="py-1 font-medium">{t('offerten.pdf.bisher')}</th>
                  <th className="py-1 font-medium">{t('offerten.pdf.imPdf')}</th>
                </tr>
              </thead>
              <tbody>
                {vergleich.map((v) => (
                  <tr key={v.feld} className="border-t">
                    <td className="py-1 pr-2">{t(`offerten.feld.${v.feld}`)}</td>
                    <td className="text-muted-foreground py-1 pr-2">
                      <FeldWert feld={v.feld} wert={v.alt} />
                    </td>
                    <td className={v.gleich ? 'text-muted-foreground py-1' : 'py-1 font-medium'}>
                      <FeldWert feld={v.feld} wert={v.neu} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={ablegen}
              onCheckedChange={(an) => {
                setAblegen(an === true)
              }}
            />
            {t('offerten.pdf.ablegen')}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" laedt={speichern.isPending} onClick={() => void uebernimm(true)}>
              {t('offerten.pdf.nurLeere')}
            </Button>
            <Button size="sm" variant="secondary" laedt={speichern.isPending} onClick={() => void uebernimm(false)}>
              {t('offerten.pdf.alle')}
            </Button>
          </div>
        </div>
      )}
    </AkteAbschnitt>
  )
}
