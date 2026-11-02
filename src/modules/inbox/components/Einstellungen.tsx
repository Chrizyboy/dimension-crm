import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Checkbox, Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { usePersonen, useRegeln } from '../hooks/usePosteingang'
import { minutenAus, regelnSchema, stundenText } from '../schema'
import { speichereRegeln } from '../services/posteingang'
import { FRIST_ARTEN, type PosteingangRegeln, type Person } from '../types'
import { NachholenKarte } from './NachholenKarte'

const KEINE = '–'

/**
 * Einstellungen (nur Administration): ein/aus, Arbeitszeit, Antwortfrist je Art, wer Mails aus Team-Postfächern
 * verteilt (eigene Postfächer bearbeitet jede Person selbst), Stellvertretung bei Abwesenheit und wer bei doppelter
 * Frist die Glocke bekommt. Dazu, wie weit ältere Mails nachgeholt werden (eigener Knopf).
 */
export function Einstellungen() {
  const regeln = useRegeln().data
  const personen = usePersonen().data
  if (!regeln || !personen) return null
  return <Formular regeln={regeln} personen={personen} />
}

function Formular({ regeln, personen }: { regeln: PosteingangRegeln; personen: Person[] }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [aktiv, setAktiv] = useState(regeln.aktiv !== false)
  const [von, setVon] = useState(regeln.arbeitszeit?.von ?? '07:30')
  const [bis, setBis] = useState(regeln.arbeitszeit?.bis ?? '17:30')
  const [vorwarnung, setVorwarnung] = useState(String(regeln.vorwarnung_min ?? 30))
  const [fristen, setFristen] = useState<Record<string, string>>(
    Object.fromEntries(FRIST_ARTEN.map((a) => [a, stundenText(regeln.arten?.[a]?.frist_min)])),
  )
  const [verteilen, setVerteilen] = useState<string[]>(regeln.verteilen ?? [])
  const [vertretung, setVertretung] = useState<Record<string, string>>(regeln.vertretung ?? {})
  const [eskalation, setEskalation] = useState<string[]>(regeln.eskalation ?? [])
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const wahl = [
    { wert: KEINE, text: t('posteingang.einst.niemand') },
    ...personen.map((p) => ({ wert: p.kuerzel, text: p.name })),
  ]

  async function speichern() {
    const g = regelnSchema.safeParse({ von, bis, vorwarnung, fristen })
    if (!g.success) {
      setFehler(Object.fromEntries(g.error.issues.map((i) => [i.path.join('.'), t(i.message)])))
      return
    }
    setFehler({})
    const arten = { ...regeln.arten }
    for (const a of FRIST_ARTEN) arten[a] = { ...arten[a], frist_min: minutenAus(fristen[a] ?? '') }
    await aus(
      () =>
        speichereRegeln({
          aktiv,
          arbeitszeit: { tage: regeln.arbeitszeit?.tage ?? [1, 2, 3, 4, 5], von, bis },
          feiertage: regeln.feiertage ?? [],
          vorwarnung_min: Number(vorwarnung),
          arten,
          verteilen,
          vertretung: Object.fromEntries(Object.entries(vertretung).filter(([, v]) => v && v !== KEINE)),
          eskalation,
        }),
      { de: 'Gespeichert. Gilt für neue Mails.', fr: 'Enregistré. Valable pour les nouveaux e-mails.' },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('posteingang.einst.allgemein')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt className="flex flex-col gap-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={aktiv} onCheckedChange={setAktiv} />
            {t('posteingang.einst.aktiv')}
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Feld id="pe-von" label={t('posteingang.einst.von')} fehler={fehler.von}>
              <Input
                id="pe-von"
                type="time"
                value={von}
                onChange={(e) => {
                  setVon(e.target.value)
                }}
              />
            </Feld>
            <Feld id="pe-bis" label={t('posteingang.einst.bis')} fehler={fehler.bis}>
              <Input
                id="pe-bis"
                type="time"
                value={bis}
                onChange={(e) => {
                  setBis(e.target.value)
                }}
              />
            </Feld>
            <Feld id="pe-vor" label={t('posteingang.einst.vorwarnung')} fehler={fehler.vorwarnung}>
              <Input
                id="pe-vor"
                inputMode="numeric"
                value={vorwarnung}
                onChange={(e) => {
                  setVorwarnung(e.target.value)
                }}
              />
            </Feld>
          </div>
          <p className="text-muted-foreground text-xs">{t('posteingang.einst.arbeitszeitHinweis')}</p>
        </KarteInhalt>
      </Karte>

      <Karte>
        <KarteKopf>
          <KarteTitel>{t('posteingang.einst.fristen')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FRIST_ARTEN.map((a) => (
            <Feld
              key={a}
              id={`pe-frist-${a}`}
              label={t(`posteingang.art.${a}`)}
              fehler={fehler[`fristen.${a}`]}
              hinweis={t('posteingang.einst.stunden')}
            >
              <Input
                id={`pe-frist-${a}`}
                inputMode="decimal"
                value={fristen[a] ?? ''}
                placeholder={t('posteingang.einst.keine')}
                onChange={(e) => {
                  setFristen({ ...fristen, [a]: e.target.value })
                }}
              />
            </Feld>
          ))}
        </KarteInhalt>
      </Karte>

      <Karte>
        <KarteKopf>
          <KarteTitel>{t('posteingang.einst.verteilen')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">{t('posteingang.einst.verteilenHinweis')}</p>
          <PersonenWahl personen={personen} gewaehlt={verteilen} onChange={setVerteilen} />
        </KarteInhalt>
      </Karte>

      <div className="grid gap-4 lg:grid-cols-2">
        <Karte>
          <KarteKopf>
            <KarteTitel>{t('posteingang.einst.vertretung')}</KarteTitel>
          </KarteKopf>
          <KarteInhalt className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">{t('posteingang.einst.vertretungHinweis')}</p>
            {personen.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-sm">
                <span>{p.name}</span>
                <Auswahl
                  aria-label={t('posteingang.einst.vertretungFuer', { name: p.name })}
                  value={vertretung[p.kuerzel] ?? KEINE}
                  optionen={wahl.filter((w) => w.wert !== p.kuerzel)}
                  onValueChange={(v) => {
                    setVertretung({ ...vertretung, [p.kuerzel]: v })
                  }}
                />
              </div>
            ))}
          </KarteInhalt>
        </Karte>
        <Karte>
          <KarteKopf>
            <KarteTitel>{t('posteingang.einst.eskalation')}</KarteTitel>
          </KarteKopf>
          <KarteInhalt className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">{t('posteingang.einst.eskalationHinweis')}</p>
            <PersonenWahl personen={personen} gewaehlt={eskalation} onChange={setEskalation} />
          </KarteInhalt>
        </Karte>
      </div>
      <NachholenKarte regeln={regeln} />
      <div className="flex justify-end">
        <Button laedt={laeuft} onClick={() => void speichern()}>
          {t('allgemein.speichern')}
        </Button>
      </div>
    </div>
  )
}

/** Personen zum Ankreuzen (Kürzel), in der Reihenfolge des Ankreuzens. */
function PersonenWahl({
  personen,
  gewaehlt,
  onChange,
}: {
  personen: Person[]
  gewaehlt: string[]
  onChange: (kuerzel: string[]) => void
}) {
  return personen.map((p) => (
    <label key={p.id} className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={gewaehlt.includes(p.kuerzel)}
        onCheckedChange={(c) => {
          onChange(c === true ? [...gewaehlt, p.kuerzel] : gewaehlt.filter((k) => k !== p.kuerzel))
        }}
      />
      {p.name}
    </label>
  ))
}
