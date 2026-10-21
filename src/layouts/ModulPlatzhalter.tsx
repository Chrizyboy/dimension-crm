import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { useUi } from '@/stores/ui'
import type { ModulMeta } from '@/types/modul'

/** Leerer Zustand für ein Modul, das noch nicht gebaut ist. */
export function ModulPlatzhalter({ modul }: { modul: ModulMeta }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-24 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
        <ModulIcon name={modul.icon} className="text-muted-foreground size-6" />
      </div>
      <h1 className="text-xl font-semibold">{modul.titel[sprache]}</h1>
      <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs">
        {t('modul.geplant')} · {t('modul.phase', { phase: modul.phase })}
      </span>
      <p className="text-muted-foreground text-sm">{t('modul.text', { phase: modul.phase })}</p>
    </div>
  )
}
