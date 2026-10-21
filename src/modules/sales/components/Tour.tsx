import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ClipboardPaste, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAussendienst, useKalender, useTourEinstellungen } from '../hooks/useVerkauf'
import { planeAblauf, type Stopp } from '../lib/ablauf'
import { heuteIso } from '../lib/geschaeft'
import { plzAusOrt } from '../lib/kalenderdatei'
import { hm, optimiere, STANDARD_TOUR, zuMinuten, type Belegt } from '../lib/route'
import { alsStopp, ausKalender } from '../lib/stopps'
import { ladeLagen } from '../services/planung'
import type { Geschaeft } from '../types'
import { Karte } from './Karte'
import { RoutenAblauf } from './RoutenAblauf'
import { useStartOrt, type StartArt } from '../hooks/useStartOrt'
import { StartWahl } from './StartWahl'
import { TourAuswahl } from './TourAuswahl'

/** Eine eingefügte Zeile: «Name; Strasse, PLZ Ort» oder nur die Adresse. */
function leseZeilen(text: string) {
  return text
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z, i) => {
      const trenner = z.includes(';') ? ';' : z.includes('\t') ? '\t' : null
      const teile = trenner ? z.split(trenner).map((x) => x.trim()) : []
      const adresse = teile.length > 1 ? teile.slice(1).join(' ') : z
      return {
        id: `adr-${i}`,
        name: teile.length > 1 ? (teile[0] ?? adresse) : adresse,
        adresse,
        plz: plzAusOrt(adresse) ?? /\b(\d{4})\b/.exec(adresse)?.[1] ?? null,
      }
    })
}

/**
 * Tour planen (V233): Leads nach Stand, Person und Region wählen oder Adressen einfügen, Reihenfolge
 * optimieren oder von Hand ordnen, feste Uhrzeiten setzen. Erreichbarkeit der Kunden und belegte Zeiten
 * aus dem Kalender fliessen in die Zeiten ein.
 */
