import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Avatar, Skelett } from '@/components/ui/diverses'
import { useTeam } from '../hooks/useAufgaben'

/**
 * Team-Sicht für die Geschäftsleitung: je Person offen, überfällig, heute fällig, erledigt in 7 Tagen und
 * ob sie heute abwesend ist. Klick öffnet die Liste dieser Person zum Umverteilen.
 */
export function TeamSicht({ onPerson }: { onPerson: (id: string) => void }) {
  const { t } = useTranslation()
  const team = useTeam(true)
  if (team.error) return <Fehlerzustand details={String(team.error)} onNochmal={() => void team.refetch()} />
  if (team.isLoading) return <Skelett className="h-64" />
  const zeilen = (team.data ?? []).filter((z) => z.offen > 0 || z.erledigt_7 > 0 || z.person_id === null)
  if (zeilen.length === 0)
    return <Leerzustand icon={Users} titel={t('aufgaben.team.leer')} text={t('aufgaben.team.leerText')} />
  const max = Math.max(1, ...zeilen.map((z) => z.offen))
  return (
    <div className="bg-surface overflow-x-auto rounded-lg border">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{t('aufgaben.ansichten.team')}</caption>
        <thead className="text-muted-foreground text-xs">
          <tr className="border-b">
            <th className="px-3 py-2 text-left font-medium">{t('aufgaben.spalte.wer')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('aufgaben.team.offen')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('aufgaben.gruppe.ueberfaellig')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('aufgaben.heute')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('aufgaben.team.erledigt7')}</th>
            <th className="hidden px-3 py-2 text-left font-medium md:table-cell">{t('aufgaben.team.last')}</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.person_id ?? 'niemand'} className="hover:bg-surface-2 border-b last:border-b-0">
              <td className="px-3 py-2">
                {z.person_id ? (
                  <button
                    type="button"
                    className="focus-visible:ring-ring flex items-center gap-2 rounded text-left outline-none focus-visible:ring-2"
                    onClick={() => {
                      if (z.person_id) onPerson(z.person_id)
                    }}
                  >
                    <Avatar name={z.name ?? ''} zeichen={z.kurzzeichen} />
                    <span className="font-medium">{z.name}</span>
                    {z.abwesend && <Badge ton="warnung">{t('aufgaben.team.abwesend')}</Badge>}
                  </button>
                ) : (
                  <span className="text-muted-foreground italic">{t('aufgaben.team.niemand')}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">{z.offen}</td>
              <td className="px-3 py-2 text-right">
                {z.ueberfaellig > 0 ? <Badge ton="kritisch">{z.ueberfaellig}</Badge> : 0}
              </td>
              <td className="px-3 py-2 text-right">{z.heute}</td>
              <td className="px-3 py-2 text-right">{z.erledigt_7}</td>
              <td className="hidden px-3 py-2 md:table-cell">
                <span className="bg-muted block h-1.5 w-32 overflow-hidden rounded-full" aria-hidden="true">
                  <span className="bg-reihe-1 block h-full" style={{ width: `${(z.offen / max) * 100}%` }} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
