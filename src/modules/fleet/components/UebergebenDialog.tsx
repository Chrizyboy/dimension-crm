import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useFahrzeuge, useWahl } from '../hooks/useRessourcen'
import { uebergeben } from '../services/ressourcen'

const LAGER = 'lager'

/**
 * Übergeben: Fahrzeug an eine Person, Gerät an eine Person, in ein Fahrzeug oder zurück ins Lager. «An mich»
 * steht zuoberst, weil man am Handy meist selbst etwas mitnimmt. Die Übergabe steht danach im Verlauf.
 */
export function UebergebenDialog({
  bezug,
  onSchliessen,
}: {
  bezug: { fahrzeug?: string; geraet?: string }
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const personen = useWahl().data?.personen ?? []
  const fahrzeuge = (useFahrzeuge().data ?? []).filter((f) => !f.ausser_betrieb)
  const { laeuft, aus } = useAktion()
  const [ziel, setZiel] = useState(ich ? `p:${ich.id}` : '')
  const [text, setText] = useState('')

  const optionen = [
    ...(ich ? [{ wert: `p:${ich.id}`, text: t('fuhrpark.uebergeben.anMich') }] : []),
    ...personen.filter((p) => p.id !== ich?.id).map((p) => ({ wert: `p:${p.id}`, text: p.name })),
    ...(bezug.geraet
      ? fahrzeuge.map((f) => ({
          wert: `f:${f.id}`,
          text: t('fuhrpark.uebergeben.inFahrzeug', { name: f.bezeichnung }),
        }))
      : []),
    { wert: LAGER, text: t(bezug.geraet ? 'fuhrpark.lager' : 'fuhrpark.uebergeben.niemand') },
  ]

  async function speichern() {
    const person = ziel.startsWith('p:') ? ziel.slice(2) : null
    const fahrzeug = ziel.startsWith('f:') ? ziel.slice(2) : null
    const ok = await aus(() => uebergeben(bezug, person, fahrzeug, text), {
      de: 'Übergeben',
      fr: 'Remis',
    })
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('fuhrpark.uebergeben.titel')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!ziel}>
              {t('fuhrpark.uebergeben.knopf')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Feld id="ue-ziel" label={t('fuhrpark.uebergeben.an')} pflicht>
            <Auswahl id="ue-ziel" value={ziel} onValueChange={setZiel} optionen={optionen} />
          </Feld>
          <Feld id="ue-text" label={t('fuhrpark.eintrag.bemerkung')}>
            <Input
              id="ue-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
