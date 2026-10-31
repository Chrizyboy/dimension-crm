import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { VERTRAG_SCHLUESSEL } from '../hooks/useWerkvertraege'
import { speichereEinstellung } from '../services/werkvertraege'
import type { WerkvertragEinstellung } from '../types'

/**
 * Einstellungen der Werkverträge (nur Administration): wer für Dimension Solaire unterschreibt, Ansprechperson,
 * Telefon (deutscher und französischer Vertrag), Mail und Adresse, und welche Zahlungsbedingung bei PV und bei Batterien vorgeschlagen wird.
 */
export default function EinstellungDialog({
  einstellung,
  onSchliessen,
}: {
  einstellung: WerkvertragEinstellung
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const konditionen = useAuswahl('zahlungskondition')
  const [e, setE] = useState(einstellung)
  const [laeuft, setLaeuft] = useState(false)
  const optionen = konditionen.werte
    .filter((k) => k.schluessel !== 'anzahlung')
    .map((k) => ({ wert: k.schluessel, text: konditionen.text(k.schluessel) }))

  async function speichern() {
    setLaeuft(true)
    try {
      await speichereEinstellung({
        ...e,
        telefon_de: e.telefon_de?.trim() || null,
        telefon_fr: e.telefon_fr?.trim() || null,
        email: e.email?.trim() || null,
      })
      await qc.invalidateQueries({ queryKey: VERTRAG_SCHLUESSEL })
      melde('ok', { de: 'Einstellungen gespeichert', fr: 'Réglages enregistrés' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'werkvertraege.einstellung')
    } finally {
      setLaeuft(false)
    }
  }

  const feld = (k: 'unterzeichner' | 'ansprechperson' | 'telefon_de' | 'telefon_fr' | 'email' | 'adresse') => (
    <Feld id={`wv-${k}`} label={t(`werkvertraege.einstellung.${k}`)} className={k === 'adresse' ? 'sm:col-span-2' : ''}>
      <Input
        id={`wv-${k}`}
        value={e[k] ?? ''}
        onChange={(x) => {
          setE({ ...e, [k]: x.target.value })
        }}
      />
    </Feld>
  )
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('werkvertraege.einstellung.titel')}
        beschreibung={t('werkvertraege.einstellung.beschreibung')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} onClick={() => void speichern()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {feld('unterzeichner')}
          {feld('ansprechperson')}
          {feld('telefon_de')}
          {feld('telefon_fr')}
          {feld('email')}
          {feld('adresse')}
          <Feld id="wv-pv" label={t('werkvertraege.einstellung.konditionPv')}>
            <Auswahl
              id="wv-pv"
              value={e.kondition_pv}
              onValueChange={(v) => {
                setE({ ...e, kondition_pv: v })
              }}
              optionen={optionen}
            />
          </Feld>
          <Feld id="wv-batterie" label={t('werkvertraege.einstellung.konditionBatterie')}>
            <Auswahl
              id="wv-batterie"
              value={e.kondition_batterie}
              onValueChange={(v) => {
                setE({ ...e, kondition_batterie: v })
              }}
              optionen={optionen}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
