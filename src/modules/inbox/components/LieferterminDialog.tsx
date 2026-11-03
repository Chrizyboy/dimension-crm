import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { useOffeneBestellungen } from '../hooks/useArbeit'
import { useAktion } from '../hooks/useAktion'
import { lieferterminUebernehmen } from '../services/arbeit'
import type { Mail } from '../types'

/**
 * Auftragsbestätigung: Liefertermin in die Bestellung übernehmen. Bestellung aus der Nummer in der Mail vorgewählt,
 * sonst aus den offenen Bestellungen wählen; Datum von der KI gelesen, hier prüfen.
 */
export function LieferterminDialog({ mail, onSchliessen }: { mail: Mail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const bestellungen = useOffeneBestellungen(true).data ?? []
  const { laeuft, aus } = useAktion()
  const [bestellung, setBestellung] = useState(mail.bestellung?.id ?? '')
  const [datum, setDatum] = useState(mail.ki_werte.liefertermin ?? '')
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('posteingang.liefertermin.titel')}
        beschreibung={t('posteingang.liefertermin.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!bestellung || !datum}
              onClick={() =>
                void aus(() => lieferterminUebernehmen(mail.id, bestellung, datum), {
                  de: 'Liefertermin übernommen',
                  fr: 'Date de livraison reprise',
                }).then((ok) => {
                  if (ok) onSchliessen()
                })
              }
            >
              {t('posteingang.liefertermin.knopf')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld label={t('posteingang.feld.bestellung')} id="pe-l-best" pflicht>
            <Auswahl
              id="pe-l-best"
              value={bestellung}
              onValueChange={setBestellung}
              platzhalter={t('posteingang.liefertermin.waehlen')}
              optionen={bestellungen.map((b) => ({
                wert: b.id,
                text: [b.nummer, b.lieferant, b.liefertermin ? formatDatum(b.liefertermin) : null]
                  .filter(Boolean)
                  .join(' · '),
              }))}
            />
          </Feld>
          <Feld label={t('posteingang.liefertermin.datum')} id="pe-l-datum" pflicht>
            <Input
              id="pe-l-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
