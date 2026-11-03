import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { inTagen } from '../lib/anzeige'
import { wartungErledigt } from '../services/vertraege'
import type { Vertrag } from '../types'

/** Wartung durchgeführt: Datum und kurze Notiz; die nächste Wartung rechnet die Datenbank (Datum + Rhythmus). */
export function ErledigtDialog({ vertrag: v, onSchliessen }: { vertrag: Vertrag; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [am, setAm] = useState(() => inTagen(new Date(), 0))
  const [notiz, setNotiz] = useState('')

  async function speichern() {
    // Objekt statt Variable: TypeScript sieht die Zuweisung im Rückruf sonst nicht.
    const ergebnis: { naechste: string | null } = { naechste: null }
    const ok = await aus(async () => {
      ergebnis.naechste = await wartungErledigt(v.id, am, notiz.trim())
    })
    if (!ok) return
    onSchliessen()
    const n = ergebnis.naechste
    melde(
      'ok',
      n
        ? {
            de: `Wartung eingetragen, nächste am ${formatDatum(n)}`,
            fr: `Entretien enregistré, prochain le ${formatDatum(n)}`,
          }
        : { de: 'Wartung eingetragen', fr: 'Entretien enregistré' },
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('wartung.erledigt.titel')}
        beschreibung={t('wartung.erledigt.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!am}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="we-am" label={t('wartung.erledigt.am')} pflicht>
            <Input
              id="we-am"
              type="date"
              value={am}
              onChange={(e) => {
                setAm(e.target.value)
              }}
            />
          </Feld>
          <Feld id="we-notiz" label={t('wartung.erledigt.notiz')}>
            <Textarea
              id="we-notiz"
              rows={3}
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
