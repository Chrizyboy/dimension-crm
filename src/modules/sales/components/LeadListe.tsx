import { ChevronRight, SearchX } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { cn } from '@/lib/utils'
import { useAussendienst } from '../hooks/useVerkauf'
import type { GespeicherteAnsicht } from '../services/planung'
import type { Geschaeft, VerkaufFilter } from '../types'
import { AnsichtenMenue } from './AnsichtenMenue'
import { geschaeftSpalten } from './geschaeftSpalten'
import { LeadZeile } from './LeadZeile'
import { Sammelaenderung } from './Sammelaenderung'

interface LeadListeProps {
  geschaefte: Geschaeft[]
  filter: VerkaufFilter
  onFilter: (f: VerkaufFilter) => void
  aktiveId: string | null
  onOeffnen: (id: string) => void
}

type Art = 'abschnitte' | 'tabelle'

/** Abschnitte wie in V233: oben was heute zu tun ist, unten Erledigtes zugeklappt. */
const ABSCHNITTE = [
  { id: 'offen', staende: ['lead_neu', 'lead_offen'], sort: 'eingang', zu: false },
  { id: 'termin', staende: ['termin', 'nach_termin'], sort: 'termin', zu: false },
  { id: 'nachfassen', staende: ['lead_spaeter'], sort: 'wieder', zu: false },
  { id: 'offerte', staende: ['offerte', 'pruefung'], sort: 'eingang', zu: false },
  { id: 'kein', staende: ['kein'], sort: 'datum', zu: true },
] as const

function sortiere(liste: Geschaeft[], nach: (typeof ABSCHNITTE)[number]['sort']): Geschaeft[] {
  const wert = (g: Geschaeft) =>
    nach === 'eingang'
      ? (g.eingangAm ?? '')
      : nach === 'termin'
        ? (g.terminAm ?? '')
        : nach === 'wieder'
          ? (g.wiedervorlageAm ?? '')
          : (g.standDatum ?? '')
  const umgekehrt = nach === 'datum'
  return [...liste].sort((a, b) => (umgekehrt ? wert(b).localeCompare(wert(a)) : wert(a).localeCompare(wert(b))))
}

/**
 * Lead-Liste (V233 «Leads»): Abschnitte «Neu & offen», «Termin», «Nachfassen» mit «in X Tagen»,
 * «Zur Offerte» und «Kein Interesse» (zugeklappt). Mehrere ankreuzen ändert sie zusammen.
 * Umschaltbar auf eine Tabelle über alle Geschäfte; beides lässt sich als Ansicht speichern.
 */
