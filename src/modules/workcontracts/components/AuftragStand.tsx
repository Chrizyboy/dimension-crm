import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ladeAuftragStand } from '../services/auftragsdaten'
import type { Werkvertrag } from '../types'

/**
 * Stand des Auftrags als Schrittfolge: Offerte unterschrieben → Dokument versendet (→ Werkvertrag
 * unterschrieben) → Anzahlung bezahlt → Montage → Inbetriebnahme → Schlussrechnung. Nur Anzeige; gesetzt
 * werden die Schritte dort, wo sie passieren (Vertrag, Zahlungen, Fahrplan des Projekts).
 */
export function AuftragStand({ vertrag: w }: { vertrag: Werkvertrag }) {
  const { t } = useTranslation()
  const stand = useQuery({
    queryKey: ['werkvertraege', 'stand', w.id, w.status, w.versendetAm, w.zahlungsplan],
    queryFn: () => ladeAuftragStand(w),
  })
  if (!stand.data) return <Skelett className="h-10" />
  const ab = w.angaben.art === 'auftragsbestaetigung'
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2 text-xs" aria-label={t('werkvertraege.stand.titel')}>
      {stand.data.map((s, i) => (
        <li key={s.schluessel} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground px-0.5">›</span>}
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5',
              s.erledigt ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground',
            )}
            title={s.datum ? formatDatum(s.datum) : undefined}
          >
            {s.erledigt && <Check className="size-3" />}
            {t(`werkvertraege.stand.${s.schluessel === 'versendet' && ab ? 'versendetAb' : s.schluessel}`)}
          </span>
        </li>
      ))}
    </ol>
  )
}
