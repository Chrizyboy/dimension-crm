import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Checkbox, Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { speichereRegeln } from '../services/posteingang'
import type { Art, Person, PosteingangRegeln } from '../types'

const KEINE = '–'
/** Arten, für die man beim Verteilen eine feste Person vorschlagen kann. */
const VORSCHLAG_ARTEN: Art[] = ['anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'sonstiges']
/** Arten, nach deren Antwort wir automatisch auf den Kunden warten können. */
const WARTEN_ARTEN: Art[] = ['anfrage', 'kunde', 'stoerung', 'amt']

/**
 * Einstellungen für den Arbeitsplatz (nur Administration): nach einer Antwort automatisch auf den Kunden warten
 * (welche Arten, wie viele Arbeitstage, neue Frist beim Nachfassen) und wen das Verteilen je Art vorschlägt, wenn die
 * Akte niemanden nennt. Eigener Knopf, damit die übrigen Einstellungen unberührt bleiben.
 */
export function WartenKarte({ regeln, personen }: { regeln: PosteingangRegeln; personen: Person[] }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const w = regeln.warten ?? {}
  const [auto, setAuto] = useState(w.auto !== false)
  const [tage, setTage] = useState(String(w.tage ?? 3))
  const [frist, setFrist] = useState(String((w.frist_min ?? 240) / 60))
  const [arten, setArten] = useState<string[]>(w.arten ?? ['anfrage'])
  const [mitOfferte, setMitOfferte] = useState(w.mit_offerte !== false)
  const [vorschlag, setVorschlag] = useState<Record<string, string>>(regeln.vorschlag ?? {})
  const tageZahl = Number(tage)
  const fristZahl = Number(frist.replace(',', '.'))
  const ok = Number.isInteger(tageZahl) && tageZahl >= 1 && tageZahl <= 30 && fristZahl > 0 && fristZahl <= 72

  const speichern = () =>
    void aus(
      () =>
        speichereRegeln({
          warten: { auto, tage: tageZahl, arten, mit_offerte: mitOfferte, frist_min: Math.round(fristZahl * 60) },
          vorschlag: Object.fromEntries(Object.entries(vorschlag).filter(([, v]) => v && v !== KEINE)),
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('posteingang.einst.warten')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-4">
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={auto} onCheckedChange={setAuto} />
          {t('posteingang.einst.wartenAuto')}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld
            id="pe-warten-tage"
            label={t('posteingang.einst.wartenTage')}
            {...(ok ? {} : { fehler: t('posteingang.einst.wartenFehler') })}
          >
            <Input
              id="pe-warten-tage"
              inputMode="numeric"
              value={tage}
              onChange={(e) => {
                setTage(e.target.value)
              }}
            />
          </Feld>
          <Feld
            id="pe-warten-frist"
            label={t('posteingang.einst.wartenFrist')}
            hinweis={t('posteingang.einst.stunden')}
          >
            <Input
              id="pe-warten-frist"
              inputMode="decimal"
              value={frist}
              onChange={(e) => {
                setFrist(e.target.value)
              }}
            />
          </Feld>
        </div>
        <div className="flex flex-wrap gap-4">
          {WARTEN_ARTEN.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={arten.includes(a)}
                onCheckedChange={(c) => {
                  setArten(c === true ? [...arten, a] : arten.filter((x) => x !== a))
                }}
              />
              {t(`posteingang.art.${a}`)}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={mitOfferte}
              onCheckedChange={(c) => {
                setMitOfferte(c === true)
              }}
            />
            {t('posteingang.einst.wartenOfferte')}
          </label>
        </div>
        <p className="text-muted-foreground text-xs">{t('posteingang.einst.wartenHinweis')}</p>
        <h3 className="text-sm font-semibold">{t('posteingang.einst.vorschlag')}</h3>
        <p className="text-muted-foreground -mt-3 text-xs">{t('posteingang.einst.vorschlagHinweis')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VORSCHLAG_ARTEN.map((a) => (
            <div key={a} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-sm">
              <span>{t(`posteingang.art.${a}`)}</span>
              <Auswahl
                aria-label={t('posteingang.einst.vorschlagFuer', { art: t(`posteingang.art.${a}`) })}
                value={vorschlag[a] ?? KEINE}
                optionen={[
                  { wert: KEINE, text: t('posteingang.einst.automatisch') },
                  ...personen.map((p) => ({ wert: p.kuerzel, text: p.name })),
                ]}
                onValueChange={(v) => {
                  setVorschlag({ ...vorschlag, [a]: v })
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" laedt={laeuft} disabled={!ok} onClick={speichern}>
            {t('allgemein.speichern')}
          </Button>
        </div>
      </KarteInhalt>
    </Karte>
  )
}
