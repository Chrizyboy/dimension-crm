import { TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMarge } from '../hooks/useFinanzen'
import { margeAuswerten, type MargeAnsicht } from '../lib/marge'
import type { Finanzdaten } from '../types'
import { Nachkalkulation } from './Nachkalkulation'

const ANSICHTEN: MargeAnsicht[] = ['laufend', 'abgeschlossen', 'unterSoll', 'alle']

/**
 * Projekte & Marge für die Geschäftsleitung: Marge je Produkt (PV, Wärmepumpe, Batterie), angefangene Arbeiten
 * (Kosten, die noch nicht verrechnet sind) und alle Projekte mit Ist gegen Soll. Klick öffnet die Nachkalkulation,
 * wo sich Lieferantenrechnungen ohne Projekt zuordnen lassen. Beträge exkl. MWST.
 */
export function Marge({ daten, firmaId }: { daten: Finanzdaten; firmaId: string | null }) {
  const { t } = useTranslation()
  const marge = useMarge()
  const [ansicht, setAnsicht] = useState<MargeAnsicht>('laufend')
  const [offen, setOffen] = useState<string | null>(null)

  if (marge.error) return <Fehlerzustand details={String(marge.error)} onNochmal={() => void marge.refetch()} />
  if (!marge.data) return <Skelett className="h-96" />
  const a = margeAuswerten(
    marge.data.filter((m) => !firmaId || m.firma_id === firmaId),
    ansicht,
  )
  const prozent = (p: number | null) => (p === null ? '–' : `${p.toFixed(1)} %`)

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('finanzen.marge.produkte')}>
        {a.produkte.map((p) => (
          <div key={p.produkt} className="bg-surface flex flex-col gap-1 rounded-lg border p-3">
            <span className="text-muted-foreground text-xs">
              {t(`finanzen.marge.produkt.${p.produkt}`)} · {t('finanzen.marge.projekte', { count: p.anzahl })}
            </span>
            <span className={cn('zahlen text-lg font-semibold', p.prozent !== null && p.prozent < 0 && 'text-bad')}>
              {prozent(p.prozent)}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('finanzen.marge.kachelText', {
                umsatz: formatChf(p.umsatz),
                marge: formatChf(p.marge),
              })}
            </span>
          </div>
        ))}
        <div className="bg-surface flex flex-col gap-1 rounded-lg border p-3">
          <span className="text-muted-foreground text-xs">{t('finanzen.marge.angefangen')}</span>
          <span className="zahlen text-lg font-semibold">{formatChf(a.angefangen, { mitWaehrung: true })}</span>
          <span className="text-muted-foreground text-xs">{t('finanzen.marge.angefangenText')}</span>
        </div>
      </section>
      <Filterchips
        einzeln
        beschriftung={t('finanzen.marge.ansicht')}
        optionen={ANSICHTEN.map((x) => ({ wert: x, text: t(`finanzen.marge.ansichten.${x}`), anzahl: a.anzahl[x] }))}
        gewaehlt={[ansicht]}
        onChange={([x]) => {
          if (x) setAnsicht(x as MargeAnsicht)
        }}
      />
      {a.zeilen.length === 0 ? (
        <Leerzustand icon={TrendingUp} titel={t('finanzen.marge.leer')} text={t('finanzen.marge.leerText')} />
      ) : (
        <Tabelle>
          <TabelleKopf>
            <Zeile>
              <Kopfzelle>{t('finanzen.marge.projekt')}</Kopfzelle>
              <Kopfzelle className="text-right">{t('finanzen.marge.umsatz')}</Kopfzelle>
              <Kopfzelle className="text-right">{t('finanzen.marge.kosten')}</Kopfzelle>
              <Kopfzelle className="text-right">{t('finanzen.marge.ist')}</Kopfzelle>
              <Kopfzelle className="text-right">{t('finanzen.marge.soll')}</Kopfzelle>
              <Kopfzelle className="text-right">{t('finanzen.marge.verrechnet')}</Kopfzelle>
            </Zeile>
          </TabelleKopf>
          <TabelleKoerper>
            {a.zeilen.map((z) => (
              <Zeile key={z.m.projekt_id}>
                <Zelle>
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => {
                      setOffen(offen === z.m.projekt_id ? null : z.m.projekt_id)
                    }}
                  >
                    <span className="font-medium">{z.m.nummer}</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      {[z.m.kunde, t(`finanzen.marge.produkt.${z.m.produkt}`)].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                  {z.unterSoll && (
                    <Badge ton="warnung" className="ml-2">
                      {t('finanzen.marge.ansichten.unterSoll')}
                    </Badge>
                  )}
                </Zelle>
                <Zelle className="zahlen text-right">{formatChf(z.m.umsatz_rappen)}</Zelle>
                <Zelle className="zahlen text-right">{formatChf(z.m.kosten_rappen)}</Zelle>
                <Zelle
                  className={cn('zahlen text-right font-semibold', z.prozent !== null && z.prozent < 0 && 'text-bad')}
                >
                  {prozent(z.prozent)}
                </Zelle>
                <Zelle className="zahlen text-muted-foreground text-right">{prozent(z.soll)}</Zelle>
                <Zelle className="zahlen text-right">
                  {z.m.umsatz_rappen ? `${Math.round((z.m.verrechnet_rappen / z.m.umsatz_rappen) * 100)} %` : '–'}
                </Zelle>
              </Zeile>
            ))}
          </TabelleKoerper>
        </Tabelle>
      )}
      {offen && <Nachkalkulation key={offen} daten={daten} start={offen} />}
    </div>
  )
}
