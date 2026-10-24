import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { cn } from '@/lib/utils'
import { balken } from '../lib/zeitraum'
import type { Detail, Fakt, Zeitraum } from '../types'

const REIHEN = [
  { id: 'muri', farbe: 'bg-reihe-1' },
  { id: 'bulle', farbe: 'bg-reihe-2' },
] as const

/**
 * «Gesendete Offerten» (V233): Muri und Bulle nebeneinander pro Tag, Woche, Monat oder Quartal. Hover zeigt die
 * Zahlen, Klick die Offerten; «Als Tabelle» für Screenreader und zum Abschreiben.
 */
export function OffertenBalken({
  fakten,
  zeitraum,
  von,
  bis,
  onDetail,
}: {
  fakten: Fakt[]
  zeitraum: Zeitraum
  von: string
  bis: string
  onDetail: (d: Detail) => void
}) {
  const { t } = useTranslation()
  const [tabelle, setTabelle] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const faecher = balken(fakten, zeitraum, von, bis)
  const max = Math.max(1, ...faecher.map((f) => Math.max(f.muri.length, f.bulle.length)))
  const jedes = Math.ceil(faecher.length / 12)
  const h = hover !== null ? faecher[hover] : undefined

  return (
    <Karte className="overflow-hidden" data-testid="kz-balken">
      <KarteKopf className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col items-start gap-0.5">
          <KarteTitel>{t('kz.chart.titel')}</KarteTitel>
          <span className="text-muted-foreground text-xs">
            {t('kz.chart.beschreibung', { fach: t(`kz.chart.fach.${zeitraum}`) })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {REIHEN.map((r) => (
            <span key={r.id} className="flex items-center gap-1.5 text-xs">
              <span className={cn('size-2.5 rounded-sm', r.farbe)} aria-hidden="true" />
              {t(`kz.spalte.${r.id}`)}
            </span>
          ))}
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={tabelle}
            onClick={() => {
              setTabelle(!tabelle)
            }}
          >
            {t('kz.chart.tabelle')}
          </Button>
        </div>
      </KarteKopf>
      {tabelle ? (
        <Tabelle aria-label={t('kz.chart.titel')}>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t(`kz.chart.fach.${zeitraum}`)}</Kopfzelle>
              <Kopfzelle zahl>{t('kz.spalte.muri')}</Kopfzelle>
              <Kopfzelle zahl>{t('kz.spalte.bulle')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {faecher.map((f) => (
              <Zeile key={f.fach}>
                <Zelle>{f.text}</Zelle>
                <Zelle zahl>{f.muri.length}</Zelle>
                <Zelle zahl>{f.bulle.length}</Zelle>
              </Zeile>
            ))}
          </TabelleKoerper>
        </Tabelle>
      ) : (
        <div className="px-4 pt-2 pb-3">
          <p className="text-muted-foreground zahlen h-5 text-xs" aria-live="polite">
            {h
              ? t('kz.chart.tooltip', { fach: h.text, muri: h.muri.length, bulle: h.bulle.length })
              : `max. ${String(max)}`}
          </p>
          <div
            className="border-border-strong flex h-40 items-end gap-[2px] border-b"
            role="group"
            aria-label={t('kz.chart.titel')}
          >
            {faecher.map((f, i) => (
              <button
                key={f.fach}
                type="button"
                aria-label={t('kz.chart.tooltip', { fach: f.text, muri: f.muri.length, bulle: f.bulle.length })}
                onMouseEnter={() => {
                  setHover(i)
                }}
                onMouseLeave={() => {
                  setHover(null)
                }}
                onFocus={() => {
                  setHover(i)
                }}
                onClick={() => {
                  onDetail({ titel: `${t('kz.chart.titel')} · ${f.text}`, fakten: [...f.muri, ...f.bulle] })
                }}
                className={cn(
                  'flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-t px-px outline-none',
                  hover === i && 'bg-muted',
                )}
              >
                {REIHEN.map((r) => (
                  <span
                    key={r.id}
                    className={cn('w-full max-w-4 rounded-t-[4px]', r.farbe)}
                    style={{ height: `${String((f[r.id].length / max) * 100)}%` }}
                  />
                ))}
              </button>
            ))}
          </div>
          <div className="flex gap-[2px] pt-1" aria-hidden="true">
            {faecher.map((f, i) => (
              <span
                key={f.fach}
                // Am Handy ist jedes zweite Fach zu schmal für «01.2026»: dort nur jede zweite Beschriftung zeigen.
                className={cn(
                  'text-muted-foreground min-w-0 flex-1 overflow-visible text-center text-xs whitespace-nowrap',
                  (i / jedes) % 2 === 1 && 'max-sm:invisible',
                )}
              >
                {i % jedes === 0 ? f.text : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </Karte>
  )
}
