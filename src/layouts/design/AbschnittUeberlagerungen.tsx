import { Bell, Info, PanelRight, SquareStack } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogAusloeser, DialogInhalt, DialogSchliessen } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Tooltip } from '@/components/ui/tooltip'
import { melde } from '@/services/meldungen'
import { Abschnitt, Beispiel } from './Abschnitt'

/** Dialoge, Seitenblatt, Tooltip und Rückmeldungen. */
export function AbschnittUeberlagerungen() {
  const { t } = useTranslation()

  return (
    <Abschnitt id="ueberlagerungen" titel={t('design.ueberlagerungen')} text={t('design.ueberlagerungenText')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Beispiel titel={t('design.dialoge')}>
          <Dialog>
            <DialogAusloeser asChild>
              <Button variant="secondary">
                <SquareStack />
                {t('design.dialogOeffnen')}
              </Button>
            </DialogAusloeser>
            <DialogInhalt
              titel={t('design.dialogTitel')}
              beschreibung={t('design.dialogText')}
              fuss={
                <>
                  <DialogSchliessen asChild>
                    <Button variant="secondary">{t('allgemein.abbrechen')}</Button>
                  </DialogSchliessen>
                  <DialogSchliessen asChild>
                    <Button
                      onClick={() => {
                        melde('ok', { de: 'Lead erfasst', fr: 'Lead enregistré' })
                      }}
                    >
                      {t('allgemein.speichern')}
                    </Button>
                  </DialogSchliessen>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <Feld id="dlg-name" label={t('design.feldName')} pflicht>
                  <Input id="dlg-name" placeholder="Familie Muster" />
                </Feld>
                <Feld id="dlg-ort" label={t('design.feldOrt')}>
                  <Input id="dlg-ort" placeholder="5630 Muri AG" />
                </Feld>
              </div>
            </DialogInhalt>
          </Dialog>
          <Dialog>
            <DialogAusloeser asChild>
              <Button variant="secondary">
                <PanelRight />
                {t('design.seitenblattOeffnen')}
              </Button>
            </DialogAusloeser>
            <DialogInhalt art="seite" titel="Familie Gerber" beschreibung="OF-2026-0412 · 9.8 kWp">
              <p className="text-muted-foreground text-sm">{t('design.seitenblattText')}</p>
            </DialogInhalt>
          </Dialog>
          <Tooltip text={t('design.tooltipText')}>
            <Button variant="ghost" size="icon" aria-label={t('design.tooltip')}>
              <Info />
            </Button>
          </Tooltip>
        </Beispiel>

        <Beispiel titel={t('design.rueckmeldungen')}>
          <Button
            variant="secondary"
            onClick={() => {
              melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
            }}
          >
            {t('design.meldungOk')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              melde('warnung', { de: 'Offerte läuft in 3 Tagen ab', fr: 'L’offre expire dans 3 jours' })
            }}
          >
            {t('design.meldungWarnung')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              melde(
                'kritisch',
                { de: 'AbaNinja nicht erreichbar', fr: 'AbaNinja injoignable' },
                { text: { de: 'Wir versuchen es in 5 Minuten erneut.', fr: 'Nouvel essai dans 5 minutes.' } },
              )
            }}
          >
            {t('design.meldungFehler')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              melde(
                'info',
                { de: 'Neue Anfrage von der Website', fr: 'Nouvelle demande du site web' },
                {
                  text: { de: 'Familie Gerber, Muri AG', fr: 'Famille Gerber, Muri AG' },
                  ziel: '/sales',
                  bleibend: true,
                },
              )
            }}
          >
            <Bell />
            {t('design.meldungGlocke')}
          </Button>
        </Beispiel>
      </div>
    </Abschnitt>
  )
}