export default function Tour({ geschaefte, onOeffnen }: { geschaefte: Geschaeft[]; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const einstellungen = useTourEinstellungen()
  const ich = useAnmeldung((z) => z.ich?.id ?? '')
  const e = einstellungen.data ?? STANDARD_TOUR
  const [personWahl, setPerson] = useState<string | null>(null)
  const person = personWahl ?? (personen.data?.some((p) => p.id === ich) ? ich : (personen.data?.[0]?.id ?? ''))
  const [datum, setDatum] = useState(heuteIso())
  const [startArt, setStartArt] = useState<StartArt>('muri')
  const [andere, setAndere] = useState('')
  const [rundreise, setRundreise] = useState(true)
  const [reihe, setReihe] = useState<string[]>([])
  const [fix, setFix] = useState<Record<string, string>>({})
  const [fahrzeiten, setFahrzeiten] = useState<Record<string, number>>({})
  const [einfuegen, setEinfuegen] = useState('')
  const [eingefuegt, setEingefuegt] = useState<ReturnType<typeof leseZeilen>>([])
  const start = useStartOrt(startArt, andere, person)
  const kalender = useKalender(`${datum}T00:00:00`, `${datum}T23:59:59`)
  const lagen = useQuery({
    queryKey: ['plz', 'tour', eingefuegt.map((x) => x.plz).join(',')],
    queryFn: () => ladeLagen(eingefuegt.map((x) => x.plz).filter((p): p is string => !!p)),
    enabled: eingefuegt.length > 0,
  })

  const stopps = useMemo(() => {
    const karte = new Map<string, Stopp>()
    for (const g of geschaefte) {
      if (!reihe.includes(g.id)) continue
      const s = alsStopp(g, e.besuch_min)
      if (s) karte.set(g.id, s)
    }
    for (const a of eingefuegt) {
      const l = a.plz ? lagen.data?.get(a.plz) : undefined
      if (l)
        karte.set(a.id, {
          id: a.id,
          name: a.name,
          adresse: a.adresse,
          breite: l.breite,
          laenge: l.laenge,
          fix: null,
          besuchMin: e.besuch_min,
        })
    }
    return reihe
      .map((id) => karte.get(id))
      .filter((s): s is Stopp => s !== undefined)
      .map((s) => ({ ...s, fix: zuMinuten(fix[s.id]) }))
  }, [geschaefte, eingefuegt, lagen.data, reihe, fix, e.besuch_min])
  const nichtGefunden = eingefuegt.filter((a) => lagen.isSuccess && !(a.plz && lagen.data.get(a.plz)))

  const belegt = useMemo<Belegt[]>(
    () =>
      (kalender.data ?? [])
        .filter((k) => k.personId === person)
        .map((k) => ausKalender({ ...k, breite: null, laenge: null }).belegt)
        .filter((b): b is Belegt => b !== null),
    [kalender.data, person],
  )
  const ziel = rundreise ? start : null
  const ablauf = start && stopps.length ? planeAblauf({ start, stopps, ziel, e, belegt, fahrzeiten }) : null

  const waehle = (id: string, an: boolean) => {
    setReihe((alt) => (an ? [...alt.filter((x) => x !== id), id] : alt.filter((x) => x !== id)))
  }
  const schiebe = (i: number, um: number) => {
    setReihe((alt) => {
      const neu = [...alt]
      const [x] = neu.splice(i, 1)
      if (x) neu.splice(i + um, 0, x)
      return neu
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <Feld id="tour-person" label={t('verkauf.person')}>
            <Auswahl
              id="tour-person"
              value={person}
              onValueChange={setPerson}
              optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
            />
          </Feld>
          <Feld id="tour-datum" label={t('verkauf.route.datum')} hinweis={t('verkauf.tour.datumHinweis')}>
            <Input
              id="tour-datum"
              type="date"
              value={datum}
              onChange={(ev) => {
                setDatum(ev.target.value)
              }}
            />
          </Feld>
          <StartWahl
            id="tour-start"
            label={t('verkauf.route.start')}
            art={startArt}
            andere={andere}
            personId={person}
            onArt={setStartArt}
            onAndere={setAndere}
          />
          <Feld id="tour-ziel" label={t('verkauf.route.ziel')}>
            <Auswahl
              id="tour-ziel"
              value={rundreise ? 'zurueck' : 'keins'}
              onValueChange={(w) => {
                setRundreise(w === 'zurueck')
              }}
              optionen={[
                { wert: 'zurueck', text: t('verkauf.tour.zurueck') },
                { wert: 'keins', text: t('verkauf.route.keinZiel') },
              ]}
            />
          </Feld>
        </div>

        <details className="bg-surface rounded-xl border p-4" open={eingefuegt.length > 0 || undefined}>
          <summary className="cursor-pointer text-sm font-semibold">{t('verkauf.tour.einfuegen')}</summary>
          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              rows={4}
              aria-label={t('verkauf.tour.einfuegen')}
              placeholder={t('verkauf.tour.einfuegenBeispiel')}
              value={einfuegen}
              onChange={(ev) => {
                setEinfuegen(ev.target.value)
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              className="self-start"
              disabled={!einfuegen.trim()}
              onClick={() => {
                const z = leseZeilen(einfuegen)
                setEingefuegt(z)
                setReihe((alt) => [...alt.filter((id) => !id.startsWith('adr-')), ...z.map((x) => x.id)])
              }}
            >
              <ClipboardPaste />
              {t('verkauf.tour.uebernehmen')}
            </Button>
            {nichtGefunden.length > 0 && (
              <p className="text-warn text-xs">
                {t('verkauf.tour.nichtGefunden', { zeilen: nichtGefunden.map((a) => a.adresse).join(' · ') })}
              </p>
            )}
          </div>
        </details>

        <div className="bg-surface rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-semibold">{t('verkauf.tour.leadsWaehlen')}</h2>
          <TourAuswahl geschaefte={geschaefte} gewaehlt={new Set(reihe)} onWahl={waehle} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Karte
          beschriftung={t('verkauf.karte.tour')}
          punkte={stopps.map((s, i) => ({
            id: s.id,
            breite: s.breite,
            laenge: s.laenge,
            titel: s.name,
            ton: s.fix !== null ? 'primary' : 'accent',
            nummer: i + 1,
          }))}
          linie={
            start
              ? [
                  [start.breite, start.laenge],
                  ...stopps.map((s): [number, number] => [s.breite, s.laenge]),
                  ...(ziel ? [[ziel.breite, ziel.laenge] as [number, number]] : []),
                ]
              : []
          }
          onKlick={(id) => {
            if (!id.startsWith('adr-')) onOeffnen(id)
          }}
          className="h-80"
        />
        <div className="bg-surface rounded-xl border p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t('verkauf.tour.reihenfolge', { count: stopps.length })}</h2>
            <Button
              size="sm"
              disabled={!start || stopps.length < 2}
              onClick={() => {
                if (!start) return
                // Feste Uhrzeiten bleiben in ihrer Reihenfolge; nur die freien Halte werden umgestellt.
                const frei = stopps.filter((s) => s.fix === null)
                const fest = stopps.filter((s) => s.fix !== null).sort((a, b) => (a.fix ?? 0) - (b.fix ?? 0))
                const neu = [...optimiere(start, frei, ziel), ...fest]
                setReihe(neu.map((s) => s.id))
              }}
            >
              <Sparkles />
              {t('verkauf.tour.optimieren')}
            </Button>
          </div>
          <ol className="mb-3 flex flex-col">
            {stopps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 border-b py-1 text-sm last:border-b-0">
                <span className="text-muted-foreground w-5 text-right text-xs">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <Input
                  type="time"
                  step={900}
                  aria-label={t('verkauf.tour.festeZeit', { name: s.name })}
                  className="h-7 w-24 text-xs"
                  value={fix[s.id] ?? ''}
                  onChange={(ev) => {
                    setFix((alt) => ({ ...alt, [s.id]: ev.target.value }))
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={t('verkauf.tour.hoch')}
                  disabled={i === 0}
                  onClick={() => {
                    schiebe(i, -1)
                  }}
                >
                  <ArrowUp />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={t('verkauf.tour.runter')}
                  disabled={i === stopps.length - 1}
                  onClick={() => {
                    schiebe(i, 1)
                  }}
                >
                  <ArrowDown />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={t('verkauf.tour.entfernen')}
                  onClick={() => {
                    waehle(s.id, false)
                  }}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ol>
          {belegt.length > 0 && (
            <p className="text-muted-foreground mb-2 text-xs">
              {t('verkauf.tour.belegt', {
                zeiten: belegt.map((b) => `${hm(b.start)}–${hm(b.ende)} ${b.betreff}`).join(', '),
              })}
            </p>
          )}
          {ablauf && start ? (
            <RoutenAblauf
              ablauf={ablauf}
              start={start}
              ziel={ziel}
              datum={datum.split('-').reverse().join('.')}
              onOeffnen={(id) => {
                if (!id.startsWith('adr-')) onOeffnen(id)
              }}
              onFahrzeit={(k, m) => {
                setFahrzeiten((alt) => ({
                  ...Object.fromEntries(Object.entries(alt).filter(([x]) => x !== k)),
                  ...(m === null ? {} : { [k]: m }),
                }))
              }}
            />
          ) : (
            <p className="text-muted-foreground text-sm">{t('verkauf.tour.leer')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
