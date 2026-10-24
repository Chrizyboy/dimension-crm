import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { formatChf, parseChf } from '@/lib/format'
import { useKiStatus } from '@/services/ki'
import { useKiAktion, useKiEinstellungen } from '../hooks/useAi'
import { einstellungSchema } from '../schema'
import { speichereEinstellungen } from '../services/ai'
import type { KiEinstellungen, Stufe } from '../types'

/** KI-Einstellungen (nur Administration): ein/aus, Limits, Modelle je Stufe, Stufe je Funktion, Firmen-Schreibstil. */
export function Einstellungen() {
  const e = useKiEinstellungen()
  if (!e.data) return <Skelett className="h-96" />
  return <Formular start={e.data} />
}

function Formular({ start }: { start: KiEinstellungen }) {
  const { t } = useTranslation()
  const status = useKiStatus().data
  const { laeuft, aus } = useKiAktion()
  const [e, setE] = useState(start)
  const [limit, setLimit] = useState(formatChf(start.tageslimit_rappen))
  const [person, setPerson] = useState(start.person_limit_rappen === null ? '' : formatChf(start.person_limit_rappen))
  // Nur Modelle mit hinterlegten Preisen: sonst stimmen die Kosten nicht (neue Modelle kommen mit Preis als Daten).
  const modelle = Object.keys(e.preise_usd).map((m) => ({ wert: m, text: m }))
  const werte = {
    ...e,
    tageslimit_rappen: parseChf(limit) ?? -1,
    person_limit_rappen: person.trim() ? (parseChf(person) ?? -1) : null,
  }
  const gueltig = einstellungSchema.safeParse(werte).success
  return (
    <Karte className="flex max-w-3xl flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="ki-aktiv" className="flex items-center gap-2 text-sm font-medium">
          <Switch
            id="ki-aktiv"
            checked={e.aktiv}
            onCheckedChange={(aktiv) => {
              setE({ ...e, aktiv })
            }}
          />
          {t('ki.einstellungen.aktiv')}
        </label>
        {status && (
          <Badge ton={status.eingerichtet ? 'ok' : 'warnung'} punkt>
            {status.eingerichtet ? t('ki.einstellungen.schluesselJa') : t('ki.einstellungen.schluesselNein')}
          </Badge>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Feld id="ki-limit" label={t('ki.einstellungen.tageslimit')} hinweis={t('ki.einstellungen.tageslimitHilfe')}>
          <Input
            id="ki-limit"
            inputMode="decimal"
            value={limit}
            onChange={(x) => {
              setLimit(x.target.value)
            }}
          />
        </Feld>
        <Feld id="ki-person" label={t('ki.einstellungen.personLimit')} hinweis={t('ki.einstellungen.personLimitHilfe')}>
          <Input
            id="ki-person"
            inputMode="decimal"
            value={person}
            onChange={(x) => {
              setPerson(x.target.value)
            }}
          />
        </Feld>
        <Feld id="ki-kurs" label={t('ki.einstellungen.kurs')}>
          <Input
            id="ki-kurs"
            type="number"
            step="0.01"
            value={e.usd_chf}
            onChange={(x) => {
              setE({ ...e, usd_chf: Number(x.target.value) })
            }}
          />
        </Feld>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['standard', 'schnell'] as const).map((s) => (
          <Feld
            key={s}
            id={`ki-modell-${s}`}
            label={t(`ki.einstellungen.modell.${s}`)}
            hinweis={t(`ki.einstellungen.modellHilfe.${s}`)}
          >
            <Auswahl
              id={`ki-modell-${s}`}
              value={e.modelle[s]}
              optionen={modelle}
              onValueChange={(m) => {
                setE({ ...e, modelle: { ...e.modelle, [s]: m } })
              }}
            />
          </Feld>
        ))}
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t('ki.einstellungen.funktionen')}</h2>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {Object.entries(e.funktionen).map(([f, stufe]) => (
            <div key={f} className="flex items-center justify-between gap-2 text-sm">
              <span>{t(`ki.funktion.${f}`, { defaultValue: f })}</span>
              <Auswahl
                aria-label={t(`ki.funktion.${f}`, { defaultValue: f })}
                className="w-32"
                value={stufe}
                optionen={(['standard', 'schnell'] as const).map((s) => ({
                  wert: s,
                  text: t(`ki.einstellungen.stufe.${s}`),
                }))}
                onValueChange={(s) => {
                  setE({ ...e, funktionen: { ...e.funktionen, [f]: s as Stufe } })
                }}
              />
            </div>
          ))}
        </div>
      </section>
      {(['de', 'fr'] as const).map((s) => (
        <Feld
          key={s}
          id={`ki-stil-${s}`}
          label={t(`ki.einstellungen.stil.${s}`)}
          hinweis={t('ki.einstellungen.stilHilfe')}
        >
          <Textarea
            id={`ki-stil-${s}`}
            rows={8}
            value={e.stil[s]}
            onChange={(x) => {
              setE({ ...e, stil: { ...e.stil, [s]: x.target.value } })
            }}
          />
        </Feld>
      ))}
      <Button
        className="self-start"
        disabled={laeuft || !gueltig}
        onClick={() =>
          void aus(() => speichereEinstellungen(werte), {
            de: 'KI-Einstellungen gespeichert',
            fr: 'Paramètres IA enregistrés',
          })
        }
      >
        {t('allgemein.speichern')}
      </Button>
    </Karte>
  )
}
