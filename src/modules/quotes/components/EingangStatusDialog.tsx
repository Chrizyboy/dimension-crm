import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useOffertAenderung } from '../hooks/useOfferten'
import { heuteIso } from '../lib/nachfassen'
import { setzeEingangStatus } from '../services/offerten'
import type { Eingang } from '../types'

/**
 * Fragt ab, was der neue Status braucht (V72, V170): «Rückfrage» die Notiz «Was fehlt noch?» (Pflicht),
 * «Zur Prüfung» den Hinweis für den Aussendienst, «Versendet» das Datum (die Offerte geht ab hier
 * ins Nachfassen). Versendet wird die Offerte selbst weiterhin aus Eturnity bzw. Outlook.
 */
export default function EingangStatusDialog({
  eintrag,
  status,
  uebernehmen,
  onSchliessen,
}: {
  eintrag: Eingang
  status: 'rueckfrage' | 'pruefung' | 'offeriert'
  uebernehmen: boolean
  onSchliessen: (gespeichert: boolean) => void
}) {
  const { t } = useTranslation()
  const [notiz, setNotiz] = useState(status === 'rueckfrage' ? (eintrag.rueckfrage ?? '') : '')
  const [datum, setDatum] = useState(heuteIso())
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useOffertAenderung(() =>
    setzeEingangStatus(eintrag.id, status, {
      uebernehmen,
      ...(notiz.trim() ? { notiz } : {}),
      ...(status === 'offeriert' ? { datum } : {}),
    }),
  )

  async function absenden() {
    setFehler(null)
    if (status === 'rueckfrage' && !notiz.trim()) {
      setFehler(t('fachfehler.offerte_notiz_fehlt'))
      return
    }
    try {
      await speichern.mutateAsync(undefined)
      melde('ok', zweisprachig(`offerten.eingang.ok_${status}`))
      onSchliessen(true)
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.eingang')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen(false)
      }}
    >
      <DialogInhalt
        titel={t(`offerten.eingang.titel_${status}`)}
        beschreibung={eintrag.name}
        fuss={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onSchliessen(false)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Check />
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
          {status === 'offeriert' ? (
            <>
              <Feld id="eingang-datum" label={t('offerten.eingang.versendetAm')} pflicht>
                <Input
                  id="eingang-datum"
                  type="date"
                  value={datum}
                  max={heuteIso()}
                  onChange={(e) => {
                    setDatum(e.target.value)
                  }}
                />
              </Feld>
              <p className="text-muted-foreground text-sm">{t('offerten.eingang.versendetHinweis')}</p>
            </>
          ) : (
            <Feld
              id="eingang-notiz"
              label={t(status === 'rueckfrage' ? 'offerten.eingang.wasFehlt' : 'offerten.eingang.hinweisAussendienst')}
              pflicht={status === 'rueckfrage'}
              fehler={fehler ?? undefined}
            >
              <Textarea
                id="eingang-notiz"
                rows={4}
                value={notiz}
                onChange={(e) => {
                  setNotiz(e.target.value)
                }}
              />
            </Feld>
          )}
          {fehler && status === 'offeriert' && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
