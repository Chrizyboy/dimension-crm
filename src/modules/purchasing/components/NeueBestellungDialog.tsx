import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { useAktion } from '../hooks/useAktion'
import { useLagerorte, useLieferanten } from '../hooks/useEinkauf'
import { bestellungAnlegen } from '../services/bestellungen'

const BAUSTELLE = 'baustelle'

/**
 * Neue leere Bestellung: Lieferant und Lieferziel (Lager oder, für ein Projekt, direkt auf die Baustelle).
 * Die Positionen kommen danach in der Akte dazu.
 */
export function NeueBestellungDialog({
  projekt,
  onSchliessen,
  onAngelegt,
}: {
  projekt?: { id: string; nummer: string }
  onSchliessen: () => void
  onAngelegt: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const lieferanten = useLieferanten()
  const lagerorte = useLagerorte()
  const [lieferant, setLieferant] = useState('')
  const [ziel, setZiel] = useState('')
  const zielWert = ziel || lagerorte.data?.[0]?.id || (projekt ? BAUSTELLE : '')
  const ziele = [
    ...(lagerorte.data ?? []).map((l) => ({ wert: l.id, text: l.name })),
    ...(projekt ? [{ wert: BAUSTELLE, text: t('einkauf.baustelle') }] : []),
  ]

  async function anlegen() {
    let id = ''
    const ok = await aus(async () => {
      id = await bestellungAnlegen({
        lieferant_id: lieferant,
        projekt_id: projekt?.id ?? null,
        lagerort_id: zielWert === BAUSTELLE ? null : zielWert,
      })
    })
    if (ok) onAngelegt(id)
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={projekt ? t('einkauf.neuFuer', { nummer: projekt.nummer }) : t('einkauf.neu')}
        beschreibung={t('einkauf.neuText')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void anlegen()} laedt={laeuft} disabled={!lieferant || !zielWert}>
              {t('einkauf.anlegen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="nb-lieferant" label={t('einkauf.feld.lieferant')} pflicht>
            <Auswahl
              id="nb-lieferant"
              value={lieferant}
              onValueChange={setLieferant}
              platzhalter={t('einkauf.waehlen')}
              optionen={(lieferanten.data ?? []).filter((l) => l.aktiv).map((l) => ({ wert: l.id, text: l.name }))}
            />
          </Feld>
          <Feld id="nb-ziel" label={t('einkauf.feld.ziel')} pflicht>
            <Auswahl id="nb-ziel" value={zielWert} onValueChange={setZiel} optionen={ziele} />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
