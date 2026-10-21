import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { GRUPPEN, moduleDerGruppe } from '@/lib/navigation'
import { useUi } from '@/stores/ui'

/** Linke Navigation: Module nach Gruppen, wie in der Vorlage (Übersicht, Verkauf, Abwicklung …). */
export function Seitenleiste() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)

  return (
    <nav aria-label="Hauptnavigation" className="flex flex-col gap-5 overflow-y-auto px-3 py-4">
      {GRUPPEN.map((gruppe) => (
        <div key={gruppe} className="flex flex-col gap-0.5">
          <div className="text-muted-foreground px-2 pb-1 text-[11px] font-medium tracking-wide uppercase">
            {t(`nav.${gruppe}`)}
          </div>
          {moduleDerGruppe(gruppe).map((m) => (
            <Link
              key={m.id}
              to="/$modul"
              params={{ modul: m.id }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors"
              activeProps={{ className: 'bg-muted !text-foreground font-medium' }}
            >
              <ModulIcon name={m.icon} className="size-4 shrink-0" />
              <span className="truncate">{m.titel[sprache]}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
