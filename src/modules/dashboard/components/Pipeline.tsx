import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { usePipeline } from '../hooks/useKennzahlen'
import { franken } from '../lib/format'
import type { Bereich, PipelineZeile } from '../types'

const GRUPPEN = ['lead', 'offerte', 'offeriert', 'auftrag'] as const

/** Anzahl, Wert und kWp einer Menge Geschäfte. */
function summen(z: PipelineZeile[]) {
  return {
    n: z.length,
    wert: z.reduce((s, x) => s + (x.wert_rappen ?? 0), 0),
    kwp: z.reduce((s, x) => s + (x.kwp ?? 0), 0),
  }
}

/**
 * Offene Pipeline pro Region (Bau-Auftrag): Standort, darunter Kanton; Spalten nach Stand (Lead, in Offerte,
 * offeriert, Auftrag) und Total mit Wert und kWp.
 */
export function Pipeline({ bereich }: { bereich: Bereich }) {
  const { t } = useTranslation()
  const p = usePipeline()
  if (p.isError) return <Fehlerzustand onNochmal={() => void p.refetch()} />
  if (!p.data) return <Skelett className="h-64" />

  const daten = bereich === 'alle' ? p.data : p.data.filter((z) => z.standort === bereich)
  const standorte = [...new Set(daten.map((z) => z.standort ?? '–'))].sort()

  const zeile = (titel: string, z: PipelineZeile[], fett = false) => {
    const total = summen(z)
    return (
      <Zeile key={titel} className={fett ? 'bg-surface-2 font-semibold' : undefined}>
        <Zelle className={fett ? '' : 'pl-6'}>{titel}</Zelle>
        {GRUPPEN.map((g) => (
          <Zelle key={g} zahl className="font-mono">
            {z.filter((x) => x.gruppe === g).length || '–'}
          </Zelle>
        ))}
        <Zelle zahl className="font-mono">
          {total.n}
        </Zelle>
        <Zelle zahl className="font-mono">
          {total.wert ? franken(total.wert) : '–'}
        </Zelle>
        <Zelle zahl className="font-mono">
          {total.kwp ? total.kwp.toFixed(0) : '–'}
        </Zelle>
      </Zeile>
    )
  }

  return (
    <Karte className="overflow-hidden" data-testid="kz-pipeline">
      <KarteKopf className="flex flex-col items-start gap-0.5">
        <KarteTitel>{t('kz.pipeline.titel')}</KarteTitel>
        <span className="text-muted-foreground text-xs">{t('kz.pipeline.beschreibung')}</span>
      </KarteKopf>
      <Tabelle aria-label={t('kz.pipeline.titel')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle>{t('kz.pipeline.region')}</Kopfzelle>
            {GRUPPEN.map((g) => (
              <Kopfzelle key={g} zahl>
                {t(`kz.pipeline.gruppe.${g}`)}
              </Kopfzelle>
            ))}
            <Kopfzelle zahl>{t('kz.pipeline.anzahl')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.pipeline.wert')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.pipeline.kwp')}</Kopfzelle>
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {standorte.map((s) => {
            const hier = daten.filter((z) => (z.standort ?? '–') === s)
            const kantone = [...new Set(hier.map((z) => z.kanton ?? ''))].sort()
            return (
              <Fragment key={s}>
                {zeile(
                  s === '–' ? t('kz.pipeline.ohneStandort') : t(`kz.spalte.${s}`, { defaultValue: s }),
                  hier,
                  true,
                )}
                {kantone.map((k) =>
                  zeile(
                    k || t('kz.pipeline.ohne'),
                    hier.filter((z) => (z.kanton ?? '') === k),
                  ),
                )}
              </Fragment>
            )
          })}
          {standorte.length > 1 && zeile(t('kz.spalte.zusammen'), daten, true)}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}
