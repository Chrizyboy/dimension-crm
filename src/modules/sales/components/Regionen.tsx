import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useRegionen } from '../hooks/useVerkauf'
import { heuteIso, summe } from '../lib/geschaeft'
import { tagVon } from '../lib/stopps'
import type { Geschaeft } from '../types'
import { Karte, type KartenPunkt } from './Karte'

const PIPE = ['lead_neu', 'lead_offen', 'lead_spaeter'] as const
const OHNE = '_ohne'

function tage(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return heuteIso(d)
  })
}

/** Stärke der Farbe in der Heatmap: 0, 1, 2, 3+ Termine. */
const STUFE = [
  '',
  'bg-accent-soft',
  'bg-accent/60 text-accent-foreground',
  'bg-accent text-accent-foreground font-semibold',
] as const

/**
 * Regionen (V233): Termine der nächsten 14 Tage pro Region als Heatmap, die offene Pipeline pro Region
 * (noch zu terminieren), Offerten nach Standort und eine Karte. So sieht man, wo sich eine Tour lohnt.
 */
export default function Regionen({
  geschaefte,
  onOeffnen,
}: {
  geschaefte: Geschaeft[]
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const regionen = useRegionen()
  const staende = useAuswahl('kundenstand')
  const vierzehn = useMemo(() => tage(14), [])
  const zeilen = useMemo(
    () => [
      ...(regionen.data ?? []).map((r) => ({ id: r.id, name: `${r.nummer ?? ''} ${r.name}`.trim() })),
      { id: OHNE, name: t('verkauf.regionen.ohne') },
    ],
    [regionen.data, t],
  )

  const heat = useMemo(() => {
    const z = new Map<string, number>()
    for (const g of geschaefte) {
      if (!g.terminAm) continue
      const tag = tagVon(g.terminAm)
      if (!vierzehn.includes(tag)) continue
      const k = `${g.regionId ?? OHNE}|${tag}`
      z.set(k, (z.get(k) ?? 0) + 1)
    }
    return z
  }, [geschaefte, vierzehn])
  const pipe = useMemo(() => {
    const z = new Map<string, number>()
    for (const g of geschaefte)
      if ((PIPE as readonly string[]).includes(g.stand))
        z.set(`${g.regionId ?? OHNE}|${g.stand}`, (z.get(`${g.regionId ?? OHNE}|${g.stand}`) ?? 0) + 1)
    return z
  }, [geschaefte])
  const kennzahlen = [
    { id: 'neueOfferten', liste: geschaefte.filter((g) => g.stand === 'offerte' || g.stand === 'pruefung') },
    { id: 'offertenBulle', liste: geschaefte.filter((g) => g.gruppe === 'offeriert' && g.standort === 'bulle') },
    { id: 'offertenMuri', liste: geschaefte.filter((g) => g.gruppe === 'offeriert' && g.standort === 'muri') },
    { id: 'nachfassen', liste: geschaefte.filter((g) => g.stand === 'nachfassen') },
  ]
  const punkte: KartenPunkt[] = geschaefte
    .filter((g) => g.breite !== null && ((PIPE as readonly string[]).includes(g.stand) || g.stand === 'termin'))
    .map((g) => ({
      id: g.id,
      breite: g.breite as number,
      laenge: g.laenge as number,
      titel: `${g.name} · ${staende.text(g.stand)}`,
      ton: g.stand === 'termin' ? 'primary' : g.stand === 'lead_spaeter' ? 'muted-foreground' : 'accent',
    }))
  const sichtbar = zeilen.filter(
    (r) =>
      vierzehn.some((d) => heat.get(`${r.id}|${d}`)) || PIPE.some((s) => pipe.get(`${r.id}|${s}`)) || r.id !== OHNE,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kennzahlen.map((k) => {
          const s = summe(k.liste)
          return (
            <div key={k.id} className="bg-surface rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">{t(`verkauf.regionen.${k.id}`)}</p>
              <p className="zahlen font-mono text-xl font-semibold">{s.anzahl}</p>
              <p className="zahlen text-muted-foreground font-mono text-xs">
                {formatChf(s.rappen, { mitWaehrung: true })} · {s.kwp} kWp
              </p>
            </div>
          )
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="bg-surface overflow-x-auto rounded-xl border p-4" aria-labelledby="heat-titel">
          <h2 id="heat-titel" className="mb-3 text-sm font-semibold">
            {t('verkauf.regionen.heatmap')}
          </h2>
          <table className="w-full border-separate border-spacing-0.5 text-xs">
            <thead>
              <tr>
                <th className="text-muted-foreground text-left font-medium">{t('verkauf.region')}</th>
                {vierzehn.map((d) => (
                  <th key={d} className="text-muted-foreground w-7 font-mono font-normal">
                    {new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'narrow' })}
                    <br />
                    {d.slice(8)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sichtbar.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="max-w-48 truncate pr-2 text-left font-normal">
                    {r.name}
                  </th>
                  {vierzehn.map((d) => {
                    const n = heat.get(`${r.id}|${d}`) ?? 0
                    return (
                      <td
                        key={d}
                        className={cn('bg-muted/50 h-7 rounded text-center font-mono', STUFE[Math.min(n, 3)])}
                      >
                        {n || ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="bg-surface overflow-x-auto rounded-xl border p-4" aria-labelledby="pipe-titel">
          <h2 id="pipe-titel" className="mb-1 text-sm font-semibold">
            {t('verkauf.regionen.pipeline')}
          </h2>
          <p className="text-muted-foreground mb-3 text-xs">{t('verkauf.regionen.pipelineText')}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="text-left align-bottom font-medium">{t('verkauf.region')}</th>
                {PIPE.map((s) => (
                  <th key={s} className="min-w-16 px-1 text-right align-bottom leading-tight font-medium">
                    {staende.text(s)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sichtbar.map((r) => {
                const n = PIPE.map((s) => pipe.get(`${r.id}|${s}`) ?? 0)
                if (r.id === OHNE && !n.some(Boolean)) return null
                return (
                  <tr key={r.id} className="border-t">
                    <th scope="row" className="max-w-56 truncate py-1 pr-2 text-left font-normal">
                      {r.name}
                    </th>
                    {n.map((x, i) => (
                      <td key={PIPE[i]} className="zahlen px-1 py-1 text-right font-mono">
                        {x || ''}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
      <Karte beschriftung={t('verkauf.karte.regionen')} punkte={punkte} onKlick={onOeffnen} className="h-[28rem]" />
    </div>
  )
}
