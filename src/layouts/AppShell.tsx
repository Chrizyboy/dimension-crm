import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useOberflaeche } from '@/hooks/useOberflaeche'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { Kopfzeile } from './Kopfzeile'
import { Seitenleiste } from './Seitenleiste'

/**
 * Rahmen jeder Ansicht: Seitenleiste links, Kopfzeile oben, Inhalt rechts.
 * Am Handy (schmal) ist die Seitenleiste ausgeblendet; die Handy-Navigation folgt in Phase 2.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useOberflaeche()
  const { t } = useTranslation()
  const eingeklappt = useUi((z) => z.seitenleisteEingeklappt)

  return (
    <div className="flex h-full">
      <aside
        className={cn('bg-sidebar hidden w-60 shrink-0 flex-col border-r md:flex', eingeklappt && 'md:hidden')}
        aria-label={t('app.name')}
      >
        <div className="flex h-12 items-center gap-2.5 border-b px-4">
          <img src="./icon.svg" alt="" className="size-6 rounded-md" />
          <span className="text-sm font-semibold">{t('app.name')}</span>
        </div>
        <Seitenleiste />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Kopfzeile />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
