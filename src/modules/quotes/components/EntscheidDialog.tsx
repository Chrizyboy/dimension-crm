import { useNavigate } from '@tanstack/react-router'
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
import { formatDatum } from '@/lib/format'
import { heuteIso, inTagen } from '../lib/nachfassen'
import { entscheide } from '../services/offerten'
import type { Offerte } from '../types'

export type Entscheid = 'vertagt' | 'verloren' | 'angenommen' | 'verbaut' | 'nachfassen'

/** Häufige Gründe aus V233 als Vorschläge; der Text bleibt frei. */
const GRUENDE = {
  vertagt: ['budget', 'bauprojekt', 'vergleich', 'ferien'],
  verloren: ['zu_teuer', 'anderer_anbieter', 'kein_bedarf', 'nicht_erreichbar'],
} as const

/**
 * Entscheid beim Nachfassen (V45, V193) für eine oder mehrere Offerten: vertagt braucht ein Datum
 * (nicht in der Vergangenheit, Vorschlag in 3 Wochen) und einen Grund, abgelehnt einen Grund.
 * Angenommen führt danach zu «Auftrag erstellen» (Werkverträge). «Bereits verbaut» (V233): die Anlage steht
 * schon, die Offerte gilt ab dem Baudatum als angenommen (Projekt-Abschluss folgt mit den Projekten).
 */
export default function EntscheidDialog({
  offerten,
  ziel,
  onSchliessen,
}: {
  offerten: Offerte[]
  ziel: Entscheid
  onSchliessen: (gespeichert: boolean) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mitDatum = ziel === 'vertagt' || ziel === 'angenommen' || ziel === 'verbaut'
  const [datum, setDatum] = useState(ziel === 'vertagt' ? inTagen(21) : heuteIso())
  const [grund, setGrund] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useOffertAenderung(async () => {
    for (const o of offerten) {
      await entscheide(o.id, ziel === 'verbaut' ? 'angenommen' : ziel, {
        ...(mitDatum ? { datum } : {}),
        ...(grund ? { grund } : {}),
        ...(ziel === 'verbaut' ? { notiz: `Bereits verbaut am ${formatDatum(datum)}` } : {}),
      })
    }
  })
  const einzeln = offerten.length === 1 ? offerten[0] : undefined

  async function absenden() {
    setFehler(null)
    if ((ziel === 'vertagt' || ziel === 'verloren') && !grund.trim()) {
      setFehler(t('fachfehler.stand_grund_fehlt'))
      return
    }
    try {
      await speichern.mutateAsync(undefined)
      melde('ok', zweisprachig(`offerten.entscheid.ok_${ziel}`, { count: offerten.length }))
      onSchliessen(true)
      if (ziel === 'angenommen' && einzeln) {
        void navigate({ to: '/workcontracts', search: { auftrag: einzeln.id } })
      }
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.entscheid')
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
        titel={t(`offerten.entscheid.titel_${ziel}`)}
        beschreibung={
          einzeln ? `${einzeln.nummer} · ${einzeln.name}` : t('offerten.entscheid.mehrere', { count: offerten.length })
        }
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
              {t(`offerten.entscheid.knopf_${ziel}`)}
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
          {mitDatum && (
            <Feld id="entscheid-datum" label={t(`offerten.entscheid.datum_${ziel}`)} pflicht>
              <Input
                id="entscheid-datum"
                type="date"
                value={datum}
                {...(ziel === 'vertagt' ? { min: inTagen(1) } : { max: heuteIso() })}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
          )}
          {(ziel === 'vertagt' || ziel === 'verloren') && (
            <Feld id="entscheid-grund" label={t('offerten.entscheid.grund')} pflicht fehler={fehler ?? undefined}>
              <Textarea
                id="entscheid-grund"
                rows={3}
                value={grund}
                onChange={(e) => {
                  setGrund(e.target.value)
                }}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {GRUENDE[ziel].map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setGrund(t(`offerten.grund.${g}`))
                    }}
                  >
                    {t(`offerten.grund.${g}`)}
                  </Button>
                ))}
              </div>
            </Feld>
          )}
          {ziel === 'angenommen' && (
            <p className="text-muted-foreground text-sm">{t('offerten.entscheid.angenommenHinweis')}</p>
          )}
          {ziel === 'nachfassen' && (
            <p className="text-muted-foreground text-sm">{t('offerten.entscheid.nachfassenHinweis')}</p>
          )}
          {fehler && ziel !== 'vertagt' && ziel !== 'verloren' && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
