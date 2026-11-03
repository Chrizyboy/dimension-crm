import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { summe } from '../lib/auswertung'
import { franken, kurz } from '../lib/format'
import { alterKlassen, pipelineNachStand, von } from '../lib/verkauf'
import { Kpi } from './Kpi'
import { Pipeline } from './Pipeline'
import type { ReiterProps } from './reiterProps'

/**
 * Reiter «Pipeline & Prognose»: offene Offerten nach Stand mit fester Wahrscheinlichkeit (K2 A, einstellbar),
 * Alter der offenen Offerten je Firma und die bisherige Pipeline pro Region.
 */
export function PipelineReiter(p: ReiterProps) {
  const { t } = useTranslation()
  const offen = von(p.fakten, 'offen')
  const staende = pipelineNachStand(offen, p.e, p.heute)
  const gewichtet = staende.reduce((s, z) => s + z.gewichtet, 0)
  const alt = staende.find((s) => s.id === 'alt')
  const klassen = alterKlassen(offen, p.heute)
  const zeigen = (titel: string, fakten: typeof offen) => {
    p.onDetail({ titel, fakten })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="kz-pipeline-kacheln">
        <Kpi
          titel={t('kz.pipe.offen')}
          wert={String(offen.length)}
          unter={t('kz.pipe.angebotswert', { wert: franken(summe(offen)) })}
          onKlick={() => {
            zeigen(t('kz.pipe.offen'), offen)
          }}
        />
        <Kpi
          titel={t('kz.k.pipeline')}
          wert={franken(gewichtet)}
          unter={t('kz.pipe.gewichtetUnter')}
          onKlick={() => {
            zeigen(t('kz.k.pipeline'), offen)
          }}
        />
        <Kpi
          titel={t('kz.kachel.nachfassen')}
          wert={String(von(p.fakten, 'nf_faellig').length)}
          unter={franken(summe(von(p.fakten, 'nf_faellig')))}
          onKlick={() => {
            zeigen(t('kz.kachel.nachfassen'), von(p.fakten, 'nf_faellig'))
          }}
        />
        <Kpi
          titel={t('kz.pipe.alt', { tage: p.e.alt_tage })}
          wert={String(alt?.fakten.length ?? 0)}
          unter={franken(alt?.wert ?? 0)}
          unterTon={(alt?.fakten.length ?? 0) > 0 ? 'warnung' : undefined}
          onKlick={() => {
            zeigen(t('kz.pipe.alt', { tage: p.e.alt_tage }), alt?.fakten ?? [])
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Karte className="overflow-hidden">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.pipe.nachStand')}</KarteTitel>
            <p className="text-muted-foreground text-xs">{t('kz.pipe.nachStandHinweis')}</p>
          </KarteKopf>
          <Tabelle aria-label={t('kz.pipe.nachStand')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.pipe.stand')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.pipe.anzahl')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.pipe.wert')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.pipe.wahrscheinlichkeit')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.pipe.gewichtet')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {staende.map((s) => (
                <Zeile
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => {
                    zeigen(t(`kz.pipe.s.${s.id}`, { tage: p.e.alt_tage }), s.fakten)
                  }}
                >
                  <Zelle>{t(`kz.pipe.s.${s.id}`, { tage: p.e.alt_tage })}</Zelle>
                  <Zelle zahl className="font-mono">
                    {s.fakten.length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {kurz(s.wert)}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {s.prozent} %
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {kurz(s.gewichtet)}
                  </Zelle>
                </Zeile>
              ))}
              <Zeile className="bg-surface-2 font-semibold">
                <Zelle>{t('kz.detail.total')}</Zelle>
                <Zelle zahl className="font-mono">
                  {offen.length}
                </Zelle>
                <Zelle zahl className="font-mono">
                  {kurz(summe(offen))}
                </Zelle>
                <Zelle />
                <Zelle zahl className="font-mono">
                  {kurz(gewichtet)}
                </Zelle>
              </Zeile>
            </TabelleKoerper>
          </Tabelle>
        </Karte>

        <Karte className="overflow-hidden">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.pipe.alter')}</KarteTitel>
            <p className="text-muted-foreground text-xs">{t('kz.pipe.alterHinweis')}</p>
          </KarteKopf>
          <Tabelle aria-label={t('kz.pipe.alter')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.pipe.seit')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.spalte.muri')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.spalte.bulle')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.pipe.wert')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {klassen.map((k) => (
                <Zeile
                  key={k.id}
                  className="cursor-pointer"
                  onClick={() => {
                    zeigen(t(`kz.pipe.k.${k.id}`), k.fakten)
                  }}
                >
                  <Zelle>{t(`kz.pipe.k.${k.id}`)}</Zelle>
                  <Zelle zahl className="font-mono">
                    {k.muri.length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {k.bulle.length}
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {kurz(summe(k.fakten))}
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </Karte>
      </div>

      <Pipeline bereich={p.bereich} />
    </div>
  )
}
