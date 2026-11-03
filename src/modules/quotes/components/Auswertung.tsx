import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatChf } from '@/lib/format'
import { auswertung } from '../lib/auswertung'
import type { Offerte } from '../types'
import { Box, Kachel } from './Box'

const ZEITRAEUME = [30, 90, 365] as const

/** Ganze Franken ohne Rappen für Kacheln und Tabelle. */
function franken(rappen: number): string {
  return `CHF ${formatChf(rappen).replace(/\.\d\d$/, '')}`
}

/** Balken je Eintrag, im selben Massstab (grösster Wert = ganze Breite). */
function Balken({ zeilen }: { zeilen: { text: string; anzahl: number }[] }) {
  const max = Math.max(1, ...zeilen.map((z) => z.anzahl))
  return (
    <ul className="flex flex-col gap-2">
      {zeilen.map((z) => (
        <li key={z.text} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
          <span className="truncate" title={z.text}>
            {z.text}
          </span>
          <span className="bg-muted h-2.5 overflow-hidden rounded-full">
            <span className="bg-reihe-1 block h-full rounded-full" style={{ width: `${(z.anzahl / max) * 100}%` }} />
          </span>
          <span className="zahlen text-right">{z.anzahl}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Auswertung: was offeriert, gewonnen und verloren wurde (30, 90 oder 365 Tage), je Person, warum verloren wurde
 * und gegen wen. Rechnet in der App aus derselben Liste wie der Arbeitsvorrat, damit die Zahlen übereinstimmen.
 */
export default function Auswertung({ offerten }: { offerten: Offerte[] }) {
  const { t } = useTranslation()
  const [tage, setTage] = useState<(typeof ZEITRAEUME)[number]>(90)
  const a = useMemo(() => auswertung(offerten, tage, t('offerten.auswertung.ohne')), [offerten, tage, t])
  const z = a.total
  return (
    <div className="flex flex-col gap-4">
      <Filterchips
        einzeln
        beschriftung={t('offerten.auswertung.zeitraum')}
        gewaehlt={[String(tage)]}
        onChange={(w) => {
          const n = Number(w[0])
          if (n === 30 || n === 90 || n === 365) setTage(n)
        }}
        optionen={ZEITRAEUME.map((n) => ({ wert: String(n), text: t('offerten.auswertung.tage', { n }) }))}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <Kachel zahl={franken(z.offeriertRappen)} text={t('offerten.auswertung.kOfferiert', { count: z.offeriert })} />
        <Kachel
          zahl={franken(z.gewonnenRappen)}
          text={t('offerten.auswertung.kGewonnen', { count: z.gewonnen })}
          ton="ok"
        />
        <Kachel
          zahl={String(z.verloren)}
          text={t('offerten.auswertung.kVerloren')}
          ton={z.verloren ? 'bad' : undefined}
        />
        <Kachel zahl={z.quote === null ? '–' : `${z.quote} %`} text={t('offerten.auswertung.kQuote')} />
        <Kachel
          zahl={z.tageBisEntscheid === null ? '–' : t('offerten.vorrat.tage', { n: z.tageBisEntscheid })}
          text={t('offerten.auswertung.kDauer')}
        />
      </div>
      <Box titel={t('offerten.auswertung.jePerson')}>
        {a.personen.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('offerten.auswertung.leer')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Tabelle>
              <TabelleKopf>
                <tr>
                  <Kopfzelle>{t('offerten.auswertung.person')}</Kopfzelle>
                  <Kopfzelle zahl>{t('offerten.auswertung.offeriert')}</Kopfzelle>
                  <Kopfzelle zahl>{t('offerten.auswertung.gewonnen')}</Kopfzelle>
                  <Kopfzelle zahl>{t('offerten.auswertung.verloren')}</Kopfzelle>
                  <Kopfzelle zahl>{t('offerten.auswertung.quote')}</Kopfzelle>
                  <Kopfzelle zahl>{t('offerten.auswertung.volumen')}</Kopfzelle>
                </tr>
              </TabelleKopf>
              <TabelleKoerper>
                {a.personen.map((p) => (
                  <Zeile key={p.name}>
                    <Zelle>{p.name}</Zelle>
                    <Zelle zahl>{p.offeriert}</Zelle>
                    <Zelle zahl>{p.gewonnen}</Zelle>
                    <Zelle zahl>{p.verloren}</Zelle>
                    <Zelle zahl>{p.quote === null ? '–' : `${p.quote} %`}</Zelle>
                    <Zelle zahl>{franken(p.gewonnenRappen)}</Zelle>
                  </Zeile>
                ))}
              </TabelleKoerper>
            </Tabelle>
          </div>
        )}
      </Box>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box titel={t('offerten.auswertung.gruende')}>
          {a.verlustgruende.length ? (
            <Balken zeilen={a.verlustgruende.map((g) => ({ text: g.grund, anzahl: g.anzahl }))} />
          ) : (
            <p className="text-muted-foreground text-sm">{t('offerten.auswertung.keineVerloren')}</p>
          )}
        </Box>
        <Box titel={t('offerten.auswertung.konkurrenz')}>
          {a.konkurrenz.length ? (
            <Balken zeilen={a.konkurrenz.map((k) => ({ text: k.name, anzahl: k.anzahl }))} />
          ) : (
            <p className="text-muted-foreground text-sm">{t('offerten.auswertung.keineKonkurrenz')}</p>
          )}
        </Box>
      </div>
    </div>
  )
}
