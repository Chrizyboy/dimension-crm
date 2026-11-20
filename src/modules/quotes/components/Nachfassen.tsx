import { BellRing, CalendarClock, X } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { FilterBereich } from '@/components/shared/FilterBereich'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { formatChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useAnmeldung } from '@/stores/anmeldung'
import { useOffertAenderung } from '../hooks/useOfferten'
import {
  BETRAG_STUFEN,
  FAELLIG_SEIT,
  nachfassKennzahlen,
  nachfassPersonen,
  nachfassStand,
  passtFaelligSeit,
  sortiereNachfassen,
  type FaelligSeit,
  type NachfassSortierung,
} from '../lib/nachfassen'
import { imNachfassen } from '../lib/suche'
import { erfasseNachfassen } from '../services/ablauf'
import type { Offerte } from '../types'
import type { Entscheid } from './EntscheidDialog'
import { NachfassDialoge, type NachfassWahl } from './NachfassDialoge'
import { NachfassZeile, type NachfassAktion } from './NachfassZeile'

const EntscheidDialog = lazy(() => import('./EntscheidDialog'))

const SEITE = 50
const SORTIERUNGEN: readonly NachfassSortierung[] = ['neu', 'alt', 'betrag', 'name', 'nr']

/** Filtergruppe mit sichtbarer Überschrift: sonst stehen drei «Alle» nebeneinander, ohne dass man weiss, wofür. */
function Gruppe({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{titel}</span>
      {children}
    </div>
  )
}

function Kennzahl({ titel, wert }: { titel: string; wert: string | number }) {
  return (
    <div className="bg-surface rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{titel}</p>
      <p className="zahlen font-display text-xl font-semibold whitespace-nowrap md:text-2xl">{wert}</p>
    </div>
  )
}

/**
 * Nachfassen (V45, V193): versendete Offerten 14 Tage nach dem Angebot oder am vertagten Datum.
 * Filter nach Standort, «fällig seit» (auch bald fällige), Betrag ab, Person (mit Zahl, wie V234); die Suche oben gilt für alle Reiter;
 * je Zeile Ergebnis, Angenommen, Abgelehnt, Vertagt und unter «⋯» nicht erreicht, Nachfass-Mail, Bereits verbaut,
 * Zurück zur Offerte; Mehrfachauswahl für mehrere auf einmal. Zeigt 50, dann «Weitere laden».
 */
