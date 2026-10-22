import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { ladeTrichter } from '../services/ausschreibungen'
import type { TrichterZeile } from '../types'

const ZEITRAUM = ['30', '90', '365'] as const
const STUFEN = ['gefunden', 'relevant', 'bearbeitet', 'antwort', 'erfolg'] as const

/** Summe aller Zeilen (oberste Zeile «Total»). */
function summe(z: TrichterZeile[]): Record<(typeof STUFEN)[number], number> {
  return Object.fromEntries(STUFEN.map((s) => [s, z.reduce((a, x) => a + x[s], 0)])) as Record<
    (typeof STUFEN)[number],
    number
  >
}

/**
 * Trichter: wie viele Meldungen je Quelle und Kanton gefunden wurden, wie viele davon passten, bearbeitet
 * wurden, eine Antwort brachten und zum Erfolg (Lead oder Zuschlag) wurden. Zeigt, welche Quelle sich lohnt.
 */
export function Trichter() {
  const { t } = useTranslation()
  const [tage, setTage] = useState<(typeof ZEITRAUM)[number]>('90')
  const [heute] = useState(() => new Date())
  const bis = heute.toISOString().slice(0, 10)
  const von = new Date(heute.getTime() - Number(tage) * 86_400_000).toISOString().slice(0, 10)
  const daten = useQuery({ queryKey: ['ausschreibungen', 'trichter', von, bis], queryFn: () => ladeTrichter(von, bis) })
  const total = summe(daten.data ?? [])

  return (
    <div className="flex flex-col gap-4">
      <Filterchips
        einzeln
        beschriftung={t('ausschreibungen.trichter.zeitraum')}
        gewaehlt={[tage]}
        onChange={([w]) => {
          if (w) setTage(w as (typeof ZEITRAUM)[number])
        }}
        optionen={ZEITRAUM.map((z) => ({ wert: z, text: t('ausschreibungen.trichter.tage', { count: Number(z) }) }))}
      />
      <section aria-label={t('ausschreibungen.trichter.titel')} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STUFEN.map((s, i) => (
          <div key={s} className="bg-surface flex flex-col gap-1 rounded-lg border p-4">
            <div className="text-muted-foreground text-xs">{t(`ausschreibungen.trichter.${s}`)}</div>
            <div className="zahlen text-2xl font-semibold">{total[s]}</div>
            {i > 0 && total.gefunden > 0 && (
              <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                <div
                  className="bg-accent h-full"
                  style={{ width: `${Math.round((total[s] / total.gefunden) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </section>
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : daten.isPending ? (
        <Skelett className="h-48" />
      ) : (
        <Karte className="overflow-x-auto">
          <Tabelle aria-label={t('ausschreibungen.trichter.titel')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('ausschreibungen.spalte.quelle')}</Kopfzelle>
                <Kopfzelle>{t('ausschreibungen.trichter.kanton')}</Kopfzelle>
                {STUFEN.map((s) => (
                  <Kopfzelle key={s} zahl>
                    {t(`ausschreibungen.trichter.${s}`)}
                  </Kopfzelle>
                ))}
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {daten.data.length === 0 && (
                <tr>
                  <Zelle colSpan={7} className="text-muted-foreground">
                    {t('ausschreibungen.trichter.leer')}
                  </Zelle>
                </tr>
              )}
              {daten.data.map((z) => (
                <Zeile key={`${z.quelle}-${z.kanton}`}>
                  <Zelle>{t(`ausschreibungen.quelle.${z.quelle}`, { defaultValue: z.quelle })}</Zelle>
                  <Zelle>{z.kanton}</Zelle>
                  {STUFEN.map((s) => (
                    <Zelle key={s} zahl>
                      {z[s]}
                    </Zelle>
                  ))}
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </Karte>
      )}
    </div>
  )
}
