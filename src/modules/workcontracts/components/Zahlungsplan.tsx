import { useTranslation } from 'react-i18next'
import { formatChf, formatDatum } from '@/lib/format'
import type { Tranche } from '../types'

/** Zahlungsplan als kleine Tabelle: Tranche, fällig, Betrag inkl. MWST, Summe. */
export function Zahlungsplan({ tranchen }: { tranchen: readonly Tranche[] }) {
  const { t } = useTranslation()
  if (tranchen.length === 0) return <p className="text-muted-foreground text-sm">{t('werkvertraege.plan.keiner')}</p>
  const summe = tranchen.reduce((s, x) => s + x.betragRappen, 0)
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground text-left text-xs">
          <th className="py-1 font-medium">{t('werkvertraege.plan.tranche')}</th>
          <th className="py-1 font-medium">{t('werkvertraege.plan.faellig')}</th>
          <th className="py-1 text-right font-medium">{t('werkvertraege.plan.betrag')}</th>
        </tr>
      </thead>
      <tbody>
        {tranchen.map((x, i) => (
          <tr key={`${x.bezeichnung}-${i}`} className="border-t">
            <td className="py-1 pr-2">
              {x.bezeichnung}
              {x.bezahltAm && (
                <span className="text-ok block text-xs">
                  {t('werkvertraege.plan.bezahlt', { datum: formatDatum(x.bezahltAm) })}
                </span>
              )}
            </td>
            <td className="zahlen py-1 pr-2 font-mono text-[13px]">{x.faelligAm ? formatDatum(x.faelligAm) : '–'}</td>
            <td className="zahlen py-1 text-right font-mono text-[13px]">{formatChf(x.betragRappen)}</td>
          </tr>
        ))}
        <tr className="border-t font-medium">
          <td className="py-1" colSpan={2}>
            {t('werkvertraege.plan.total')}
          </td>
          <td className="zahlen py-1 text-right font-mono text-[13px]">{formatChf(summe)}</td>
        </tr>
      </tbody>
    </table>
  )
}
