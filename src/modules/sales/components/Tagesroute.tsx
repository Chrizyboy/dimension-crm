import { ChevronLeft, ChevronRight, Route as RouteIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAussendienst, useKalender, useTourEinstellungen } from '../hooks/useVerkauf'
import { nahe, planeAblauf, planeUmFixe, type Stopp } from '../lib/ablauf'
import { heuteIso, istOffenerLead } from '../lib/geschaeft'
import { km, STANDARD_TOUR, zuMinuten, type Belegt } from '../lib/route'
import { alsStopp, ausKalender, tagVon } from '../lib/stopps'
import type { Geschaeft } from '../types'
import { Karte } from './Karte'
import { RoutenAblauf } from './RoutenAblauf'
import { useStartOrt, type StartArt } from '../hooks/useStartOrt'
import { StartWahl } from './StartWahl'

interface TagesrouteProps {
  geschaefte: Geschaeft[]
  onOeffnen: (id: string) => void
}

function verschiebe(iso: string, tage: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + tage)
  return heuteIso(d)
}

/** Erster Tag mit Terminen ab heute, damit die Route nicht leer aufgeht (V233 pickDefaultDate). */
function ersterTerminTag(geschaefte: readonly Geschaeft[], personId: string): string {
  const heute = heuteIso()
  const tage = geschaefte
    .filter((g) => g.terminAm && (g.terminPersonId ?? g.personId) === personId)
    .map((g) => tagVon(g.terminAm as string))
    .filter((d) => d >= heute)
    .sort()
  return tage[0] ?? heute
}

/**
 * Tagesroute (V233): eine Person, ein Tag. Feste Termine aus dem CRM und dem Kalender, dazu auf Wunsch
 * offene Leads in der Nähe, die zwischen die Termine passen. Fahrzeiten sind Schätzungen und lassen sich
 * je Strecke korrigieren; mit Elektroauto plant die Route die Ladehalte.
 */
