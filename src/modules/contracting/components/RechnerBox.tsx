import { Check, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useRegeln } from '../hooks/useGrossprojekte'
import { zahl } from '../lib/anzeige'
import { eingaben, rechne, unserAnteil, type Eingaben } from '../lib/rechner'
import { akteSetzen } from '../services/grossprojekte'
import type { Grossprojekt, RechnungWerte } from '../types'
import { Box } from './Box'
import { PotenzialSenden } from './Versand'

const FELDER: { id: keyof Eingaben; schritt: number }[] = [
  { id: 'kwp', schritt: 1 },
  { id: 'kwh_pro_kwp', schritt: 10 },
  { id: 'verbrauch_kwh', schritt: 1000 },
  { id: 'eigenverbrauch_prozent', schritt: 1 },
  { id: 'strompreis_rp', schritt: 0.1 },
  { id: 'preis_rp', schritt: 0.1 },
  { id: 'chf_pro_kwp', schritt: 50 },
]

const chf = (rappen: number) => `CHF ${zahl(rappen / 100)}`

/**
 * Rechner pro Projekt: was der Kunde mit Contracting spart und was investiert wird. Grau sind Vorschläge aus
 * Schätzung und Annahmen, weiss eigene Werte (z. B. Verbrauch aus den Stromrechnungen, Preis aus dem Angebot
 * von Youdera). Gespeichert werden nur die eigenen Werte.
 */
export function RechnerBox({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const regeln = useRegeln().data
  const { laeuft, aus } = useAktion()
  const [eigen, setEigen] = useState<RechnungWerte>(g.rechnung)
  const vorschlag = eingaben({ ...g, rechnung: {} }, regeln)
  const e = eingaben({ ...g, rechnung: eigen }, regeln)
  const r = rechne(e)
  const jahre = regeln?.annahmen?.laufzeit_jahre ?? 25
  const geaendert = JSON.stringify(eigen) !== JSON.stringify(g.rechnung)
  const uns = unserAnteil(r.investition_rappen, regeln)
  const anteil = r.heute_rappen > 0 ? (r.mit_rappen / r.heute_rappen) * 100 : 100

  return (
    <Box titel={t('grossprojekte.rechner.titel')}>
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-2 gap-y-1">
        {FELDER.map((f) => (
          <label key={f.id} className="contents">
            <span className="text-xs">{t(`grossprojekte.rechner.${f.id}`)}</span>
            <Input
              type="number"
              step={f.schritt}
              min={0}
              className={cn('h-7 text-right', eigen[f.id] === undefined && 'bg-muted text-muted-foreground')}
              value={eigen[f.id] ?? vorschlag[f.id]}
              onChange={(x) => {
                const n = x.target.value === '' ? undefined : Number(x.target.value)
                const rest = Object.fromEntries(Object.entries(eigen).filter(([k]) => k !== f.id))
                setEigen(n === undefined || n === vorschlag[f.id] ? rest : { ...rest, [f.id]: n })
              }}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1 border-t pt-2">
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_6.5rem] items-center gap-2 text-xs">
          <span>{t('grossprojekte.rechner.heute')}</span>
          <span className="bg-muted h-2.5 overflow-hidden rounded" aria-hidden="true">
            <span className="bg-bad block h-full w-full" />
          </span>
          <span className="zahlen text-right">{chf(r.heute_rappen)}</span>
          <span>{t('grossprojekte.rechner.mit')}</span>
          <span className="bg-muted h-2.5 overflow-hidden rounded" aria-hidden="true">
            <span className="bg-ok block h-full" style={{ width: `${String(anteil)}%` }} />
          </span>
          <span className="zahlen text-right">{chf(r.mit_rappen)}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          {t('grossprojekte.rechner.erklaerung', { kwh: zahl(r.eigen_kwh), ertrag: zahl(r.ertrag_kwh) })}
        </p>
        <p className="flex justify-between border-t pt-1.5 font-semibold">
          <span>{t('grossprojekte.rechner.ersparnis')}</span>
          <span className={cn('zahlen', r.ersparnis_rappen > 0 ? 'text-ok' : 'text-bad')}>
            {chf(r.ersparnis_rappen)}
          </span>
        </p>
        <p className="text-muted-foreground flex justify-between text-xs">
          <span>{t('grossprojekte.rechner.ueberLaufzeit', { jahre })}</span>
          <span className="zahlen">{chf(r.ersparnis_rappen * jahre)}</span>
        </p>
        <p className="text-muted-foreground flex justify-between text-xs">
          <span>{t('grossprojekte.rechner.investition')}</span>
          <span className="zahlen">{chf(r.investition_rappen)}</span>
        </p>
        <p className="text-muted-foreground flex justify-between text-xs">
          <span>{t('grossprojekte.rechner.bau', { prozent: uns.marge_prozent })}</span>
          <span className="zahlen">{chf(uns.bau_rappen)}</span>
        </p>
        <p className="text-muted-foreground flex justify-between text-xs">
          <span>{t('grossprojekte.rechner.wartung', { prozent: uns.wartung_prozent })}</span>
          <span className="zahlen">{chf(uns.wartung_rappen_jahr)}</span>
        </p>
        {g.schaetzung.waerme_kw ? (
          <p className="text-muted-foreground text-xs">
            {t('grossprojekte.rechner.waerme', {
              kw: g.schaetzung.waerme_kw,
              rate: chf(g.schaetzung.waerme_rate_rappen ?? 0),
            })}
          </p>
        ) : null}
      </div>
      {!geaendert && (
        <div className="flex justify-end">
          <PotenzialSenden g={g} />
        </div>
      )}
      {geaendert && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEigen(g.rechnung)
            }}
          >
            <RotateCcw />
            {t('allgemein.abbrechen')}
          </Button>
          <Button
            size="sm"
            laedt={laeuft}
            onClick={() =>
              void aus(() => akteSetzen(g.id, { rechnung: eigen }), { de: 'Gespeichert', fr: 'Enregistré' })
            }
          >
            <Check />
            {t('allgemein.speichern')}
          </Button>
        </div>
      )}
    </Box>
  )
}
