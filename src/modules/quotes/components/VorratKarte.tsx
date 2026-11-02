import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VorratHinweis, VorratKarte as Karte } from '../lib/vorrat'

function HinweisBadge({ h }: { h: VorratHinweis }) {
  const { t } = useTranslation()
  switch (h.art) {
    case 'ueberfaellig':
      return <Badge ton="kritisch">{t('offerten.vorrat.ueberfaellig', { count: h.tage })}</Badge>
    case 'rueckfrage':
      return (
        <Badge ton="warnung" title={h.text ?? undefined}>
          {t('offerten.vorrat.rueckfrage')}
        </Badge>
      )
    case 'freigabe':
      return <Badge ton="warnung">{t(`offerten.freigabe.noetig_${h.grund}`)}</Badge>
    case 'nachfassen':
      return (
        <Badge ton={h.tage > 0 ? 'kritisch' : 'warnung'}>
          {h.tage > 0 ? t('offerten.vorrat.nachfassenSeit', { count: h.tage }) : t('offerten.vorrat.nachfassenHeute')}
        </Badge>
      )
    case 'abgelaufen':
      return <Badge ton="warnung">{t('offerten.vorrat.abgelaufen')}</Badge>
  }
}

/**
 * Karte im Arbeitsvorrat: Nummer, wie lange sie schon wartet, Kunde und Ort, Betrag und Leistung, wer daran ist,
 * Chance und der dringendste Hinweis. Ein Klick öffnet die Offerte oder den Eintrag in «Neue Offerten».
 */
export function VorratKarte({ k, onOeffnen }: { k: Karte; onOeffnen: (k: Karte) => void }) {
  const { t } = useTranslation()
  const rand =
    k.hinweis?.art === 'ueberfaellig' || (k.hinweis?.art === 'nachfassen' && k.hinweis.tage > 0)
      ? 'border-l-bad'
      : k.hinweis
        ? 'border-l-warn'
        : k.phase === 'gewonnen'
          ? 'border-l-ok'
          : 'border-l-border'
  return (
    <button
      type="button"
      onClick={() => {
        onOeffnen(k)
      }}
      className={cn(
        'bg-surface hover:border-border-strong focus-visible:ring-ring flex w-full flex-col gap-1 rounded-lg border border-l-4 p-2.5 text-left text-sm outline-none focus-visible:ring-2',
        rand,
      )}
    >
      <span className="text-muted-foreground flex justify-between gap-2 text-xs">
        <span className="zahlen font-mono">{k.nummer ?? (k.richtofferte ? t('offerten.vorrat.richt') : '–')}</span>
        <span>{k.seit ? formatDatum(k.seit) : ''}</span>
      </span>
      <span className="font-medium">{k.name}</span>
      <span className="text-muted-foreground text-xs">
        {[k.ort, k.kwp ? `${k.kwp} kWp` : null, k.person].filter(Boolean).join(' · ')}
      </span>
      {(k.betragRappen ?? 0) > 0 && (
        <span className="flex justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {k.variante
              ? t('offerten.vorrat.variante', { k: k.variante })
              : k.anzahlVarianten > 1
                ? t('offerten.vorrat.varianten', { count: k.anzahlVarianten })
                : t('offerten.akte.exkl')}
          </span>
          <span className="zahlen font-semibold">{formatChf(k.betragRappen ?? 0, { mitWaehrung: true })}</span>
        </span>
      )}
      {(k.hinweis || k.chance !== null) && (
        <span className="flex flex-wrap gap-1">
          {k.hinweis && <HinweisBadge h={k.hinweis} />}
          {k.chance !== null && <Badge>{t('offerten.chance.kurz', { p: k.chance })}</Badge>}
        </span>
      )}
    </button>
  )
}
