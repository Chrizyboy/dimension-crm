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

const KEINE = '–'
const ZEILEN = ['standard', 'anfrage', 'stoerung', 'kunde', 'rechnung', 'amt', 'lieferant'] as const

/**
 * Einstellungen (nur Administration): ein/aus, Arbeitszeit, Antwortfrist je Art, wer je Art und Sprache zuständig
 * ist, Stellvertretung bei Abwesenheit und wer bei doppelter Frist die Glocke bekommt.
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
  const [zustaendig, setZustaendig] = useState(regeln.zustaendig ?? {})
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
          zustaendig,
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
          <KarteTitel>{t('posteingang.einst.zustaendig')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">{t('posteingang.einst.zustaendigHinweis')}</p>
          <div className="grid grid-cols-[minmax(6rem,10rem)_1fr_1fr] items-center gap-2 text-sm">
            <span />
            <span className="text-muted-foreground text-xs">{t('posteingang.einst.deutsch')}</span>
            <span className="text-muted-foreground text-xs">{t('posteingang.einst.franzoesisch')}</span>
            {ZEILEN.map((z) => (
              <Zeile
                key={z}
                titel={z === 'standard' ? t('posteingang.einst.standard') : t(`posteingang.art.${z}`)}
                wert={zustaendig[z] ?? {}}
                wahl={wahl}
                onChange={(w) => {
                  setZustaendig({ ...zustaendig, [z]: w })
                }}
              />
            ))}
          </div>
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
            {personen.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={eskalation.includes(p.kuerzel)}
                  onCheckedChange={(c) => {
                    setEskalation(c === true ? [...eskalation, p.kuerzel] : eskalation.filter((k) => k !== p.kuerzel))
                  }}
                />
                {p.name}
              </label>
            ))}
          </KarteInhalt>
        </Karte>
      </div>
      <div className="flex justify-end">
        <Button laedt={laeuft} onClick={() => void speichern()}>
          {t('allgemein.speichern')}
        </Button>
      </div>
    </div>
  )
}

/** Eine Zeile der Zuständigkeit: Deutsch und Französisch. */
function Zeile({
  titel,
  wert,
  wahl,
  onChange,
}: {
  titel: string
  wert: { de?: string | null; fr?: string | null }
  wahl: { wert: string; text: string }[]
  onChange: (w: { de: string | null; fr: string | null }) => void
}) {
  const { t } = useTranslation()
  const nie = (s: string) => (s === KEINE ? null : s)
  return (
    <>
      <span>{titel}</span>
      <Auswahl
        aria-label={`${titel} ${t('posteingang.einst.deutsch')}`}
        value={wert.de ?? KEINE}
        optionen={wahl}
        onValueChange={(v) => {
          onChange({ de: nie(v), fr: wert.fr ?? null })
        }}
      />
      <Auswahl
        aria-label={`${titel} ${t('posteingang.einst.franzoesisch')}`}
        value={wert.fr ?? KEINE}
        optionen={wahl}
        onValueChange={(v) => {
          onChange({ de: wert.de ?? null, fr: nie(v) })
        }}
      />
    </>
  )
}
