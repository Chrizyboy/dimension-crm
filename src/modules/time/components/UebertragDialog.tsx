import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { zeitkontoSetzen } from '../services/zeit'
import type { ZeitPerson } from '../types'

/**
 * Übertrag ins Jahr (Zeit-Leitung): Restferien und Überstunden-Saldo vom Vorjahr bzw. aus der Zeit vor dem CRM.
 * Der Saldo wird in Stunden eingegeben und in Minuten gespeichert.
 */
export function UebertragDialog({
  person,
  jahr,
  onSchliessen,
}: {
  person: ZeitPerson
  jahr: number
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [ferien, setFerien] = useState(String(person.konto.ferien.uebertrag))
  const [saldo, setSaldo] = useState(String(person.konto.saldo_uebertrag_h))
  const zahl = (s: string) => Number(s.replace(',', '.'))
  const gueltig = Number.isFinite(zahl(ferien)) && Number.isFinite(zahl(saldo))

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('zeit.uebertrag.titel')}
        beschreibung={t('zeit.uebertrag.text', { name: person.name, jahr })}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!gueltig}
              onClick={() =>
                void aus(() => zeitkontoSetzen(person.id, jahr, zahl(ferien), Math.round(zahl(saldo) * 60)), {
                  de: 'Übertrag gespeichert',
                  fr: 'Report enregistré',
                }).then((ok) => {
                  if (ok) onSchliessen()
                })
              }
            >
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="ue-ferien" label={t('zeit.uebertrag.ferien')}>
            <Input
              id="ue-ferien"
              inputMode="decimal"
              value={ferien}
              onChange={(e) => {
                setFerien(e.target.value)
              }}
            />
          </Feld>
          <Feld id="ue-saldo" label={t('zeit.uebertrag.saldo')}>
            <Input
              id="ue-saldo"
              inputMode="decimal"
              value={saldo}
              onChange={(e) => {
                setSaldo(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
