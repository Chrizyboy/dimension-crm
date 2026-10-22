import { Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { schrittDatum } from '../lib/fahrplan'
import { schrittSetzen } from '../services/projekte'
import type { FahrplanSchritt, SchrittStand } from '../types'

const STAENDE: SchrittStand[] = ['offen', 'teilweise', 'erledigt', 'nicht_noetig']

/**
 * Einen Schritt des Fahrplans bearbeiten: Stand, Datum (eingereicht bzw. erledigt), eigene Frist und Notiz,
 * mit dem Hinweis aus der Vorlage. Automatische Schritte (Vertrag, Termin, Montage, IBN) zeigen nur, woher
 * ihr Stand kommt; Frist und Notiz gehen trotzdem.
 */
export function SchrittDialog({
  schritt,
  titel,
  onSchliessen,
}: {
  schritt: FahrplanSchritt
  titel: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState({
    stand: schritt.stand,
    datum: schrittDatum(schritt) ?? '',
    frist: schritt.eigene_frist ?? '',
    notiz: schritt.notiz ?? '',
  })
  const name = sprache === 'fr' ? schritt.name_fr : schritt.name_de
  const hinweis = sprache === 'fr' ? schritt.hinweis_fr : schritt.hinweis_de
  const mitDatum = w.stand === 'teilweise' || w.stand === 'erledigt'

  async function speichern() {
    const ok = await aus(
      () =>
        schrittSetzen(schritt.projekt_id, schritt.schluessel, {
          ...(schritt.automatisch ? {} : { stand: w.stand, ...(mitDatum && w.datum ? { datum: w.datum } : {}) }),
          frist: w.frist,
          notiz: w.notiz,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
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
        titel={name}
        beschreibung={titel}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {hinweis && (
            <p className="bg-info-soft flex gap-2 rounded-md p-2.5 text-sm">
              <Info className="text-info mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {hinweis}
            </p>
          )}
          {schritt.automatisch ? (
            <p className="text-muted-foreground text-sm">
              {t(`projekte.fahrplan.auto.${schritt.auto ?? 'vertrag'}`)} ·{' '}
              <strong>{t(`projekte.stand.${schritt.stand}`)}</strong>
            </p>
          ) : (
            <Filterchips
              einzeln
              beschriftung={t('projekte.feld.stand')}
              optionen={STAENDE.map((s) => ({ wert: s, text: t(`projekte.stand.${s}`) }))}
              gewaehlt={[w.stand]}
              onChange={([s]) => {
                setW({ ...w, stand: (s ?? 'offen') as SchrittStand })
              }}
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {mitDatum && !schritt.automatisch && (
              <Feld
                id="schritt-datum"
                label={t(w.stand === 'erledigt' ? 'projekte.feld.erledigtAm' : 'projekte.feld.eingereichtAm')}
              >
                <Input
                  id="schritt-datum"
                  type="date"
                  value={w.datum}
                  onChange={(e) => {
                    setW({ ...w, datum: e.target.value })
                  }}
                />
              </Feld>
            )}
            <Feld
              id="schritt-frist"
              label={t('projekte.feld.frist')}
              {...(schritt.frist && !schritt.eigene_frist
                ? { hinweis: t('projekte.fahrplan.fristAuto', { datum: formatDatum(schritt.frist) }) }
                : {})}
            >
              <Input
                id="schritt-frist"
                type="date"
                value={w.frist}
                onChange={(e) => {
                  setW({ ...w, frist: e.target.value })
                }}
              />
            </Feld>
          </div>
          <Feld id="schritt-notiz" label={t('projekte.feld.notiz')}>
            <Textarea
              id="schritt-notiz"
              rows={3}
              value={w.notiz}
              onChange={(e) => {
                setW({ ...w, notiz: e.target.value })
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
