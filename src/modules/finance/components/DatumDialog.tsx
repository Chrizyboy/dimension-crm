import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'

/** Kleiner Dialog für ein Datum: «Bezahlt am», «Einplanen für», «Verschieben auf». */
export function DatumDialog({
  titel,
  beschreibung,
  label,
  start,
  knopf,
  laeuft,
  leerErlaubt = false,
  onOk,
  onSchliessen,
}: {
  titel: string
  beschreibung?: string
  label: string
  start: string
  knopf: string
  laeuft: boolean
  leerErlaubt?: boolean
  onOk: (datum: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const [datum, setDatum] = useState(start)
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={titel}
        {...(beschreibung ? { beschreibung } : {})}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!datum && !leerErlaubt}
              onClick={() => {
                onOk(datum)
              }}
            >
              {knopf}
            </Button>
          </>
        }
      >
        <Feld id="fin-datum" label={label} pflicht={!leerErlaubt}>
          <Input
            id="fin-datum"
            type="date"
            value={datum}
            onChange={(e) => {
              setDatum(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}
