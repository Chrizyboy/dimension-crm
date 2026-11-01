import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KundeWahl, type GewaehlterKunde } from '@/components/shared/KundeWahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { useAktion } from '../hooks/useAktion'
import { kundeVerknuepfen } from '../services/posteingang'
import type { Mail } from '../types'

/** Mail einem bestehenden Kunden zuordnen; danach sucht die Datenbank Projekt, Lead und Service-Fall dazu. */
export function KundeDialog({ mail, onSchliessen }: { mail: Mail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [kunde, setKunde] = useState<GewaehlterKunde | null>(null)
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('posteingang.akte.kundeZuordnen')}
        {...(mail.von_email ? { beschreibung: mail.von_email } : {})}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!kunde}
              onClick={() =>
                kunde &&
                void aus(() => kundeVerknuepfen(mail.id, kunde.id), { de: 'Zugeordnet', fr: 'Associé' }).then((ok) => {
                  if (ok) onSchliessen()
                })
              }
            >
              {t('posteingang.akte.zuordnen')}
            </Button>
          </>
        }
      >
        <Feld label={t('posteingang.feld.kunde')} id="pe-kunde">
          <KundeWahl id="pe-kunde" wert={kunde} onWahl={setKunde} />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
