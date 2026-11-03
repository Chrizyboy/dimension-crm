import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { formatChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKosten } from '../hooks/useRessourcen'
import { heuteZuerich } from '../lib/fristen'
import { proKm, summe } from '../lib/kosten'
import { Box } from './Box'
import { Kennzeichen } from './Kennzeichen'

const chf = (r: number) => formatChf(r, { mitWaehrung: true })

/**
 * Kosten pro Fahrzeug und Jahr (nur mit Recht «finanzen»): Leasing, Treibstoff/Strom, Unterhalt, Versicherung
 * und Steuer, übrige Kosten, Franken pro Kilometer und der Privatanteil für den Lohnausweis. Balken in den
 * Diagrammfarben, damit man teure Fahrzeuge sofort sieht.
 */
export function KostenAnsicht() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const erlaubt = hatRecht(ich, 'finanzen')
  const diesesJahr = Number(heuteZuerich().slice(0, 4))
  const [jahr, setJahr] = useState(diesesJahr)
  const daten = useKosten(jahr, erlaubt)
  if (!erlaubt)
    return <Leerzustand icon={Lock} titel={t('fuhrpark.kosten.keinRecht')} text={t('fuhrpark.kosten.keinRechtText')} />
  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  const k = daten.data
  const liste = [...(k?.fahrzeuge ?? [])].sort((a, b) => summe(b) - summe(a))
  const total = liste.reduce((s, x) => s + summe(x), 0)
  const km = liste.reduce((s, x) => s + x.km, 0)
  const max = Math.max(1, ...liste.map(summe))

  return (
    <div className="flex flex-col gap-4">
      <Filterchips
        einzeln
        beschriftung={t('fuhrpark.kosten.jahr')}
        optionen={[diesesJahr - 2, diesesJahr - 1, diesesJahr].map((j) => ({ wert: String(j), text: String(j) }))}
        gewaehlt={[String(jahr)]}
        onChange={([x]) => {
          if (x) setJahr(Number(x))
        }}
      />
      {!k ? (
        <Skelett className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [t('fuhrpark.kosten.zahlTotal'), chf(total)],
              [t('fuhrpark.kosten.zahlProKm'), km > 0 ? (total / 100 / km).toFixed(2) : '–'],
              [t('fuhrpark.kosten.zahlUnterhalt'), chf(liste.reduce((s, x) => s + x.unterhalt_rappen, 0))],
              [t('fuhrpark.kosten.zahlGeraete'), chf(k.geraete_wert_rappen)],
            ].map(([l, w]) => (
              <div key={l} className="bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2">
                <span className="zahlen text-xl font-semibold">{w}</span>
                <span className="text-muted-foreground text-xs">{l}</span>
              </div>
            ))}
          </div>
          <Box titel={t('fuhrpark.kosten.proFahrzeug', { jahr })}>
            {liste.length === 0 ? (
              <p className="text-muted-foreground">{t('fuhrpark.kosten.leer')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="text-muted-foreground text-left text-xs">
                    <tr>
                      <th className="py-1 font-semibold">{t('fuhrpark.spalte.fahrzeug')}</th>
                      <th className="w-1/3 py-1 font-semibold" />
                      <th className="py-1 text-right font-semibold">{t('fuhrpark.spalte.km')}</th>
                      <th className="py-1 text-right font-semibold">{t('fuhrpark.kosten.total')}</th>
                      <th className="py-1 text-right font-semibold">{t('fuhrpark.kosten.chfKm')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((x) => {
                      const s = summe(x)
                      const teil = (r: number) => `${(r / max) * 100}%`
                      return (
                        <tr key={x.fahrzeug_id} className="border-t">
                          <td className="py-2 pr-2">
                            <span className="flex flex-col gap-0.5">
                              <a
                                className="font-medium underline-offset-2 hover:underline"
                                href={`#/fleet?fahrzeug=${x.fahrzeug_id}`}
                              >
                                {x.bezeichnung}
                              </a>
                              <Kennzeichen nummer={x.kennzeichen} />
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="bg-muted flex h-3.5 overflow-hidden rounded" role="img" aria-label={chf(s)}>
                              <span className="bg-reihe-1" style={{ width: teil(x.leasing_rappen) }} />
                              <span className="bg-reihe-2" style={{ width: teil(x.treibstoff_rappen) }} />
                              <span
                                className="bg-reihe-1/40"
                                style={{ width: teil(x.unterhalt_rappen + x.fix_rappen + x.uebrige_rappen) }}
                              />
                            </div>
                          </td>
                          <td className="zahlen py-2 text-right">{x.km.toLocaleString('de-CH')}</td>
                          <td className="zahlen py-2 text-right">{chf(s)}</td>
                          <td className="zahlen py-2 text-right">{proKm(x)?.toFixed(2) ?? '–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-muted-foreground flex flex-wrap gap-3 pt-1 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-reihe-1 inline-block size-3 rounded" />
                {t('fuhrpark.kosten.leasing')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-reihe-2 inline-block size-3 rounded" />
                {t('fuhrpark.kosten.treibstoff')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-reihe-1/40 inline-block size-3 rounded" />
                {t('fuhrpark.kosten.rest')}
              </span>
            </div>
          </Box>
        </>
      )}
    </div>
  )
}
