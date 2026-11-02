import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { useVertragRechnungen } from '../hooks/useVertraege'

const TON: Record<string, 'neutral' | 'warnung' | 'ok' | 'info' | 'kritisch'> = {
  entwurf: 'warnung',
  gestellt: 'info',
  teilbezahlt: 'info',
  bezahlt: 'ok',
  storniert: 'neutral',
}

/** Jahresrechnungen des Vertrags mit Stand; Klick öffnet die Rechnung. */
export function RechnungenAbschnitt({ id, vorlauf }: { id: string; vorlauf: number }) {
  const { t } = useTranslation()
  const liste = useVertragRechnungen(id).data ?? []
  return (
    <AkteAbschnitt titel={t('wartung.akte.rechnungen')} zusatz={String(liste.length)}>
      {liste.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('wartung.akte.keineRechnung', { tage: vorlauf })}</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {liste.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
              <a href={`#/invoices?rechnung=${r.id}`} className="text-accent-ink min-w-0 truncate underline">
                {r.nummer ?? r.titel ?? '–'}
                {r.datum ? ` · ${formatDatum(r.datum)}` : ''}
              </a>
              <span className="flex items-center gap-2">
                {r.total_rappen != null && <span className="zahlen">CHF {formatChf(r.total_rappen)}</span>}
                <Badge ton={TON[r.status] ?? 'neutral'}>{t(`rechnungen.status.${r.status}`)}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </AkteAbschnitt>
  )
}
