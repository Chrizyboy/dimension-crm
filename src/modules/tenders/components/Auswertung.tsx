import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { useAuswertung, useMitbewerber } from '../hooks/useSubmission'
import { Box } from './Box'
import { Trichter } from './Trichter'

const ZEITRAUM = ['jahr', 'vorjahr', 'monate12'] as const
type Zeitraum = (typeof ZEITRAUM)[number]

/** Von/bis eines Zeitraums als JJJJ-MM-TT. */
function grenzen(z: Zeitraum, heute = new Date()): [string, string] {
  const j = heute.getFullYear()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (z === 'jahr') return [`${j}-01-01`, iso(heute)]
  if (z === 'vorjahr') return [`${j - 1}-01-01`, `${j - 1}-12-31`]
  const von = new Date(heute)
  von.setFullYear(j - 1)
  return [iso(von), iso(heute)]
}

/** Waagrechter Balken (Anteil am grössten Wert), Farbe nur über Diagramm-Token. */
function Balken({ wert, max, zweit }: { wert: number; max: number; zweit?: number }) {
  return (
    <span className="bg-muted relative block h-2 overflow-hidden rounded-full" aria-hidden="true">
      <span className="bg-reihe-1 absolute inset-y-0 left-0" style={{ width: `${max ? (wert / max) * 100 : 0}%` }} />
      {zweit != null && (
        <span className="bg-reihe-2 absolute inset-y-0 left-0" style={{ width: `${max ? (zweit / max) * 100 : 0}%` }} />
      )}
    </span>
  )
}

/**
 * Auswertung: wie viele Submissionen gemeldet, wie viele Go, eingereicht und gewonnen (Quote, Betrag), Abstand zum
 * Zuschlag, nach Kanton und No-Go-Grund, die Mitbewerber aus den Öffnungsprotokollen und der Trichter der Quellen.
 */
