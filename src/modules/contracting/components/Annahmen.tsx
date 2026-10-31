import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Skelett } from '@/components/ui/diverses'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { DachsucheKarte } from './DachsucheKarte'
import { useRegeln } from '../hooks/useGrossprojekte'
import { speichereAnnahmen } from '../services/grossprojekte'
import type { GrossprojektRegeln } from '../types'

const FELDER = [
  'kwp_pro_m2',
  'kwh_pro_kwp',
  'zins_prozent',
  'laufzeit_jahre',
  'betrieb_prozent',
  'marge_prozent',
  'kw_pro_wohnung',
  'chf_pro_kw_waerme',
  'laufzeit_waerme_jahre',
] as const
type Annahme = (typeof FELDER)[number]

/**
 * Annahmen der Schätzung (kWp pro m², Zins, Laufzeit, Marge …) und ab wie vielen Punkten die Glocke meldet. Alle sehen
 * sie, damit klar ist, woher die Zahlen kommen; ändern darf nur die Administration. Danach rechnet die Datenbank
 * jedes Grossprojekt beim nächsten Speichern neu.
 */
export function Annahmen() {
  const regeln = useRegeln()
  if (!regeln.data) return <Skelett className="h-64" />
  return <AnnahmenFormular regeln={regeln.data} />
}

function AnnahmenFormular({ regeln }: { regeln: GrossprojektRegeln }) {
  const { t } = useTranslation()
  const admin = hatRecht(
    useAnmeldung((z) => z.ich),
    'admin',
  )
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState<Record<Annahme | 'melden_ab', string>>(() => ({
    ...(Object.fromEntries(FELDER.map((f) => [f, String(regeln.annahmen?.[f] ?? '')])) as Record<Annahme, string>),
    melden_ab: String(regeln.melden_ab ?? 50),
  }))
  const staffel = regeln.annahmen?.chf_pro_kwp ?? []

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <DachsucheKarte />
      </div>
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('grossprojekte.annahmen.titel')}</KarteTitel>
        </KarteKopf>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
          {(['melden_ab', ...FELDER] as const).map((f) => (
            <Feld key={f} id={`gp-a-${f}`} label={t(`grossprojekte.annahmen.${f}`)}>
              <Input
                id={`gp-a-${f}`}
                inputMode="decimal"
                disabled={!admin}
                value={w[f]}
                onChange={(e) => {
                  setW({ ...w, [f]: e.target.value })
                }}
              />
            </Feld>
          ))}
          {admin ? (
            <div className="sm:col-span-2">
              <Button
                laedt={laeuft}
                onClick={() =>
                  void aus(
                    () =>
                      speichereAnnahmen({
                        melden_ab: Number(w.melden_ab) || 50,
                        annahmen: Object.fromEntries(
                          FELDER.filter((f) => w[f].trim() !== '' && Number.isFinite(Number(w[f]))).map((f) => [
                            f,
                            Number(w[f]),
                          ]),
                        ),
                      }),
                    { de: 'Annahmen gespeichert', fr: 'Hypothèses enregistrées' },
                  )
                }
              >
                <Save />
                {t('allgemein.speichern')}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs sm:col-span-2">{t('grossprojekte.annahmen.nurAdmin')}</p>
          )}
        </div>
      </Karte>
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('grossprojekte.annahmen.punkteTitel')}</KarteTitel>
        </KarteKopf>
        <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
          <p>{t('grossprojekte.annahmen.punkteText')}</p>
          <ul className="text-muted-foreground list-disc pl-5">
            {(['dach', 'nutzung', 'heizung', 'bauherr', 'fahrzeit', 'wohnungen'] as const).map((x) => (
              <li key={x}>{t(`grossprojekte.annahmen.teil.${x}`)}</li>
            ))}
          </ul>
          <h3 className="pt-2 font-semibold">{t('grossprojekte.annahmen.staffel')}</h3>
          <ul className="text-muted-foreground zahlen">
            {staffel.map((s) => (
              <li key={String(s.bis)}>
                {s.bis === null
                  ? t('grossprojekte.annahmen.staffelRest', { chf: s.chf })
                  : t('grossprojekte.annahmen.staffelBis', { bis: s.bis, chf: s.chf })}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground pt-2 text-xs">{t('grossprojekte.annahmen.neuRechnen')}</p>
        </div>
      </Karte>
    </div>
  )
}
