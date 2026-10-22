import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Unterschriftfeld } from '@/components/shared/Unterschriftfeld'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { melde } from '@/services/meldungen'
import { rapportAbschliessen } from '../services/monteur'
import type { Rapport, Verrechnung } from '../types'
import { VerrechnungWahl } from './VerrechnungWahl'

/**
 * Rapport abschliessen: Kunde unterschreibt auf dem Handy (bestätigt damit auch offene Nachträge) oder
 * der Grund, warum keine Unterschrift möglich war. Montage: «fertig» meldet das Projekt zur IBN.
 */
export function AbschlussDialog({ rapport: r, onSchliessen }: { rapport: Rapport; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [bild, setBild] = useState<Blob | null>(null)
  const [name, setName] = useState(r.kunde ?? '')
  const [ohne, setOhne] = useState(false)
  const [grund, setGrund] = useState('')
  const [fertig, setFertig] = useState(r.montage_fertig)
  const [erledigt, setErledigt] = useState(true)
  const [verrechnung, setVerrechnung] = useState<Verrechnung | null>(r.verrechnung)
  const [laeuft, setLaeuft] = useState(false)

  const fehlt = !r.arbeiten?.trim()
    ? t('baustelle.abschluss.arbeitenFehlen')
    : (r.art === 'service' || r.art === 'wartung') && !verrechnung
      ? t('baustelle.abschluss.verrechnungFehlt')
      : ohne
        ? !grund.trim() && t('baustelle.abschluss.grundFehlt')
        : (!bild || !name.trim()) && t('baustelle.abschluss.unterschriftFehlt')

  async function abschliessen() {
    setLaeuft(true)
    try {
      await rapportAbschliessen(r.id, {
        ...(ohne ? { ohne_unterschrift: grund.trim() } : bild ? { unterschrift: { bild, name: name.trim() } } : {}),
        verrechnung,
        ...(r.art === 'montage' ? { montage_fertig: fertig } : {}),
        ...(r.art === 'service' ? { fall_erledigt: erledigt } : {}),
      })
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      melde('ok', { de: 'Rapport abgeschlossen', fr: 'Rapport clôturé' })
      onSchliessen()
    } catch {
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('baustelle.abschluss.titel')}
        beschreibung={t(`baustelle.abschluss.text.${r.art}`)}
        fuss={
          <Button
            variant="accent"
            size="lg"
            laedt={laeuft}
            disabled={Boolean(fehlt)}
            onClick={() => void abschliessen()}
          >
            <CheckCircle2 />
            {t('baustelle.rapport.abschliessen')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {r.art === 'montage' && (
            <label className="flex items-center justify-between gap-3 text-sm">
              {t('baustelle.abschluss.montageFertig')}
              <Switch checked={fertig} onCheckedChange={setFertig} />
            </label>
          )}
          {r.art === 'service' && (
            <label className="flex items-center justify-between gap-3 text-sm">
              {t('baustelle.abschluss.fallErledigt')}
              <Switch checked={erledigt} onCheckedChange={setErledigt} />
            </label>
          )}
          {(r.art === 'service' || r.art === 'wartung') && (
            <VerrechnungWahl wert={verrechnung} onWahl={setVerrechnung} />
          )}
          {ohne ? (
            <Feld id="ab-grund" label={t('baustelle.abschluss.grund')} pflicht>
              <Input
                id="ab-grund"
                placeholder={t('baustelle.abschluss.grundPlatzhalter')}
                value={grund}
                onChange={(e) => {
                  setGrund(e.target.value)
                }}
              />
            </Feld>
          ) : (
            <>
              <Feld id="ab-name" label={t('baustelle.abschluss.name')} pflicht>
                <Input
                  id="ab-name"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                  }}
                />
              </Feld>
              <Unterschriftfeld beschriftung={t('baustelle.abschluss.unterschrift')} onBild={setBild} />
              <p className="text-muted-foreground text-xs">{t('baustelle.abschluss.bestaetigt')}</p>
            </>
          )}
          <Button
            variant="link"
            className="self-start"
            onClick={() => {
              setOhne(!ohne)
            }}
          >
            {t(ohne ? 'baustelle.abschluss.mitUnterschrift' : 'baustelle.abschluss.ohneUnterschrift')}
          </Button>
          {fehlt && <p className="text-warn text-sm">{fehlt}</p>}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
