import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Label } from '@/components/ui/feld'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatumZeit } from '@/lib/format'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { stelleWiederHer } from '../services/sicherung'
import type { Sicherung, Wiederherstellung } from '../types'

/**
 * «Wiederherstellen» mit klarer Warnung und Häkchen (zweite Sicherung gegen einen Fehlklick, wie V233 askConfirm).
 * Danach zeigt der Dialog, was in welcher Tabelle zurückgesetzt und was in den Papierkorb gelegt wurde.
 */
export function WiederherstellenDialog({
  sicherung,
  onSchliessen,
}: {
  sicherung: Sicherung
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const [verstanden, setVerstanden] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [ergebnis, setErgebnis] = useState<Wiederherstellung | null>(null)
  const zeit = formatDatumZeit(sicherung.begonnen_am)

  const los = async () => {
    setLaeuft(true)
    try {
      const r = await stelleWiederHer(sicherung.id)
      setErgebnis(r)
      melde('ok', { de: `Stand vom ${zeit} wiederhergestellt`, fr: `État du ${zeit} restauré` })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
    }
  }

  const zeilen = ergebnis ? Object.entries(ergebnis) : []

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen && !laeuft) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('sicherung.dialogTitel', { zeit })}
        beschreibung={ergebnis ? t('sicherung.fertigText') : t('sicherung.dialogText', { zeit })}
        fuss={
          ergebnis ? (
            <Button onClick={onSchliessen}>{t('allgemein.schliessen')}</Button>
          ) : (
            <>
              <Button variant="ghost" disabled={laeuft} onClick={onSchliessen}>
                {t('allgemein.abbrechen')}
              </Button>
              <Button variant="danger" disabled={!verstanden} laedt={laeuft} onClick={() => void los()}>
                {t('sicherung.wiederherstellen')}
              </Button>
            </>
          )
        }
      >
        {ergebnis ? (
          zeilen.length === 0 ? (
            <p className="text-sm">{t('sicherung.nichtsGeaendert')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th className="py-1 font-medium">{t('sicherung.tabelle')}</th>
                  <th className="py-1 text-right font-medium">{t('sicherung.zurueck')}</th>
                  <th className="py-1 text-right font-medium">{t('sicherung.papierkorb')}</th>
                </tr>
              </thead>
              <tbody className="zahlen">
                {zeilen.map(([tabelle, n]) => (
                  <tr key={tabelle} className="border-t">
                    <td className="py-1.5">{tabelle}</td>
                    <td className="py-1.5 text-right">{n.zurueck}</td>
                    <td className="py-1.5 text-right">{n.papierkorb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li>{t('sicherung.punktVorher')}</li>
              <li>{t('sicherung.punktZurueck', { zeit })}</li>
              <li>{t('sicherung.punktNeu')}</li>
              <li>{t('sicherung.punktBleibt')}</li>
            </ul>
            <div className="bg-bad-soft flex items-start gap-3 rounded-md px-3 py-3">
              <Checkbox
                id="sicherung-verstanden"
                checked={verstanden}
                onCheckedChange={(w) => {
                  setVerstanden(w === true)
                }}
                className="mt-0.5"
              />
              <Label htmlFor="sicherung-verstanden" className="leading-snug">
                {t('sicherung.verstanden', { zeit })}
              </Label>
            </div>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
