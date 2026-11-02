import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KundeWahl, type GewaehlterKunde } from '@/components/shared/KundeWahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { kundeVerknuepfen, nummerZuordnen } from '../services/posteingang'
import type { Mail } from '../types'

/**
 * Mail zuordnen: einem Kunden (danach sucht die Datenbank Projekt, Lead und Service-Fall dazu) oder über eine Nummer
 * (Offerte, Projekt, Rechnung, Bestellung, Lead, Service-Fall), z. B. «B-2026-121».
 */
export function KundeDialog({ mail, onSchliessen }: { mail: Mail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [kunde, setKunde] = useState<GewaehlterKunde | null>(null)
  const [nummer, setNummer] = useState('')
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('posteingang.akte.zuordnen')}
        {...(mail.von_email ? { beschreibung: mail.von_email } : {})}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!kunde && nummer.trim().length < 3}
              onClick={() =>
                void aus(
                  async () => {
                    if (kunde) await kundeVerknuepfen(mail.id, kunde.id)
                    if (nummer.trim()) await nummerZuordnen(mail.id, nummer.trim())
                  },
                  { de: 'Zugeordnet', fr: 'Associé' },
                ).then((ok) => {
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
        <Feld
          label={t('posteingang.akte.nummer')}
          id="pe-nummer"
          hinweis={t('posteingang.akte.nummerHinweis')}
          className="mt-3"
        >
          <Input
            id="pe-nummer"
            value={nummer}
            maxLength={40}
            onChange={(e) => {
              setNummer(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
