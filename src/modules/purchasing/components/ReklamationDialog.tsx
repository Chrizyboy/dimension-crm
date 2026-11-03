import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { alsZahl } from '../lib/anzeige'
import { REKLAMATION_GRUENDE, REKLAMATION_LOESUNGEN } from '../lib/lagerTypen'
import type { Reklamation, ReklamationGrund, ReklamationLoesung } from '../lib/lagerTypen'
import { reklamationSpeichern } from '../services/reklamationen'
import type { Position } from '../types'

const OHNE = '_'

/**
 * Reklamation erfassen (Position, Menge, Grund, Beschreibung) oder abschliessen (Lösung und Antwort des
 * Lieferanten). Gemeldet wird beim Lieferanten wie gewohnt per Telefon oder Mail; hier steht, was läuft.
 */
export function ReklamationDialog({
  bestellungId,
  positionen,
  reklamation,
  onSchliessen,
}: {
  bestellungId: string
  positionen: Position[]
  reklamation: Reklamation | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const abschliessen = reklamation !== null
  const [position, setPosition] = useState(positionen.length === 1 ? (positionen[0]?.id ?? OHNE) : OHNE)
  const [menge, setMenge] = useState('')
  const [grund, setGrund] = useState<ReklamationGrund>('defekt')
  const [beschreibung, setBeschreibung] = useState('')
  const [loesung, setLoesung] = useState<ReklamationLoesung>('gutschrift')
  const [antwort, setAntwort] = useState(reklamation?.antwort ?? '')

  async function speichern() {
    const n = alsZahl(menge)
    const ok = await aus(
      () =>
        reklamationSpeichern(
          abschliessen
            ? { id: reklamation.id, status: 'erledigt', loesung, antwort: antwort.trim() }
            : {
                bestellung_id: bestellungId,
                ...(position === OHNE ? {} : { position_id: position }),
                ...(n !== null && n > 0 ? { menge: n } : {}),
                grund,
                beschreibung: beschreibung.trim(),
              },
        ),
      abschliessen
        ? { de: 'Reklamation erledigt', fr: 'Réclamation réglée' }
        : { de: 'Reklamation erfasst', fr: 'Réclamation saisie' },
    )
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
        titel={abschliessen ? t('einkauf.rek.abschliessen') : t('einkauf.rek.erfassen')}
        beschreibung={abschliessen ? t('einkauf.rek.abschliessenText') : t('einkauf.rek.erfassenText')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} onClick={() => void speichern()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        {abschliessen ? (
          <div className="flex flex-col gap-3">
            <Feld id="rk-loesung" label={t('einkauf.rek.loesung')} pflicht>
              <Auswahl
                id="rk-loesung"
                value={loesung}
                onValueChange={(w) => {
                  setLoesung(w as ReklamationLoesung)
                }}
                optionen={REKLAMATION_LOESUNGEN.map((l) => ({ wert: l, text: t(`einkauf.rek.loesungen.${l}`) }))}
              />
            </Feld>
            <Feld id="rk-antwort" label={t('einkauf.rek.antwort')}>
              <Textarea
                id="rk-antwort"
                rows={3}
                value={antwort}
                onChange={(e) => {
                  setAntwort(e.target.value)
                }}
              />
            </Feld>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Feld id="rk-position" label={t('einkauf.rek.position')}>
              <Auswahl
                id="rk-position"
                value={position}
                onValueChange={setPosition}
                optionen={[
                  { wert: OHNE, text: t('einkauf.rek.ganzeBestellung') },
                  ...positionen.map((p) => ({ wert: p.id, text: p.bezeichnung })),
                ]}
              />
            </Feld>
            <div className="grid grid-cols-2 gap-3">
              <Feld id="rk-grund" label={t('einkauf.rek.grund')} pflicht>
                <Auswahl
                  id="rk-grund"
                  value={grund}
                  onValueChange={(w) => {
                    setGrund(w as ReklamationGrund)
                  }}
                  optionen={REKLAMATION_GRUENDE.map((g) => ({ wert: g, text: t(`einkauf.rek.gruende.${g}`) }))}
                />
              </Feld>
              <Feld id="rk-menge" label={t('einkauf.zeile.menge')}>
                <Input
                  id="rk-menge"
                  inputMode="decimal"
                  value={menge}
                  onChange={(e) => {
                    setMenge(e.target.value)
                  }}
                />
              </Feld>
            </div>
            <Feld id="rk-beschreibung" label={t('einkauf.rek.beschreibung')}>
              <Textarea
                id="rk-beschreibung"
                rows={3}
                value={beschreibung}
                onChange={(e) => {
                  setBeschreibung(e.target.value)
                }}
              />
            </Feld>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