export default function LeadListe({ geschaefte, filter, onFilter, aktiveId, onOeffnen }: LeadListeProps) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const staende = useAuswahl('kundenstand')
  const quellen = useAuswahl('quelle')
  const [art, setArt] = useState<Art>('abschnitte')
  const [zu, setZu] = useState<Record<string, boolean>>({ kein: true })
  const [wahl, setWahl] = useState<Set<string>>(new Set())

  const vorname = useMemo(() => new Map((personen.data ?? []).map((p) => [p.id, p.vorname])), [personen.data])
  const abschnitte = useMemo(
    () =>
      ABSCHNITTE.map((a) => ({
        ...a,
        zeilen: sortiere(
          geschaefte.filter((g) => g.verkaufschanceId && (a.staende as readonly string[]).includes(g.stand)),
          a.sort,
        ),
      })),
    [geschaefte],
  )
  // Mehrfachauswahl wie V66: Klick aufs Kästchen oder Strg-Klick wählt eine Zeile, Shift-Klick alle
  // Zeilen bis zur zuletzt gewählten.
  const reihenfolge = useMemo(() => abschnitte.flatMap((a) => a.zeilen.map((g) => g.id)), [abschnitte])
  const letzte = useRef<string | null>(null)
  const waehle = useCallback(
    (id: string, an: boolean, bereich: boolean) => {
      setWahl((alt) => {
        const neu = new Set(alt)
        const von = letzte.current ? reihenfolge.indexOf(letzte.current) : -1
        const bis = reihenfolge.indexOf(id)
        if (bereich && von >= 0 && bis >= 0)
          for (const x of reihenfolge.slice(Math.min(von, bis), Math.max(von, bis) + 1)) neu.add(x)
        else if (an) neu.add(id)
        else neu.delete(id)
        return neu
      })
      letzte.current = id
    },
    [reihenfolge],
  )
  const spalten = useMemo(
    () =>
      geschaeftSpalten(
        t,
        staende.finde,
        (liste, s) => (liste === 'quelle' ? quellen.text(s) : staende.text(s)),
        (id) => (id ? (vorname.get(id) ?? '–') : '–'),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Texte ändern sich mit den geladenen Listen
    [t, staende.werte, quellen.werte, vorname],
  )
  const gewaehlt = geschaefte.filter((g) => wahl.has(g.id))
  const aktuell: GespeicherteAnsicht['einstellungen'] = { filter, art }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          beschriftung={t('verkauf.liste.darstellung')}
          einzeln
          optionen={[
            { wert: 'abschnitte', text: t('verkauf.liste.abschnitte') },
            { wert: 'tabelle', text: t('verkauf.liste.tabelle') },
          ]}
          gewaehlt={[art]}
          onChange={(w) => {
            setArt((w[0] as Art | undefined) ?? 'abschnitte')
          }}
        />
        <AnsichtenMenue
          aktuell={aktuell}
          onWaehlen={(e) => {
            onFilter(e.filter)
            setArt(e.art)
          }}
        />
      </div>

      {art === 'tabelle' ? (
        <Datentabelle
          beschriftung={t('verkauf.liste.tabelle')}
          daten={geschaefte}
          spalten={spalten}
          kennung={(g) => g.id}
          aktiveId={aktiveId}
          onOeffnen={(g) => {
            onOeffnen(g.id)
          }}
          sortierung={[{ id: 'datum', desc: true }]}
          leer={<Leerzustand icon={SearchX} titel={t('verkauf.keineTreffer')} text={t('verkauf.keineTrefferText')} />}
        />
      ) : (
        abschnitte.map((a) => {
          const offen = !(zu[a.id] ?? a.zu)
          const alleGewaehlt = a.zeilen.length > 0 && a.zeilen.every((g) => wahl.has(g.id))
          return (
            <section
              key={a.id}
              className="bg-surface overflow-hidden rounded-xl border"
              aria-labelledby={`abschnitt-${a.id}`}
            >
              <header className="bg-muted/40 flex items-center gap-3 border-b px-3 py-2">
                <Checkbox
                  checked={alleGewaehlt}
                  disabled={a.zeilen.length === 0}
                  aria-label={t('verkauf.liste.alleWaehlen')}
                  onCheckedChange={(an) => {
                    for (const g of a.zeilen) waehle(g.id, an === true, false)
                  }}
                />
                <button
                  type="button"
                  aria-expanded={offen}
                  onClick={() => {
                    setZu((z) => ({ ...z, [a.id]: offen }))
                  }}
                  className="focus-visible:ring-ring flex flex-1 items-center gap-2 rounded text-left outline-none focus-visible:ring-2"
                >
                  <ChevronRight
                    className={cn('text-muted-foreground size-4 transition-transform', offen && 'rotate-90')}
                    aria-hidden="true"
                  />
                  <h2 id={`abschnitt-${a.id}`} className="text-sm font-semibold">
                    {t(`verkauf.abschnitt.${a.id}`)}
                  </h2>
                  <span className="zahlen text-muted-foreground font-mono text-xs">{a.zeilen.length}</span>
                </button>
              </header>
              {offen &&
                (a.zeilen.length === 0 ? (
                  <p className="text-muted-foreground px-4 py-3 text-sm">{t('verkauf.liste.leer')}</p>
                ) : (
                  <ul>
                    {a.zeilen.map((g) => (
                      <LeadZeile
                        key={g.id}
                        g={g}
                        gewaehlt={wahl.has(g.id)}
                        aktiv={g.id === aktiveId}
                        person={vorname.get(g.terminPersonId ?? g.personId ?? '') ?? null}
                        onWahl={waehle}
                        onOeffnen={onOeffnen}
                      />
                    ))}
                  </ul>
                ))}
            </section>
          )
        })
      )}

      {gewaehlt.length > 0 && (
        <Sammelaenderung
          gewaehlt={gewaehlt}
          onFertig={() => {
            setWahl(new Set())
          }}
        />
      )}
    </div>
  )
}
