import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { formatChf } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useOffertEinstellungen } from '../hooks/useOfferten'
import { sortiereKarten, vorratKarten, vorratZahlen, type VorratKarte as Karte } from '../lib/vorrat'
import { OFFERT_PHASEN, type Eingang, type Offerte } from '../types'
import { Kachel } from './Box'
import { VorratKarte } from './VorratKarte'

type Filter = 'alle' | 'meine' | 'muri' | 'bulle'

/**
 * Arbeitsvorrat: ein Board vom Termin bis zum Auftrag (zu offerieren, in Planung, prüfen, offeriert, Verhandlung,
 * gewonnen). Oben die Kopfzahlen: offenes und gewichtetes Volumen, überfällige Offerten, heute nachfassen,
 * Termin bis Offerte und Quote. Wer brennt, steht oben in der Spalte.
 */
export default function Arbeitsvorrat({
  offerten,
  eingang,
  onOeffnen,
}: {
  offerten: Offerte[]
  eingang: Eingang[]
  onOeffnen: (ziel: { offerte: string } | { lead: string }) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const cfg = useOffertEinstellungen().data
  const [filter, setFilter] = useState<Filter>('alle')
  const ziel = cfg?.zielArbeitstage ?? 5
  const alle = useMemo(() => vorratKarten(offerten, eingang, { arbeitstage: ziel }), [offerten, eingang, ziel])
  const karten = useMemo(() => {
    const vorname = ich?.name.split(' ')[0] ?? ''
    return alle.filter((k) => {
      if (filter === 'muri' || filter === 'bulle') return k.standort === filter
      if (filter === 'meine') return !!ich && (k.person === ich.name || k.person === vorname)
      return true
    })
  }, [alle, filter, ich])
  const z = vorratZahlen(offerten, karten)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Kachel
          zahl={`CHF ${formatChf(z.offenRappen).replace(/\.\d\d$/, '')}`}
          text={t('offerten.vorrat.kOffen', { count: z.offenAnzahl, kwp: Math.round(z.offenKwp) })}
          nurGross
        />
        <Kachel
          zahl={`CHF ${formatChf(z.gewichtetRappen).replace(/\.\d\d$/, '')}`}
          text={t('offerten.vorrat.kGewichtet')}
          ton="warn"
          nurGross
        />
        <Kachel
          zahl={String(z.ueberfaellig)}
          text={t('offerten.vorrat.kUeberfaellig', { tage: ziel })}
          ton={z.ueberfaellig ? 'bad' : undefined}
        />
        <Kachel
          zahl={String(z.nachfassenHeute)}
          text={t('offerten.vorrat.kNachfassen')}
          ton={z.nachfassenHeute ? 'warn' : undefined}
        />
        <Kachel
          zahl={z.terminBisOfferte === null ? '–' : t('offerten.vorrat.tage', { n: z.terminBisOfferte })}
          text={t('offerten.vorrat.kDauer', { ziel })}
          nurGross
        />
        <Kachel
          zahl={z.quote90 === null ? '–' : `${z.quote90} %`}
          text={t('offerten.vorrat.kQuote')}
          ton="ok"
          nurGross
        />
      </div>
      <Filterchips
        einzeln
        beschriftung={t('offerten.vorrat.filter')}
        gewaehlt={[filter]}
        onChange={(w) => {
          setFilter((w[0] as Filter | undefined) ?? 'alle')
        }}
        optionen={(['alle', 'meine', 'muri', 'bulle'] as const).map((f) => ({
          wert: f,
          text: t(`offerten.vorrat.f_${f}`),
        }))}
      />
      <div
        role="region"
        aria-label={t('offerten.ansicht.vorrat')}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:snap-none sm:px-6"
      >
        {OFFERT_PHASEN.map((p) => {
          const liste = karten.filter((k) => k.phase === p).sort(sortiereKarten)
          return (
            <section
              key={p}
              aria-label={t(`offerten.phase.${p}`)}
              className="bg-muted/50 flex min-w-[80%] flex-1 basis-0 snap-start flex-col rounded-xl border sm:min-w-52"
            >
              <header className="flex flex-col border-b px-3 py-2">
                <span className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{t(`offerten.phase.${p}`)}</h2>
                  <span className="zahlen text-muted-foreground font-mono text-xs">{liste.length}</span>
                </span>
                <span className="text-muted-foreground text-xs">{t(`offerten.phase.${p}_text`)}</span>
              </header>
              <div className="flex max-h-[calc(100vh-24rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">
                {liste.map((k: Karte) => (
                  <VorratKarte
                    key={k.schluessel}
                    k={k}
                    onOeffnen={(x) => {
                      onOeffnen(x.ziel)
                    }}
                  />
                ))}
                {liste.length === 0 && (
                  <p className="text-muted-foreground px-1 py-4 text-center text-xs">{t('offerten.vorrat.leer')}</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
