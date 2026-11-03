import { HardHat, LayoutGrid, List } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatChf } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useLieferfrist, useProjekte, useSignale, useStandorte } from '../hooks/useProjekte'
import { hinweise, heuteIso, nachPhase, nochOffen, trifft, woche } from '../lib/leitstand'
import { PHASEN, SCHNELLFILTER, type Projekt, type Schnellfilter, type Signale } from '../types'
import { Kennzahlen } from './Kennzahlen'
import { LeitstandKarte } from './LeitstandKarte'
import { projektSpalten } from './projektSpalten'

const STATUS = ['auftrag', 'im_bau', 'abgeschlossen'] as const

/**
 * Leitstand der Projekte: Kennzahlen (setzen den Filter), Suche, Schnellfilter und Standort, alle laufenden
 * Projekte als Board nach Phase oder als Liste. Jede Karte sagt, was blockiert oder als Nächstes ansteht.
 */
export function Leitstand({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich?.id ?? null)
  const projekte = useProjekte([...STATUS])
  const signale = useSignale()
  const lieferfrist = useLieferfrist().data
  const standorte = useStandorte()
  const [ansicht, setAnsicht] = useState<'board' | 'liste'>('board')
  const [filter, setFilter] = useState<Schnellfilter[]>([])
  const [orte, setOrte] = useState<string[]>([])
  const [suche, setSuche] = useState('')
  const heute = heuteIso()
  const sig = useMemo(() => signale.data ?? new Map<string, Signale>(), [signale.data])

  const laufend = useMemo(
    () => (projekte.data ?? []).filter((p) => nochOffen(p, heute, sig.get(p.id))),
    [projekte.data, heute, sig],
  )
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return laufend.filter(
      (p) =>
        filter.every((f) => trifft(p, sig.get(p.id), f, ich, heute, lieferfrist)) &&
        (orte.length === 0 || (p.standort_id != null && orte.includes(p.standort_id))) &&
        (!s ||
          [p.nummer, p.kunde, p.ort, p.plz, p.strasse, p.elektriker, p.verantwortlich]
            .join(' ')
            .toLowerCase()
            .includes(s)),
    )
  }, [laufend, filter, orte, suche, sig, ich, heute, lieferfrist])
  const spalten = useMemo(() => nachPhase(daten, sig, heute, lieferfrist), [daten, sig, heute, lieferfrist])
  const tabelle = useMemo(() => projektSpalten(t), [t])

  if (projekte.error)
    return <Fehlerzustand details={String(projekte.error)} onNochmal={() => void projekte.refetch()} />

  const aktiv = laufend.filter((p) => p.status !== 'abgeschlossen')
  const zaehle = (f: Schnellfilter) =>
    laufend.filter((p) => trifft(p, sig.get(p.id), f, ich, heute, lieferfrist)).length
  const w = woche(heute)
  const nur = (f: Schnellfilter) => () => {
    setFilter(filter.length === 1 && filter[0] === f ? [] : [f])
  }
  const verrechnen = laufend.reduce((s, p) => s + (sig.get(p.id)?.tranchen_faellig_rappen ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <Kennzahlen
        zahlen={[
          {
            id: 'laufend',
            wert: aktiv.length,
            aktiv: filter.length === 0,
            onKlick: () => {
              setFilter([])
            },
          },
          {
            id: 'ohne_termin',
            wert: zaehle('ohne_termin'),
            ton: 'warnung',
            aktiv: filter.includes('ohne_termin'),
            onKlick: nur('ohne_termin'),
          },
          {
            id: 'spaet',
            wert: zaehle('spaet'),
            ton: 'kritisch',
            aktiv: filter.includes('spaet'),
            onKlick: nur('spaet'),
          },
          {
            id: 'bewilligung',
            wert: zaehle('bewilligung'),
            ton: 'kritisch',
            aktiv: filter.includes('bewilligung'),
            onKlick: nur('bewilligung'),
          },
          {
            id: 'material',
            wert: zaehle('material'),
            ton: 'warnung',
            aktiv: filter.includes('material'),
            onKlick: nur('material'),
          },
          {
            id: 'woche',
            wert: laufend.filter((p) => {
              const e = sig.get(p.id)?.naechster_einsatz ?? p.baubeginn
              return e != null && e >= w.von && e <= w.bis
            }).length,
          },
          {
            id: 'verrechnen',
            wert: verrechnen > 0 ? `CHF ${formatChf(verrechnen).replace(/\.\d\d$/, '')}` : 0,
            ton: 'warnung',
            aktiv: filter.includes('verrechnen'),
            onKlick: nur('verrechnen'),
          },
        ]}
      />
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('projekte.leitstand.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={
          <div className="flex gap-1" role="group" aria-label={t('projekte.leitstand.ansicht')}>
            {(['board', 'liste'] as const).map((a) => (
              <Button
                key={a}
                size="sm"
                variant={ansicht === a ? 'secondary' : 'ghost'}
                aria-pressed={ansicht === a}
                onClick={() => {
                  setAnsicht(a)
                }}
              >
                {a === 'board' ? <LayoutGrid /> : <List />}
                {t(`projekte.leitstand.${a}`)}
              </Button>
            ))}
          </div>
        }
      >
        <Filterchips
          beschriftung={t('projekte.leitstand.filter')}
          optionen={SCHNELLFILTER.map((x) => ({ wert: x, text: t(`projekte.schnell.${x}`), anzahl: zaehle(x) }))}
          gewaehlt={filter}
          onChange={(w) => {
            setFilter(w as Schnellfilter[])
          }}
        />
        <Filterchips
          beschriftung={t('projekte.feld.standort')}
          optionen={(standorte.data ?? []).map((s) => ({ wert: s.id, text: s.name }))}
          gewaehlt={orte}
          onChange={setOrte}
        />
      </Werkzeugleiste>
      {projekte.isPending ? (
        <Skelett className="h-96" />
      ) : ansicht === 'liste' ? (
        <Datentabelle
          daten={daten}
          spalten={tabelle}
          kennung={(p: Projekt) => p.id}
          aktiveId={aktiveId}
          onOeffnen={(p: Projekt) => {
            onOeffnen(p.id)
          }}
          beschriftung={t('projekte.reiter.alle')}
          leer={<Leerzustand icon={HardHat} titel={t('projekte.leer')} text={t('projekte.leerText')} />}
        />
      ) : (
        <div className="wischzeile flex gap-3 overflow-x-auto pb-2">
          {PHASEN.map((ph) => (
            <section
              key={ph}
              aria-label={t(`projekte.phase.${ph}`)}
              className="bg-muted/50 flex min-w-60 flex-1 basis-0 flex-col rounded-xl border"
            >
              <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <h2 className="text-sm font-semibold">{t(`projekte.phase.${ph}`)}</h2>
                <span className="zahlen text-muted-foreground font-mono text-xs">{spalten[ph].length}</span>
              </header>
              <div className="flex max-h-[calc(100vh-24rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">
                {spalten[ph].length === 0 ? (
                  <p className="text-muted-foreground px-1 py-6 text-center text-xs">{t('projekte.leitstand.leer')}</p>
                ) : (
                  spalten[ph].map((p) => (
                    <LeitstandKarte
                      key={p.id}
                      p={p}
                      hinweise={hinweise(p, sig.get(p.id), heute, lieferfrist)}
                      aktiv={p.id === aktiveId}
                      onOeffnen={() => {
                        onOeffnen(p.id)
                      }}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
