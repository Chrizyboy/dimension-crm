import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { absender } from '../lib/anzeige'
import { zahlungErfassen } from '../services/arbeit'
import type { Mail } from '../types'

/**
 * Lieferantenrechnung als Zahlung erfassen (Finanzen › Zahlungen). Die KI hat Firma, Nummer, Betrag und Fälligkeit
 * gelesen; hier prüft man und übernimmt erst mit dem Knopf. Die Mail ist danach erledigt, das PDF unter «Anhänge»
 * bei der Zahlung ablegen.
 */
export function ZahlungDialog({ mail, onSchliessen }: { mail: Mail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const w = mail.ki_werte
  const { laeuft, aus } = useAktion()
  const [firma, setFirma] = useState(w.firma ?? mail.von_name ?? absender(mail))
  const [nummer, setNummer] = useState(w.rechnungsnummer ?? '')
  const [datum, setDatum] = useState(w.rechnungsdatum ?? '')
  const [betrag, setBetrag] = useState(w.betrag_rappen ? formatChf(w.betrag_rappen) : '')
  const [faellig, setFaellig] = useState(w.faellig ?? '')
  const rappen = parseChf(betrag)
  const fehlerBetrag = betrag && (rappen === null || rappen <= 0) ? t('posteingang.zahlung.betragFalsch') : undefined
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('posteingang.zahlung.titel')}
        beschreibung={t('posteingang.zahlung.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!firma.trim() || !rappen || rappen <= 0}
              onClick={() =>
                void aus(
                  () =>
                    zahlungErfassen(mail.id, {
                      firma,
                      rechnung_nr: nummer,
                      rechnung_am: datum,
                      betrag_rappen: rappen ?? 0,
                      faellig_am: faellig,
                      text: mail.betreff ?? '',
                    }),
                  { de: 'Zahlung erfasst', fr: 'Paiement saisi' },
                ).then((ok) => {
                  if (ok) onSchliessen()
                })
              }
            >
              {t('posteingang.zahlung.knopf')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld label={t('posteingang.zahlung.firma')} id="pe-z-firma" pflicht className="sm:col-span-2">
            <Input
              id="pe-z-firma"
              value={firma}
              onChange={(e) => {
                setFirma(e.target.value)
              }}
            />
          </Feld>
          <Feld label={t('posteingang.zahlung.nummer')} id="pe-z-nr">
            <Input
              id="pe-z-nr"
              value={nummer}
              onChange={(e) => {
                setNummer(e.target.value)
              }}
            />
          </Feld>
          <Feld label={t('posteingang.zahlung.datum')} id="pe-z-datum">
            <Input
              id="pe-z-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld
            label={t('posteingang.zahlung.betrag')}
            id="pe-z-betrag"
            pflicht
            hinweis="CHF 4'812.35"
            fehler={fehlerBetrag}
          >
            <Input
              id="pe-z-betrag"
              inputMode="decimal"
              value={betrag}
              onChange={(e) => {
                setBetrag(e.target.value)
              }}
            />
          </Feld>
          <Feld label={t('posteingang.zahlung.faellig')} id="pe-z-faellig">
            <Input
              id="pe-z-faellig"
              type="date"
              value={faellig}
              onChange={(e) => {
                setFaellig(e.target.value)
              }}
            />
          </Feld>
        </div>
        {mail.sortiert === 'ki' && Object.keys(w).length > 0 && (
          <p className="text-muted-foreground mt-3 text-xs">{t('posteingang.zahlung.gelesen')}</p>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
