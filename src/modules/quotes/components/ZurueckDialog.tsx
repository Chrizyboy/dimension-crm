import { Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useOffertAenderung } from '../hooks/useOfferten'
import { zurueckZurOfferte } from '../services/offerten'
import type { Offerte } from '../types'

/**
 * «Zurück zur Offerte» (V221): «Offerte überarbeiten» oder «Warten auf Angaben vom Kunden», mit Begründung.
 * Die Offerte geht zurück in «Neue Offerten», das bisherige Angebotsdatum bleibt gespeichert.
 */
export default function ZurueckDialog({ o, onSchliessen }: { o: Offerte; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const [ziel, setZiel] = useState<'bearbeitung' | 'rueckfrage'>('bearbeitung')
  const [grund, setGrund] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useOffertAenderung(() => zurueckZurOfferte(o.id, ziel, grund))

  async function absenden() {
    setFehler(null)
    try {
      await speichern.mutateAsync(undefined)
      melde('ok', zweisprachig('offerten.zurueck.ok'))
      onSchliessen()
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.zurueck')
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
        titel={t('offerten.zurueck.titel')}
        beschreibung={`${o.nummer} · ${o.name}`}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Undo2 />
              {t('offerten.zurueck.knopf')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Filterchips
            einzeln
            beschriftung={t('offerten.zurueck.was')}
            gewaehlt={[ziel]}
            onChange={(w) => {
              setZiel(w[0] === 'rueckfrage' ? 'rueckfrage' : 'bearbeitung')
            }}
            optionen={[
              { wert: 'bearbeitung', text: t('offerten.zurueck.ueberarbeiten') },
              { wert: 'rueckfrage', text: t('offerten.zurueck.warten') },
            ]}
          />
          <Feld id="zurueck-grund" label={t('offerten.zurueck.grund')} pflicht fehler={fehler ?? undefined}>
            <Textarea
              id="zurueck-grund"
              rows={3}
              value={grund}
              onChange={(e) => {
                setGrund(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
