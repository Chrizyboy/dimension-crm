import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useVertragAenderung } from '../hooks/useWerkvertraege'
import { setzeVertragStatus } from '../services/werkvertraege'
import type { Werkvertrag } from '../types'

function heute(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * «Unterschrieben» braucht das Datum der Unterschrift (nicht in der Zukunft, setzt es auch im Projekt);
 * «Stornieren» braucht einen Grund, der in der Notiz und im Verlauf bleibt.
 */
export default function StatusDialog({
  vertrag: w,
  ziel,
  onSchliessen,
}: {
  vertrag: Werkvertrag
  ziel: 'unterschrieben' | 'storniert'
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const [datum, setDatum] = useState(heute())
  const [grund, setGrund] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useVertragAenderung(() =>
    setzeVertragStatus(w.id, ziel, ziel === 'unterschrieben' ? { datum } : { grund }),
  )

  async function absenden() {
    setFehler(null)
    if (ziel === 'storniert' && !grund.trim()) {
      setFehler(t('fachfehler.stand_grund_fehlt'))
      return
    }
    try {
      await speichern.mutateAsync(undefined)
      melde('ok', zweisprachig(`werkvertraege.status.${ziel}`))
      onSchliessen()
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'werkvertraege.status')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(ziel === 'unterschrieben' ? 'werkvertraege.akte.unterschrieben' : 'werkvertraege.akte.stornieren')}
        beschreibung={`${w.nummer} · ${w.name}`}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              variant={ziel === 'storniert' ? 'danger' : 'primary'}
              laedt={speichern.isPending}
              onClick={() => void absenden()}
            >
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void absenden()
          }}
        >
          {ziel === 'unterschrieben' ? (
            <Feld id="vertrag-datum" label={t('werkvertraege.status.datum')} pflicht fehler={fehler ?? undefined}>
              <Input
                id="vertrag-datum"
                type="date"
                max={heute()}
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
          ) : (
            <Feld id="vertrag-grund" label={t('werkvertraege.status.grund')} pflicht fehler={fehler ?? undefined}>
              <Textarea
                id="vertrag-grund"
                rows={3}
                value={grund}
                onChange={(e) => {
                  setGrund(e.target.value)
                }}
              />
            </Feld>
          )}
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
