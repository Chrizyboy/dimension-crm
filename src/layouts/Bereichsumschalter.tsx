import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { bereichsTeile } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'

/**
 * Umschalter oben auf Seiten, die sich in der Seitenleiste einen Eintrag teilen (z. B. «Verträge»: Werkverträge und
 * Wartungsverträge, wie in V234). Zeigt nichts, wenn die Person nur einen der Teile sehen darf.
 */
export function Bereichsumschalter({ modulId }: { modulId: string }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const teile = bereichsTeile(modulId, useSichtbareModule())
  if (teile.length === 0) return null
  const haupt = teile[0]
  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 pt-4 sm:px-6">
      <nav
        aria-label={(haupt?.sammeltitel ?? haupt?.titel)?.[sprache] ?? t('nav.haupt')}
        className="bg-surface-2/70 inline-flex gap-1 rounded-xl border p-1"
      >
        {teile.map((m) => {
          const aktiv = m.id === modulId
          return (
            <a
              key={m.id}
              href={`#${m.pfad}`}
              aria-current={aktiv ? 'page' : undefined}
              className={cn(
                'focus-visible:ring-ring flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-2',
                aktiv ? 'bg-surface text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ModulIcon name={m.icon} className={cn('size-4', aktiv && 'text-accent')} />
              {m.titel[sprache]}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
