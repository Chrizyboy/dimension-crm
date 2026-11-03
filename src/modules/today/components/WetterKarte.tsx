import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Cloud, CloudRain, CloudSnow, CloudSun, HelpCircle, Sun, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { supabase } from '@/services/supabase'
import { wetterArt } from '../lib/tag'
import { ladeWetter } from '../services/meinTag'
import type { BaustellenWetter } from '../types'

const SYMBOL: Record<ReturnType<typeof wetterArt>, LucideIcon> = {
  sonne: Sun,
  wolken: CloudSun,
  regen: CloudRain,
  schnee: CloudSnow,
  unbekannt: HelpCircle,
}

/** Baustellen nach Projekt gruppiert, Tage in Reihenfolge. */
function nachProjekt(liste: BaustellenWetter[]): BaustellenWetter[][] {
  const m = new Map<string, BaustellenWetter[]>()
  for (const w of liste) m.set(w.projekt_id, [...(m.get(w.projekt_id) ?? []), w])
  return [...m.values()]
}

/** Wochentag kurz und Datum, z. B. «Di 3.11.». */
function tagText(datum: string, sprache: string): string {
  const d = new Date(`${datum}T12:00:00`)
  const wt = d.toLocaleDateString(sprache === 'fr' ? 'fr-CH' : 'de-CH', { weekday: 'short' })
  return `${wt.replace('.', '')} ${formatDatum(d).slice(0, 6)}`
}

/**
 * «Wetter auf den Baustellen» (M5 A, Montage und Projektleitung): meine Einsätze der nächsten Tage mit der
 * Tagesprognose von MeteoSwiss (Zeitplan, stündlich). «Achtung» nach den Schwellen in `einstellungen.wetter`.
 */
export function WetterKarte() {
  const { t, i18n } = useTranslation()
  const wetter = useQuery({
    queryKey: ['tag-wetter'],
    queryFn: ladeWetter,
    enabled: supabase !== null,
    refetchInterval: 1_800_000,
  })
  if (!wetter.data || wetter.data.length === 0) return null

  return (
    <Karte className="flex flex-col" data-testid="tag-wetter">
      <KarteKopf>
        <KarteTitel className="flex items-center gap-2">
          <Cloud className="text-muted-foreground size-4" aria-hidden="true" />
          {t('tag.wetter.titel')}
        </KarteTitel>
      </KarteKopf>
      <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
        {nachProjekt(wetter.data).map((tage) => {
          const p = tage[0]
          if (!p) return null
          return (
            <section key={p.projekt_id} className="flex flex-col gap-1.5">
              <h3 className="text-sm font-medium">
                <Link to="/projects" search={{ projekt: p.projekt_id }} className="hover:underline">
                  {[p.nummer, p.titel].filter(Boolean).join(' · ')}
                </Link>
                {p.ort && <span className="text-muted-foreground font-normal"> · {p.ort}</span>}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {tage.map((w) => {
                  const art = wetterArt(w)
                  const Symbol = SYMBOL[art]
                  return (
                    <li
                      key={w.datum}
                      className="bg-surface-2 flex min-w-[7.5rem] flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-xs"
                      aria-label={`${tagText(w.datum, i18n.language)}: ${t(`tag.wetter.art.${art}`)}`}
                    >
                      <span className="flex items-center justify-between gap-2 font-medium">
                        {tagText(w.datum, i18n.language)}
                        {w.achtung && <Badge ton="warnung">{t('tag.wetter.achtung')}</Badge>}
                      </span>
                      {art === 'unbekannt' ? (
                        <span className="text-muted-foreground">{t('tag.wetter.keine')}</span>
                      ) : (
                        <>
                          <span className="zahlen flex items-center gap-1.5">
                            <Symbol className="text-muted-foreground size-4" aria-hidden="true" />
                            {w.tmax !== undefined && `${Math.round(w.tmax)}°`}
                            {w.tmin !== undefined && (
                              <span className="text-muted-foreground">{` / ${String(Math.round(w.tmin))}°`}</span>
                            )}
                          </span>
                          <span className="text-muted-foreground zahlen">
                            {[
                              w.regen_mm !== undefined && t('tag.wetter.regen', { mm: w.regen_mm.toFixed(1) }),
                              w.wind_kmh !== undefined && t('tag.wetter.wind', { kmh: w.wind_kmh }),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        <p className="text-muted-foreground text-xs">{t('tag.wetter.quelle')}</p>
      </div>
    </Karte>
  )
}
