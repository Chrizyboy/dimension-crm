import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Bestellung } from '../types'

/** Karte einer Bestellung im Leitstand: Nummer, Lieferant, Projekte, Termin und was als Nächstes ansteht. */
export function BestellKarte({
  b,
  heute,
  onOeffnen,
}: {
  b: Bestellung
  heute: string
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const hinweis = (() => {
    if (b.gefaehrdet && b.baubeginn)
      return { ton: 'kritisch' as const, text: t('einkauf.ls.montage', { datum: formatDatum(b.baubeginn) }) }
    if (b.ueberfaellig && b.erwartet_am)
      return { ton: 'kritisch' as const, text: t('einkauf.ls.ueberfaellig', { datum: formatDatum(b.erwartet_am) }) }
    if (b.schritt === 'freigabe')
      return b.status === 'freigegeben'
        ? { ton: 'info' as const, text: t('einkauf.ls.senden') }
        : {
            ton: b.vorgelegt_am ? ('info' as const) : ('neutral' as const),
            text: b.vorgelegt_am ? t('einkauf.ls.vorgelegt') : t('einkauf.ls.entwurf'),
          }
    if (b.schritt === 'ab_offen') return { ton: 'warnung' as const, text: t('einkauf.ls.abOffen') }
    if (b.schritt === 'unterwegs' && b.erwartet_am)
      return {
        ton: 'ok' as const,
        text: t(b.ab_termin ? 'einkauf.ls.bestaetigt' : 'einkauf.ls.erwartet', { datum: formatDatum(b.erwartet_am) }),
      }
    if (b.schritt === 'eingang')
      return { ton: 'warnung' as const, text: t('einkauf.ls.teil', { da: b.menge_geliefert, von: b.menge_total }) }
    if (b.schritt === 'rechnung')
      return b.rechnung_nummer
        ? { ton: 'info' as const, text: t('einkauf.ls.rechnungDa', { nummer: b.rechnung_nummer }) }
        : { ton: 'neutral' as const, text: t('einkauf.ls.rechnungErwartet') }
    return null
  })()
  const rot = b.gefaehrdet || b.ueberfaellig
  return (
    <button
      type="button"
      onClick={() => {
        onOeffnen(b.id)
      }}
      className={cn(
        'bg-surface hover:border-border-strong flex flex-col gap-1 rounded-lg border border-l-4 p-2.5 text-left',
        rot ? 'border-l-bad' : b.schritt === 'unterwegs' ? 'border-l-ok' : 'border-l-border',
      )}
    >
      <span className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="zahlen">
          {b.nummer} · {b.lieferant}
        </span>
        {b.total_rappen ? <span className="zahlen">{formatChf(b.total_rappen)}</span> : null}
      </span>
      <span className="line-clamp-2 text-sm font-semibold">
        {b.projekte ?? (b.lagerort ? t('einkauf.fuerLager') : t('einkauf.baustelle'))}
        {b.kunde && <span className="text-muted-foreground font-normal"> · {b.kunde}</span>}
      </span>
      {hinweis && (
        <span className="flex flex-wrap gap-1">
          <Badge ton={hinweis.ton}>{hinweis.text}</Badge>
          {b.tracking && b.schritt === 'unterwegs' && <Badge ton="neutral">{t('einkauf.ls.tracking')}</Badge>}
          {b.erwartet_am && b.erwartet_am < heute && b.schritt === 'ab_offen' && <Badge ton="kritisch">!</Badge>}
        </span>
      )}
    </button>
  )
}
