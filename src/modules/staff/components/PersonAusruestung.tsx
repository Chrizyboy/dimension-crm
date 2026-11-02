import { Car, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { useAusruestung } from '../hooks/useTeam'

/**
 * Reiter «Ausrüstung»: Fahrzeuge und Geräte, die die Person bei sich hat, mit nächster Frist (MFK, Prüfung).
 * Übergeben und Prüfen geschieht in «Fahrzeuge & Geräte»; ein Klick springt dorthin.
 */
export function PersonAusruestung({ personId, heute }: { personId: string; heute: string }) {
  const { t } = useTranslation()
  const teile = useAusruestung(personId)
  if (!teile.data) return <Skelett className="h-24" />
  if (teile.data.length === 0) return <p className="text-muted-foreground py-2 text-sm">{t('team.ausruestung.leer')}</p>
  return (
    <ul className="flex flex-col divide-y text-sm">
      {teile.data.map((x) => {
        const Icon = x.art === 'fahrzeug' ? Car : Wrench
        const bald = x.frist !== null && x.frist <= heute
        return (
          <li key={x.id}>
            <a
              className="hover:bg-muted flex items-center justify-between gap-3 rounded-md px-1 py-2"
              href={x.art === 'fahrzeug' ? `#/fleet?fahrzeug=${x.id}` : `#/fleet?ansicht=geraete&geraet=${x.id}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{x.text}</span>
              </span>
              {x.frist && (
                <span className={bald ? 'text-bad text-xs font-medium' : 'text-muted-foreground text-xs'}>
                  {t(x.art === 'fahrzeug' ? 'team.ausruestung.mfk' : 'team.ausruestung.pruefung', {
                    datum: formatDatum(x.frist),
                  })}
                </span>
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
