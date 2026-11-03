import { useQuery } from '@tanstack/react-query'
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
import { heuteZuerich } from '../lib/fristen'
import { ausweisFehlt, gueltigeAusweise } from '../services/ausweise'
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
  const alleFahrzeuge = useFahrzeuge().data ?? []
  const fahrzeuge = alleFahrzeuge.filter((f) => !f.ausser_betrieb)
  const dieses = bezug.fahrzeug ? alleFahrzeuge.find((f) => f.id === bezug.fahrzeug) : undefined
  const { laeuft, aus } = useAktion()
  const [ziel, setZiel] = useState(ich ? `p:${ich.id}` : '')
  const [text, setText] = useState('')
  const [bis, setBis] = useState('')
  const person = ziel.startsWith('p:') ? ziel.slice(2) : null
  const heute = heuteZuerich()
  // Warnung, wenn das Fahrzeug einen Führerausweis braucht, den die Person (laut «Team & Ausweise») nicht hat.
  const ausweise = useQuery({
    queryKey: ['fuhrpark', 'ausweise', person],
    enabled: Boolean(person && dieses?.ausweis),
    queryFn: () => gueltigeAusweise(person ?? '', heute),
  })
  const fehlt = Boolean(dieses?.ausweis && ausweise.data && ausweisFehlt(dieses.ausweis, ausweise.data))

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
    const fahrzeug = ziel.startsWith('f:') ? ziel.slice(2) : null
    const ok = await aus(() => uebergeben(bezug, person, fahrzeug, text, bezug.geraet && person ? bis || null : null), {
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
          {fehlt && (
            <p className="bg-warn-soft text-warn rounded-md px-3 py-2 text-sm" role="alert">
              {t('fuhrpark.uebergeben.ausweisFehlt')}
            </p>
          )}
          {bezug.geraet && person && (
            <Feld id="ue-bis" label={t('fuhrpark.feld.zurueck_bis')} hinweis={t('fuhrpark.uebergeben.bisHinweis')}>
              <Input
                id="ue-bis"
                type="date"
                min={heute}
                value={bis}
                onChange={(e) => {
                  setBis(e.target.value)
                }}
              />
            </Feld>
          )}
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
