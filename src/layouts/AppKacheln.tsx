import { Funnel, Gift, House, Receipt, Target, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SIGNET } from '@/components/shared/Logo'
import { Tooltip } from '@/components/ui/tooltip'
import { EXTERNE_APPS, type ExterneApp } from '@/lib/apps'
import { cn } from '@/lib/utils'

const ICONS: Record<Exclude<ExterneApp['id'], 'website'>, LucideIcon> = {
  eturnity: House,
  abaninja: Receipt,
  landingpage: Funnel,
  akquise: Target,
  messe: Gift,
}

/**
 * Apps unten in der Seitenleiste wie in V234 (Website, Eturnity, AbaNinja, Landingpage, Akquise, Messe), aber kompakt:
 * eine Reihe kleiner Kacheln, der Name als Tooltip (Chris 19.11.2026: Kacheln mit Namen frassen die halbe Leiste).
 * Ein Klick öffnet die App in einem neuen Tab bzw. im Browser. Eingeklappt untereinander.
 */
export function AppKacheln({ eingeklappt }: { eingeklappt: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex flex-col gap-1.5', eingeklappt ? 'items-center' : 'px-1')}>
      {!eingeklappt && (
        <p className="text-sidebar-muted px-2 text-xs font-bold tracking-[0.07em] uppercase">{t('apps.titel')}</p>
      )}
      <ul className={cn(eingeklappt ? 'flex flex-col items-center gap-1' : 'flex justify-between px-1.5')}>
        {EXTERNE_APPS.map((app) => {
          const Icon = app.id === 'website' ? null : ICONS[app.id]
          const name = t(`apps.${app.id}`)
          const kachel = (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} (${t('apps.neuerTab')})`}
              className="group/app focus-visible:ring-ring flex justify-center rounded-lg outline-none focus-visible:ring-2"
            >
              <span
                aria-hidden="true"
                style={{ background: app.kachel }}
                className="flex size-7 items-center justify-center rounded-lg text-white shadow-[0_1px_2px_rgb(0_0_0/0.12),inset_0_0_0_1px_rgb(255_255_255/0.18)] transition-transform group-hover/app:-translate-y-px"
              >
                {Icon ? <Icon className="size-4" strokeWidth={2} /> : <img src={SIGNET} alt="" className="size-5" />}
              </span>
            </a>
          )
          return (
            <li key={app.id}>
              <Tooltip text={name} seite={eingeklappt ? 'right' : 'top'}>
                {kachel}
              </Tooltip>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
