import { FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Angabe } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich, pdfZeigen, plusTage } from '../lib/rechnung'
import { mahnen } from '../services/rechnungen'
import { rechnungPdf } from '../services/rechnungPdf'
import type { RechnungVoll } from '../types'

/**
 * Mahnen wie in V233: zuerst die Vorschau (Stufe, offener Betrag, neue Mahnfrist, PDF), dann erst setzen.
 * Die Fälligkeit bleibt; die Mahnfrist ist eigen (Einstellung, 10 Tage). Nur mit IBAN und MWST-Nr. der Firma.
 * Danach kann die Mahnung per Mail über den Ausgangskorb gehen.
 */
export function MahnenDialog({
  rechnung: r,
  mahnfristTage,
  onSchliessen,
  onGemahnt,
}: {
  rechnung: RechnungVoll
  mahnfristTage: number
  onSchliessen: () => void
  onGemahnt: (stufe: number) => void
}) {
  const { t, i18n } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [pdfLaeuft, setPdfLaeuft] = useState(false)
  const stufe = r.mahnstufe + 1
  const heute = heuteZuerich()
  const frist = plusTage(heute, mahnfristTage)
  const fehlt = [!r.firma_daten.iban && 'IBAN', !r.firma_daten.mwst_nr && t('rechnungen.pdf.mwstNr')].filter(Boolean)

  async function vorschau() {
    setPdfLaeuft(true)
    try {
      pdfZeigen(
        await rechnungPdf(
          { ...r, mahnstufe: stufe, gemahnt_am: heute, mahnfrist: frist },
          i18n.getFixedT(r.sprache),
          stufe,
        ),
      )
    } catch (f) {
      meldeFehler(f, 'rechnungen')
    } finally {
      setPdfLaeuft(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('rechnungen.mahnen.titel', { stufe, nummer: r.nummer })}
        beschreibung={
          fehlt.length ? t('rechnungen.mahnen.fehlt', { was: fehlt.join(', ') }) : t('rechnungen.mahnen.text')
        }
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="secondary" laedt={pdfLaeuft} onClick={() => void vorschau()}>
              <FileText />
              {t('rechnungen.mahnen.vorschau')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={fehlt.length > 0}
              onClick={() =>
                void aus(async () => {
                  onGemahnt(await mahnen(r.id))
                })
              }
            >
              {t('rechnungen.mahnen.setzen', { stufe })}
            </Button>
          </>
        }
      >
        <dl>
          <Angabe label={t('rechnungen.spalte.kunde')}>{r.kunde}</Angabe>
          <Angabe label={t('rechnungen.spalte.faellig')}>{r.faellig_am ? formatDatum(r.faellig_am) : '–'}</Angabe>
          <Angabe label={t('rechnungen.spalte.offen')}>{formatChf(r.offen_rappen, { mitWaehrung: true })}</Angabe>
          <Angabe label={t('rechnungen.mahnen.stufe')}>{t('rechnungen.mahnstufeKurz', { stufe })}</Angabe>
          <Angabe label={t('rechnungen.mahnen.frist')}>{formatDatum(frist)}</Angabe>
        </dl>
      </DialogInhalt>
    </Dialog>
  )
}
