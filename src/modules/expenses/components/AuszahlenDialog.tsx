import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich, jePerson, summe } from '../lib/spesen'
import { auszahlungErstellen } from '../services/spesen'
import type { Spese } from '../types'
import { Umschalter } from './Umschalter'

/**
 * Auszahlungslauf (nur Buchhaltung): Datum, «mit dem Lohn» oder «Überweisung» und ein Titel (Standard
 * «Lohn November 2026»). Danach sind die Spesen fest und jede Person bekommt eine Glocke mit ihrem Total.
 * Firmenkarten-Belege werden nie ausbezahlt, die Datenbank lässt sie weg.
 */
export function AuszahlenDialog({
  spesen,
  onSchliessen,
  onFertig,
}: {
  spesen: Spese[]
  onSchliessen: () => void
  onFertig: () => void
}) {
  const { t } = useTranslation()
  const { spesen: regeln } = useFinanzEinstellungen()
  const { laeuft, aus } = useAktion()
  const [datum, setDatum] = useState(heuteZuerich())
  const [art, setArt] = useState<'lohn' | 'ueberweisung'>(regeln.auszahlung)
  const [titel, setTitel] = useState('')
  const eigen = spesen.filter((s) => s.bezahlt_mit === 'eigen')

  async function los() {
    const ok = await aus(
      () =>
        auszahlungErstellen(
          eigen.map((s) => s.id),
          datum,
          art,
          titel.trim() || null,
        ),
      {
        de: 'Auszahlung erstellt',
        fr: 'Versement créé',
      },
    )
    if (ok) onFertig()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('spesen.auszahlen.titel', { count: eigen.length })}
        beschreibung={t('spesen.auszahlen.text', {
          betrag: formatChf(summe(eigen), { mitWaehrung: true }),
          personen: jePerson(eigen).length,
        })}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void los()} laedt={laeuft} disabled={!datum || eigen.length === 0}>
              {t('spesen.auszahlen.knopf')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t('spesen.auszahlen.art')}</span>
            <Umschalter
              beschriftung={t('spesen.auszahlen.art')}
              wert={art}
              optionen={[
                { wert: 'lohn', text: t('spesen.auszahlen.lohn') },
                { wert: 'ueberweisung', text: t('spesen.auszahlen.ueberweisung') },
              ]}
              onChange={setArt}
            />
          </div>
          <Feld id="spesen-auszahlen-datum" label={t('spesen.auszahlen.datum')} pflicht>
            <Input
              id="spesen-auszahlen-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld
            id="spesen-auszahlen-titel"
            label={t('spesen.auszahlen.titelFeld')}
            hinweis={t('spesen.auszahlen.titelHinweis')}
          >
            <Input
              id="spesen-auszahlen-titel"
              value={titel}
              onChange={(e) => {
                setTitel(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