export function Auswertung() {
  const { t } = useTranslation()
  const [zeitraum, setZeitraum] = useState<Zeitraum>('jahr')
  const [von, bis] = grenzen(zeitraum)
  const a = useAuswertung(von, bis)
  const mitbewerber = useMitbewerber()

  if (a.error) return <Fehlerzustand details={String(a.error)} onNochmal={() => void a.refetch()} />
  const x = a.data
  const quote = x && x.eingereicht ? Math.round((x.gewonnen / x.eingereicht) * 100) : null
  const zahlen = x
    ? [
        ['gemeldet', x.gemeldet],
        ['go', `${x.go} / ${x.go + x.nogo}`],
        ['eingereicht', x.eingereicht],
        ['gewonnen', quote != null ? `${x.gewonnen} (${quote} %)` : x.gewonnen],
        ['gewonnenChf', formatChf(x.gewonnen_rappen, { mitWaehrung: true })],
        ['offenChf', formatChf(x.offen_rappen, { mitWaehrung: true })],
        ['abstand', x.abstand_prozent != null ? `${x.abstand_prozent > 0 ? '+' : ''}${x.abstand_prozent} %` : '–'],
        ['leads', `${x.leads} / ${x.anschreiben}`],
      ]
    : []
  const maxKanton = Math.max(1, ...(x?.kantone ?? []).map((k) => k.eingereicht))
  const maxGrund = Math.max(1, ...(x?.nogo_gruende ?? []).map((g) => g.anzahl))

  return (
    <div className="flex flex-col gap-4">
      <Filterchips
        einzeln
        beschriftung={t('ausschreibungen.auswertung.zeitraum')}
        gewaehlt={[zeitraum]}
        onChange={([z]) => {
          if (z) setZeitraum(z as Zeitraum)
        }}
        optionen={ZEITRAUM.map((z) => ({ wert: z, text: t(`ausschreibungen.auswertung.${z}`) }))}
      />
      {!x ? (
        <Skelett className="h-24" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {zahlen.map(([id, wert]) => (
            <div key={id} className="bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2">
              <span className="zahlen text-xl font-semibold">{wert}</span>
              <span className="text-muted-foreground text-xs">
                {t(`ausschreibungen.auswertung.zahl.${String(id)}`)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Box titel={t('ausschreibungen.auswertung.kantone')}>
          {(x?.kantone ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('ausschreibungen.auswertung.nochNichts')}</p>
          ) : (
            <>
              <p className="text-muted-foreground flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="bg-reihe-1 size-2.5 rounded-full" />
                  {t('ausschreibungen.auswertung.zahl.eingereicht')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-reihe-2 size-2.5 rounded-full" />
                  {t('ausschreibungen.auswertung.zahl.gewonnen')}
                </span>
              </p>
              <ul className="flex flex-col gap-2">
                {x?.kantone.map((k) => (
                  <li key={k.kanton} className="grid grid-cols-[3rem_1fr_4rem] items-center gap-2">
                    <span className="font-mono text-xs">{k.kanton}</span>
                    <Balken wert={k.eingereicht} max={maxKanton} zweit={k.gewonnen} />
                    <span className="zahlen text-right text-xs">
                      {k.gewonnen}/{k.eingereicht}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Box>
        <Box titel={t('ausschreibungen.auswertung.nogo')}>
          {(x?.nogo_gruende ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('ausschreibungen.auswertung.nochNichts')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {x?.nogo_gruende.map((g) => (
                <li key={g.grund} className="grid grid-cols-[10rem_1fr_2rem] items-center gap-2">
                  <span className="truncate text-xs">
                    {t(`ausschreibungen.nogo.${g.grund}`, { defaultValue: g.grund })}
                  </span>
                  <Balken wert={g.anzahl} max={maxGrund} />
                  <span className="zahlen text-right text-xs">{g.anzahl}</span>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>
      <Box titel={t('ausschreibungen.auswertung.mitbewerber')} rechts={mitbewerber.data?.length}>
        {mitbewerber.isPending ? (
          <Skelett className="h-32" />
        ) : (mitbewerber.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('ausschreibungen.auswertung.keineMitbewerber')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th className="py-1.5 pr-3 font-medium">{t('ausschreibungen.protokoll.anbieter')}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{t('ausschreibungen.auswertung.gegenUns')}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{t('ausschreibungen.auswertung.erster')}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{t('ausschreibungen.auswertung.preisZuUns')}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{t('ausschreibungen.auswertung.proKwp')}</th>
                  <th className="py-1.5 pr-3 font-medium">{t('ausschreibungen.auswertung.kantoneSpalte')}</th>
                  <th className="py-1.5 font-medium">{t('ausschreibungen.auswertung.zuletzt')}</th>
                </tr>
              </thead>
              <tbody>
                {mitbewerber.data?.map((m) => (
                  <tr key={m.anbieter} className="border-t">
                    <td className="py-1.5 pr-3">
                      {m.anbieter}
                      <span className="text-muted-foreground block text-xs">{m.orte}</span>
                    </td>
                    <td className="zahlen py-1.5 pr-3 text-right">{m.submissionen}</td>
                    <td className="zahlen py-1.5 pr-3 text-right">{m.erster}</td>
                    <td className="zahlen py-1.5 pr-3 text-right">
                      {m.abstand_prozent != null ? `${m.abstand_prozent > 0 ? '+' : ''}${m.abstand_prozent} %` : '–'}
                    </td>
                    <td className="zahlen py-1.5 pr-3 text-right">
                      {m.rappen_pro_kwp ? formatChf(m.rappen_pro_kwp) : '–'}
                    </td>
                    <td className="py-1.5 pr-3 text-xs">{m.kantone}</td>
                    <td className="zahlen py-1.5 text-xs">{m.zuletzt ? formatDatum(m.zuletzt) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Box>
      <section className="flex flex-col gap-2" aria-label={t('ausschreibungen.auswertung.trichter')}>
        <h2 className="text-sm font-semibold">{t('ausschreibungen.auswertung.trichter')}</h2>
        <Trichter />
      </section>
    </div>
  )
}