export default function Nachfassen({ offerten, onOeffnen }: { offerten: Offerte[]; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const [standort, setStandort] = useState('alle')
  const [seit, setSeit] = useState<FaelligSeit>('alle')
  const [person, setPerson] = useState('alle')
  const [betragAb, setBetragAb] = useState(0)
  const [sortierung, setSortierung] = useState<NachfassSortierung>('alt')
  const [anzahl, setAnzahl] = useState(SEITE)
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<{ ziel: Entscheid; liste: Offerte[] } | null>(null)
  const [einzeln, setEinzeln] = useState<{ wahl: NachfassWahl; o: Offerte } | null>(null)
  const nichtErreicht = useOffertAenderung((id: string) => erfasseNachfassen(id, 'nicht_erreicht'))
  const zu = () => {
    setEinzeln(null)
  }

  /** Knopf einer Zeile: Entscheide über den Entscheid-Dialog, der Rest direkt oder im eigenen Dialog. */
  function aktion(o: Offerte, a: NachfassAktion) {
    if (a === 'nicht_erreicht') {
      nichtErreicht.mutate(o.id, {
        onError: (e) => {
          meldeFehler(e)
        },
      })
    } else setEinzeln({ wahl: a, o })
  }

  const offen = useMemo(() => offerten.filter(imNachfassen), [offerten])
  const kennzahlen = nachfassKennzahlen(offen)
  // Jeder Filter zählt die Chips der anderen mit (V234): so sieht man, wie viele bei «Loris» übrig bleiben.
  const passt = useMemo(() => {
    const p = (o: Offerte, ohne?: 'person' | 'betrag' | 'seit') =>
      (standort === 'alle' || o.standort === standort) &&
      (ohne === 'seit' || passtFaelligSeit(nachfassStand(o), seit)) &&
      (ohne === 'person' ||
        person === 'alle' ||
        (person === 'meine' ? o.verantwortlichId === ich?.id : (o.verantwortlichId ?? 'niemand') === person)) &&
      (ohne === 'betrag' || (o.betragRappen ?? 0) >= betragAb)
    return p
  }, [standort, seit, person, ich?.id, betragAb])
  const liste = useMemo(
    () =>
      sortiereNachfassen(
        offen.filter((o) => passt(o)),
        sortierung,
      ),
    [offen, passt, sortierung],
  )
  const personen = nachfassPersonen(offen.filter((o) => passt(o, 'person')))
  const gewaehlt = liste.filter((o) => auswahl.has(o.id))

  return (
    <div className="flex flex-col gap-4">
      {/* Kacheln mit 0 bleiben weg (Entscheid 0058): nur was etwas sagt. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
        <Kennzahl titel={t('offerten.nachfassen.kFaellig')} wert={kennzahlen.faellig} />
        {kennzahlen.heute > 0 && <Kennzahl titel={t('offerten.nachfassen.kHeute')} wert={kennzahlen.heute} />}
        {kennzahlen.bald > 0 && <Kennzahl titel={t('offerten.nachfassen.kBald')} wert={kennzahlen.bald} />}
        <Kennzahl
          titel={t('offerten.nachfassen.kSumme')}
          // Auf Franken gerundet, damit die Summe in die Kachel passt.
          wert={formatChf(Math.round(kennzahlen.summeRappen / 100) * 100, { mitWaehrung: true }).replace(/\.00$/, '')}
        />
        <Kennzahl
          titel={t('offerten.nachfassen.kSchnitt')}
          wert={t('offerten.nachfassen.tage', { count: kennzahlen.schnittTage })}
        />
        {kennzahlen.ueber180 > 0 && <Kennzahl titel={t('offerten.nachfassen.k180')} wert={kennzahlen.ueber180} />}
      </div>

      <FilterBereich
        aktiv={[seit !== 'alle', betragAb > 0, person !== 'alle'].filter(Boolean).length}
        onZuruecksetzen={() => {
          setSeit('alle')
          setBetragAb(0)
          setPerson('alle')
        }}
        vorne={
          <>
            <Gruppe titel={t('offerten.nachfassen.standort')}>
              <Filterchips
                einzeln
                beschriftung={t('offerten.nachfassen.standort')}
                gewaehlt={[standort]}
                onChange={(w) => {
                  setStandort(w[0] ?? 'alle')
                }}
                optionen={['alle', 'muri', 'bulle'].map((s) => ({ wert: s, text: t(`offerten.standort.${s}`) }))}
              />
            </Gruppe>
            <Feld id="nachfassen-sort" label={t('offerten.nachfassen.sortierung')} className="w-44">
              <Auswahl
                id="nachfassen-sort"
                value={sortierung}
                onValueChange={(v) => {
                  setSortierung(v as NachfassSortierung)
                }}
                optionen={SORTIERUNGEN.map((s) => ({ wert: s, text: t(`offerten.nachfassen.sort_${s}`) }))}
              />
            </Feld>
          </>
        }
      >
        <Gruppe titel={t('offerten.nachfassen.seit')}>
          <Filterchips
            einzeln
            beschriftung={t('offerten.nachfassen.seit')}
            gewaehlt={[seit]}
            onChange={(w) => {
              setSeit((w[0] as FaelligSeit | undefined) ?? 'alle')
            }}
            optionen={FAELLIG_SEIT.map((s) => ({
              wert: s,
              text: t(`offerten.nachfassen.seit_${s}`),
              anzahl: offen.filter((o) => passtFaelligSeit(nachfassStand(o), s)).length,
            }))}
          />
        </Gruppe>
        <Gruppe titel={t('offerten.nachfassen.betrag')}>
          <Filterchips
            einzeln
            beschriftung={t('offerten.nachfassen.betrag')}
            gewaehlt={[String(betragAb)]}
            onChange={(w) => {
              setBetragAb(Number(w[0] ?? 0))
            }}
            optionen={BETRAG_STUFEN.map((b) => ({
              wert: String(b),
              text: b
                ? t('offerten.nachfassen.ab', { betrag: formatChf(b).replace(/\.00$/, '') })
                : t('offerten.nachfassen.alle'),
              anzahl: offen.filter((o) => passt(o, 'betrag') && (o.betragRappen ?? 0) >= b).length,
            }))}
          />
        </Gruppe>
        <Gruppe titel={t('offerten.nachfassen.person')}>
          <Filterchips
            einzeln
            beschriftung={t('offerten.nachfassen.person')}
            gewaehlt={[person]}
            onChange={(w) => {
              setPerson(w[0] ?? 'alle')
            }}
            optionen={[
              { wert: 'alle', text: t('offerten.nachfassen.alle'), anzahl: personen.reduce((n, p) => n + p.anzahl, 0) },
              ...(ich
                ? [
                    {
                      wert: 'meine',
                      text: t('offerten.nachfassen.meine'),
                      anzahl: personen.find((p) => p.id === ich.id)?.anzahl ?? 0,
                    },
                  ]
                : []),
              ...personen
                .filter((p) => p.id !== ich?.id)
                .map((p) => ({
                  wert: p.id ?? 'niemand',
                  text: p.id ? p.name : t('offerten.nachfassen.niemand'),
                  anzahl: p.anzahl,
                })),
            ]}
          />
        </Gruppe>
      </FilterBereich>

      {gewaehlt.length > 0 && (
        <div
          className="bg-muted flex flex-wrap items-center gap-2 rounded-lg p-2 text-sm"
          role="region"
          aria-label={t('offerten.eingang.sammel')}
        >
          <span className="px-1 font-medium">{t('offerten.eingang.gewaehlt', { count: gewaehlt.length })}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDialog({ ziel: 'vertagt', liste: gewaehlt })
            }}
          >
            <CalendarClock />
            {t('offerten.nachfassen.vertagen')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDialog({ ziel: 'verloren', liste: gewaehlt })
            }}
          >
            <X />
            {t('offerten.nachfassen.abgelehnt')}
          </Button>
        </div>
      )}

      {liste.length === 0 ? (
        <Leerzustand icon={BellRing} titel={t('offerten.nachfassen.leer')} text={t('offerten.nachfassen.leerText')} />
      ) : (
        <ul className="bg-surface divide-y rounded-xl border" aria-label={t('offerten.ansicht.nachfassen')}>
          {liste.slice(0, anzahl).map((o) => (
            <NachfassZeile
              key={o.id}
              o={o}
              gewaehlt={auswahl.has(o.id)}
              onWaehlen={(an) => {
                const neu = new Set(auswahl)
                if (an) neu.add(o.id)
                else neu.delete(o.id)
                setAuswahl(neu)
              }}
              onOeffnen={() => {
                onOeffnen(o.id)
              }}
              laedt={nichtErreicht.isPending && nichtErreicht.variables === o.id}
              onAktion={(a) => {
                aktion(o, a)
              }}
            />
          ))}
        </ul>
      )}
      {liste.length > anzahl && (
        <Button
          variant="secondary"
          className="self-center"
          onClick={() => {
            setAnzahl(anzahl + SEITE)
          }}
        >
          {t('offerten.nachfassen.weitere', { count: liste.length - anzahl })}
        </Button>
      )}

      <Suspense>
        <NachfassDialoge offen={einzeln} onSchliessen={zu} />
        {dialog && (
          <EntscheidDialog
            offerten={dialog.liste}
            ziel={dialog.ziel}
            onSchliessen={(ok) => {
              if (ok) setAuswahl(new Set())
              setDialog(null)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
