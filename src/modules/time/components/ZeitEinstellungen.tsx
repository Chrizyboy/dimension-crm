import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NurAdministration } from '@/components/shared/NurAdministration'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { einstellungenSpeichern, ladeEinstellungen, type ZeitEinstellungen as Werte } from '../services/zeit'

/** Feiertage, die die Datenbank kennt (`intern.feiertage_alle`); welche gelten, wählt man je Standort. */
const FEIERTAGE = [
  'neujahr',
  'berchtoldstag',
  'karfreitag',
  'ostermontag',
  'tag_der_arbeit',
  'auffahrt',
  'pfingstmontag',
  'fronleichnam',
  'bundesfeier',
  'maria_himmelfahrt',
  'allerheiligen',
  'maria_empfaengnis',
  'weihnachten',
  'stephanstag',
] as const
const STANDORTE = ['muri', 'bulle'] as const

/**
 * Einstellungen der Zeiterfassung (nur Administration ändert): Zeit-Leitung, Wochenstunden und Ferientage als
 * Standard (die Personal-Akte geht vor), Start der Zeiterfassung und Feiertage je Standort.
 */
export function ZeitEinstellungen() {
  const daten = useQuery({ queryKey: ['zeit', 'einstellungen'], queryFn: ladeEinstellungen })
  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-64" />
  return (
    <NurAdministration>
      <Formular start={daten.data.wert} personen={daten.data.personen} />
    </NurAdministration>
  )
}

function Formular({ start, personen }: { start: Werte; personen: { kuerzel: string; name: string }[] }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState(start)
  const umschalten = (liste: string[], x: string) => (liste.includes(x) ? liste.filter((y) => y !== x) : [...liste, x])

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="ze-leitung" className="flex flex-col gap-2">
        <h3 id="ze-leitung" className="text-sm font-semibold">
          {t('zeit.einstellungen.leitung')}
        </h3>
        <p className="text-muted-foreground text-xs">{t('zeit.einstellungen.leitungText')}</p>
        <div className="grid gap-1 sm:grid-cols-3">
          {personen.map((p) => (
            <label key={p.kuerzel} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={w.leitung.includes(p.kuerzel)}
                onCheckedChange={() => {
                  setW({ ...w, leitung: umschalten(w.leitung, p.kuerzel) })
                }}
              />
              {p.name}
            </label>
          ))}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        <Feld id="ze-stunden" label={t('zeit.einstellungen.wochenstunden')}>
          <Input
            id="ze-stunden"
            type="number"
            step={0.5}
            value={w.wochenstunden}
            onChange={(e) => {
              setW({ ...w, wochenstunden: Number(e.target.value) })
            }}
          />
        </Feld>
        <Feld id="ze-ferien" label={t('zeit.einstellungen.ferientage')}>
          <Input
            id="ze-ferien"
            type="number"
            step={0.5}
            value={w.ferientage}
            onChange={(e) => {
              setW({ ...w, ferientage: Number(e.target.value) })
            }}
          />
        </Feld>
        <Feld id="ze-start" label={t('zeit.einstellungen.aktivSeit')}>
          <Input
            id="ze-start"
            type="date"
            value={w.aktiv_seit}
            onChange={(e) => {
              setW({ ...w, aktiv_seit: e.target.value })
            }}
          />
        </Feld>
      </div>
      <section aria-labelledby="ze-feiertage" className="flex flex-col gap-2">
        <h3 id="ze-feiertage" className="text-sm font-semibold">
          {t('zeit.einstellungen.feiertage')}
        </h3>
        <table className="w-full max-w-lg text-sm">
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium" />
              {STANDORTE.map((s) => (
                <th key={s} scope="col" className="w-20 text-center font-medium capitalize">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEIERTAGE.map((f) => (
              <tr key={f} className="border-t">
                <th scope="row" className="py-1 text-left font-normal">
                  {t(`zeit.feiertag.${f}`)}
                </th>
                {STANDORTE.map((s) => (
                  <td key={s} className="text-center">
                    <Checkbox
                      aria-label={`${t(`zeit.feiertag.${f}`)} ${s}`}
                      checked={(w.feiertage[s] ?? []).includes(f)}
                      onCheckedChange={() => {
                        setW({ ...w, feiertage: { ...w.feiertage, [s]: umschalten(w.feiertage[s] ?? [], f) } })
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Button
        className="self-start"
        laedt={laeuft}
        onClick={() => void aus(() => einstellungenSpeichern(w), { de: 'Gespeichert', fr: 'Enregistré' })}
      >
        {t('allgemein.speichern')}
      </Button>
    </div>
  )
}