export default function Tagesroute({ geschaefte, onOeffnen }: TagesrouteProps) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const einstellungen = useTourEinstellungen()
  const ich = useAnmeldung((z) => z.ich?.id ?? '')
  const [personWahl, setPerson] = useState<string | null>(null)
  const person = personWahl ?? (personen.data?.some((p) => p.id === ich) ? ich : (personen.data?.[0]?.id ?? ''))
  const [datumWahl, setDatum] = useState<string | null>(null)
  const datum = datumWahl ?? ersterTerminTag(geschaefte, person)
  const standort = personen.data?.find((p) => p.id === person)?.standort ?? 'muri'
  const [startArt, setStartArt] = useState<StartArt | null>(null)
  const [andere, setAndere] = useState('')
  const [zielArt, setZielArt] = useState<StartArt | 'keins' | null>(null)
  const [zielAndere, setZielAndere] = useState('')
  const [abfahrt, setAbfahrt] = useState('')
  const [fahrzeiten, setFahrzeiten] = useState<Record<string, number>>({})
  const [dazu, setDazu] = useState<Set<string>>(new Set())
  const s = startArt ?? (personen.data?.find((p) => p.id === person)?.heim ? 'heim' : standort)
  const z = zielArt ?? s
  const start = useStartOrt(s, andere, person)
  const zielOrt = useStartOrt(z === 'keins' ? 'muri' : z, zielAndere, person)
  const ziel = z === 'keins' ? null : zielOrt
  const e = einstellungen.data ?? STANDARD_TOUR
  const kalender = useKalender(`${datum}T00:00:00`, `${datum}T23:59:59`)

  const { fixe, belegt } = useMemo(() => {
    const f: Stopp[] = []
    const b: Belegt[] = []
    for (const g of geschaefte) {
      if (!g.terminAm || tagVon(g.terminAm) !== datum || (g.terminPersonId ?? g.personId) !== person) continue
      const st = alsStopp(g, e.besuch_min, true)
      if (st) f.push(st)
    }
    for (const k of kalender.data ?? []) {
      if (k.personId !== person) continue
      const { stopp, belegt: bl } = ausKalender(k)
      // Ein Kalendertermin am Ort eines CRM-Termins ist derselbe Besuch, nicht ein zweiter.
      if (stopp && !f.some((x) => x.fix === stopp.fix && nahe(x, stopp))) f.push(stopp)
      if (bl) b.push(bl)
    }
    return { fixe: f, belegt: b }
  }, [geschaefte, kalender.data, datum, person, e.besuch_min])

  // Offene Leads ohne Termin, nächste zuerst: Vorschläge zum Ergänzen.
  const inDerNaehe = useMemo(() => {
    const anker = [...fixe, ...(start ? [start] : [])]
    if (!anker.length) return []
    return geschaefte
      .filter((g) => istOffenerLead(g) && g.stand !== 'termin' && g.breite !== null)
      .map((g) => ({
        g,
        km: Math.min(...anker.map((a) => km(a, { breite: g.breite as number, laenge: g.laenge as number }))),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 12)
  }, [geschaefte, fixe, start])

  const ergebnis = useMemo(() => {
    if (!start) return null
    const flexibel = inDerNaehe
      .filter((x) => dazu.has(x.g.id))
      .map((x) => alsStopp(x.g, e.besuch_min))
      .filter((x): x is Stopp => x !== null)
    const ab = zuMinuten(abfahrt)
    const { folge, passtNicht } = planeUmFixe(start, fixe, flexibel, ziel, e, belegt, ab)
    return { ablauf: planeAblauf({ start, stopps: folge, ziel, e, belegt, abfahrt: ab, fahrzeiten }), passtNicht }
  }, [start, ziel, fixe, inDerNaehe, dazu, e, belegt, abfahrt, fahrzeiten])

  const punkte = ergebnis?.ablauf.zeilen.map((zl) => ({
    id: zl.stopp.id,
    breite: zl.stopp.breite,
    laenge: zl.stopp.laenge,
    titel: zl.stopp.name,
    ton: zl.stopp.fix !== null ? ('primary' as const) : ('accent' as const),
    nummer: zl.nr,
  }))
  const linie: [number, number][] =
    start && ergebnis
      ? [
          [start.breite, start.laenge],
          ...ergebnis.ablauf.zeilen.map((zl): [number, number] => [zl.stopp.breite, zl.stopp.laenge]),
          ...(ziel ? [[ziel.breite, ziel.laenge] as [number, number]] : []),
        ]
      : []

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <Feld id="route-person" label={t('verkauf.person')}>
            <Auswahl
              id="route-person"
              value={person}
              onValueChange={(w) => {
                setPerson(w)
                setDatum(null)
                setStartArt(null)
              }}
              optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
            />
          </Feld>
          <Feld id="route-datum" label={t('verkauf.route.datum')}>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                aria-label={t('verkauf.route.tagZurueck')}
                onClick={() => {
                  setDatum(verschiebe(datum, -1))
                }}
              >
                <ChevronLeft />
              </Button>
              <Input
                id="route-datum"
                type="date"
                value={datum}
                onChange={(ev) => {
                  setDatum(ev.target.value)
                }}
              />
              <Button
                size="icon"
                variant="secondary"
                aria-label={t('verkauf.route.tagVor')}
                onClick={() => {
                  setDatum(verschiebe(datum, 1))
                }}
              >
                <ChevronRight />
              </Button>
            </div>
          </Feld>
          <StartWahl
            id="route-start"
            label={t('verkauf.route.start')}
            art={s}
            andere={andere}
            personId={person}
            onArt={setStartArt}
            onAndere={setAndere}
          />
          <Feld id="route-ziel" label={t('verkauf.route.ziel')}>
            <div className="flex gap-2">
              <Auswahl
                id="route-ziel"
                className="w-36"
                value={z}
                onValueChange={(w) => {
                  setZielArt(w as StartArt | 'keins')
                }}
                optionen={[
                  ...(personen.data?.find((p) => p.id === person)?.heim
                    ? [{ wert: 'heim', text: t('verkauf.route.zuhause') }]
                    : []),
                  { wert: 'muri', text: 'Muri' },
                  { wert: 'bulle', text: 'Bulle' },
                  { wert: 'andere', text: t('verkauf.route.andere') },
                  { wert: 'keins', text: t('verkauf.route.keinZiel') },
                ]}
              />
              {z === 'andere' && (
                <Input
                  aria-label={t('verkauf.route.andereAdresse')}
                  value={zielAndere}
                  onChange={(ev) => {
                    setZielAndere(ev.target.value)
                  }}
                />
              )}
            </div>
          </Feld>
          <Feld id="route-abfahrt" label={t('verkauf.route.abfahrtUm')} hinweis={t('verkauf.route.abfahrtHinweis')}>
            <Input
              id="route-abfahrt"
              type="time"
              step={900}
              value={abfahrt}
              onChange={(ev) => {
                setAbfahrt(ev.target.value)
              }}
            />
          </Feld>
        </div>

        <div className="bg-surface rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">{t('verkauf.route.titelTag', { datum: formatDatum(datum) })}</h2>
          {!start ? (
            <p className="text-muted-foreground text-sm">{t('verkauf.route.startFehlt')}</p>
          ) : fixe.length === 0 && dazu.size === 0 ? (
            <Leerzustand
              icon={RouteIcon}
              titel={t('verkauf.route.keineTermine')}
              text={t('verkauf.route.keineTermineText')}
            />
          ) : (
            ergebnis && (
              <RoutenAblauf
                ablauf={ergebnis.ablauf}
                start={start}
                ziel={ziel}
                datum={formatDatum(datum)}
                onOeffnen={onOeffnen}
                onFahrzeit={(k, m) => {
                  setFahrzeiten((alt) => ({
                    ...Object.fromEntries(Object.entries(alt).filter(([x]) => x !== k)),
                    ...(m === null ? {} : { [k]: m }),
                  }))
                }}
              />
            )
          )}
          {ergebnis && ergebnis.passtNicht.length > 0 && (
            <p className="text-warn mt-2 text-xs">
              {t('verkauf.route.passtNicht', { namen: ergebnis.passtNicht.map((x) => x.name).join(', ') })}
            </p>
          )}
        </div>

        {inDerNaehe.length > 0 && (
          <div className="bg-surface rounded-xl border p-4">
            <h2 className="mb-1 text-sm font-semibold">{t('verkauf.route.ergaenzen')}</h2>
            <p className="text-muted-foreground mb-2 text-xs">{t('verkauf.route.ergaenzenText')}</p>
            <ul className="flex flex-col">
              {inDerNaehe.map(({ g, km: d }) => (
                <li key={g.id} className="flex items-center gap-2 py-1 text-sm">
                  <Checkbox
                    checked={dazu.has(g.id)}
                    aria-label={g.name}
                    onCheckedChange={(an) => {
                      setDazu((alt) => {
                        const neu = new Set(alt)
                        if (an === true) neu.add(g.id)
                        else neu.delete(g.id)
                        return neu
                      })
                    }}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:underline"
                    onClick={() => {
                      onOeffnen(g.id)
                    }}
                  >
                    {g.name}{' '}
                    <span className="text-muted-foreground text-xs">· {[g.plz, g.ort].filter(Boolean).join(' ')}</span>
                  </button>
                  <span className="zahlen text-muted-foreground font-mono text-xs">{Math.round(d)} km</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Karte
        beschriftung={t('verkauf.karte.route')}
        punkte={punkte ?? []}
        linie={linie}
        onKlick={onOeffnen}
        className="h-[28rem] lg:sticky lg:top-4 lg:h-[calc(100vh-14rem)]"
      />
    </div>
  )
}
