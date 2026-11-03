import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { cn } from '@/lib/utils'
import { useGng } from '../../hooks/useSubmission'
import type { Dossier, GngTeil } from '../../types'
import { Box } from '../Box'

const FLAECHE = { go: 'bg-ok-soft text-ok', pruefen: 'bg-warn-soft text-warn', nogo: 'bg-bad-soft text-bad' } as const

/** Zusatz zu einem Teil des Vorschlags (Wert, den die Datenbank gemessen hat). */
function zusatz(t: TFunction, x: GngTeil): string {
  switch (x.teil) {
    case 'thema':
      return typeof x.wert === 'string' ? x.wert : ''
    case 'groesse':
      return x.wert ? `${x.wert} kWp` : t('ausschreibungen.gng.unbekannt')
    case 'distanz':
      return x.wert != null ? t('ausschreibungen.fahrzeit', { min: x.wert }) : t('ausschreibungen.gng.unbekannt')
    case 'eignung':
      return t('ausschreibungen.gng.referenzen', { count: Number(x.wert ?? 0), kwp: x.kwp ?? 0 })
    case 'quote':
      return x.entschieden
        ? t('ausschreibungen.gng.quote', { g: x.gewonnen, e: x.entschieden })
        : t('ausschreibungen.gng.keineQuote')
    case 'nachweise':
      return x.fehlen?.length
        ? t('ausschreibungen.gng.fehlen', { count: x.fehlen.length })
        : t('ausschreibungen.gng.alleNachweise')
  }
}

/**
 * Go/No-Go: Vorschlag der Datenbank (0–100) mit Begründung je Teil. Nach dem Entscheid bleibt der Vorschlag
 * von damals stehen, dazu wer wann wie entschieden hat. Kapazität der Montage prüft der Mensch.
 */
export function GngBox({ d }: { d: Dossier }) {
  const { t } = useTranslation()
  const live = useGng(d.id, d.spur === 'angebot' && !d.gng_vorschlag)
  if (d.spur !== 'angebot') return null
  const v = d.gng_vorschlag ?? live.data
  return (
    <Box
      titel={t('ausschreibungen.gng.titel')}
      rechts={
        d.gng_entscheid ? (
          <Badge ton={d.gng_entscheid === 'go' ? 'ok' : 'neutral'}>
            {t(`ausschreibungen.gng.entscheid.${d.gng_entscheid}`)}
          </Badge>
        ) : (
          t('ausschreibungen.gng.hinweis')
        )
      }
    >
      {!v ? (
        <Skelett className="h-40" />
      ) : (
        <>
          <div className={cn('flex items-center gap-3 rounded-md px-3 py-2', FLAECHE[v.empfehlung])}>
            <span className="zahlen font-display text-2xl font-semibold">{v.punkte}</span>
            <span className="text-sm font-medium">{t(`ausschreibungen.gng.empfehlung.${v.empfehlung}`)}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {v.teile.map((x) => (
              <li key={x.teil} className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span>{t(`ausschreibungen.gng.teil.${x.teil}`)}</span>
                  <span className="zahlen text-muted-foreground font-mono text-xs">
                    {x.punkte}/{x.max}
                  </span>
                </span>
                <span className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                  <span
                    className={cn(
                      'block h-full',
                      x.punkte / x.max >= 0.66 ? 'bg-ok' : x.punkte / x.max >= 0.34 ? 'bg-warn' : 'bg-bad',
                    )}
                    style={{ width: `${Math.round((x.punkte / x.max) * 100)}%` }}
                  />
                </span>
                <span className="text-muted-foreground text-xs">{zusatz(t, x)}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">{t('ausschreibungen.gng.kapazitaet')}</p>
          {d.gng_entscheid === 'nogo' && d.gng_grund && (
            <p className="text-sm">
              {t('ausschreibungen.gng.grund', { grund: t(`ausschreibungen.nogo.${d.gng_grund}`) })}
            </p>
          )}
        </>
      )}
    </Box>
  )
}
