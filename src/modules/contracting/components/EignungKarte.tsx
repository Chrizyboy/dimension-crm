import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAktion } from '../hooks/useAktion'
import { speichereEignung } from '../services/grossprojekte'
import { EIGNUNG_WERTE, type EignungWert, type GrossprojektRegeln } from '../types'

/**
 * Schwellen der Youdera-Prüfung (Strompreis, Eigenverbrauch, Grösse, Dachmiete, PV-Bestand). Alle sehen sie, ändern darf
 * nur die Administration; danach rechnet die Datenbank alles Offene neu.
 */
export function EignungKarte({ regeln, admin }: { regeln: GrossprojektRegeln; admin: boolean }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState<Record<EignungWert, string>>(
    () =>
      Object.fromEntries(EIGNUNG_WERTE.map((f) => [f, String(regeln.eignung?.[f] ?? '')])) as Record<
        EignungWert,
        string
      >,
  )
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('grossprojekte.annahmen.eignungTitel')}</KarteTitel>
      </KarteKopf>
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
        <p className="text-muted-foreground text-sm sm:col-span-2">{t('grossprojekte.annahmen.eignungText')}</p>
        {EIGNUNG_WERTE.map((f) => (
          <Feld key={f} id={`gp-e-${f}`} label={t(`grossprojekte.annahmen.eignung.${f}`)}>
            <Input
              id={`gp-e-${f}`}
              inputMode="decimal"
              disabled={!admin}
              value={w[f]}
              onChange={(e) => {
                setW({ ...w, [f]: e.target.value })
              }}
            />
          </Feld>
        ))}
        {admin && (
          <div className="sm:col-span-2">
            <Button
              laedt={laeuft}
              onClick={() =>
                void aus(
                  () =>
                    speichereEignung(
                      Object.fromEntries(
                        EIGNUNG_WERTE.filter((f) => w[f].trim() !== '' && Number.isFinite(Number(w[f]))).map((f) => [
                          f,
                          Number(w[f]),
                        ]),
                      ),
                    ),
                  { de: 'Youdera-Prüfung gespeichert', fr: 'Évaluation Youdera enregistrée' },
                )
              }
            >
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </div>
        )}
      </div>
    </Karte>
  )
}
