import { FileText, Mail, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Angabe } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich, pdfZeigen, plusTage } from '../lib/rechnung'
import { ladeRechnung, mahnen } from '../services/rechnungen'
import { rechnungPdf } from '@/services/rechnungPdf'
import type { RechnungVoll } from '../types'

/**
 * Einzeln mahnen wie in V233 (sonst über den Mahnlauf): zuerst die Vorschau (Stufe, offener Betrag, neue
 * Mahnfrist, PDF). Ohne frühere Erinnerung ist der erste Schritt die Zahlungserinnerung. Per Mail öffnet sich die
 * Mail mit dem PDF; die Stufe zählt erst, wenn sie gesendet ist. Per Post wird die Stufe sofort gesetzt und das
 * PDF zum Drucken geöffnet. Nur die Freigabe-Person (Chris) und nur mit IBAN und MWST-Nr. der Firma.
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
  /** Per Mail: Stufe und die Rechnung, wie sie in der Mahnung erscheint (Frist, Datum). */
  onGemahnt: (stufe: number, vorschau: RechnungVoll) => void
}) {
  const { t, i18n } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [pdfLaeuft, setPdfLaeuft] = useState(false)
  const stufe = r.mahnstufe === 0 && !r.erinnert_am ? 0 : r.mahnstufe + 1
  const heute = heuteZuerich()
  const frist = plusTage(heute, mahnfristTage)
  const mitStufe: RechnungVoll = stufe ? { ...r, mahnstufe: stufe, gemahnt_am: heute, mahnfrist: frist } : r
  const stufeText = t(`rechnungen.mahnlauf.stufe.${String(stufe)}`)
  const fehlt = [!r.firma_daten.iban && 'IBAN', !r.firma_daten.mwst_nr && t('rechnungen.pdf.mwstNr')].filter(Boolean)

  async function vorschau() {
    setPdfLaeuft(true)
    try {
      pdfZeigen(await rechnungPdf(mitStufe, i18n.getFixedT(r.sprache), stufe))
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
        titel={`${stufeText} · ${r.nummer ?? ''}`}
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
              variant="secondary"
              laedt={laeuft}
              disabled={fehlt.length > 0}
              onClick={() =>
                void aus(async () => {
                  await mahnen(r.id)
                  const neu = await ladeRechnung(r.id)
                  pdfZeigen(await rechnungPdf(neu, i18n.getFixedT(r.sprache), stufe))
                  onSchliessen()
                })
              }
            >
              <Printer />
              {t('rechnungen.akte.versand.post')}
            </Button>
            <Button
              disabled={fehlt.length > 0}
              onClick={() => {
                onGemahnt(stufe, mitStufe)
              }}
            >
              <Mail />
              {t('rechnungen.akte.versand.mail')}
            </Button>
          </>
        }
      >
        <dl>
          <Angabe label={t('rechnungen.spalte.kunde')}>{r.kunde}</Angabe>
          <Angabe label={t('rechnungen.spalte.faellig')}>{r.faellig_am ? formatDatum(r.faellig_am) : '–'}</Angabe>
          <Angabe label={t('rechnungen.spalte.offen')}>{formatChf(r.offen_rappen, { mitWaehrung: true })}</Angabe>
          <Angabe label={t('rechnungen.mahnen.stufe')}>{stufeText}</Angabe>
          {stufe > 0 && <Angabe label={t('rechnungen.mahnen.frist')}>{formatDatum(frist)}</Angabe>}
        </dl>
      </DialogInhalt>
    </Dialog>
  )
}
