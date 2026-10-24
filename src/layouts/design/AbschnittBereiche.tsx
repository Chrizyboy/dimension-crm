import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Badge } from '@/components/ui/badge'
import { GRUPPEN, moduleDerGruppe } from '@/lib/navigation'
import { Abschnitt } from './Abschnitt'

/**
 * Alle Bereiche mit Name und Erklärung in beiden Sprachen, zur Abnahme der Benennung.
 * Die Erklärung erscheint auch als Hinweis in der Seitenleiste, in der Suche und im Seitenkopf.
 */
export function AbschnittBereiche() {
  const { t } = useTranslation()
  return (
    <Abschnitt id="bereiche" titel={t('design.bereiche')} text={t('design.bereicheText')}>
      <div className="grid gap-5 lg:grid-cols-2">
        {GRUPPEN.map((g) => (
          <div key={g} className="bg-surface flex flex-col overflow-hidden rounded-lg border">
            <p className="bg-surface-2 text-muted-foreground border-b px-4 py-2 text-xs font-semibold tracking-wide uppercase">
              {t(`nav.${g}`)}
            </p>
            <ul className="divide-y">
              {moduleDerGruppe(g).map((m) => (
                <li key={m.id} className="grid grid-cols-[1.75rem_1fr] gap-x-3 px-4 py-2.5">
                  <ModulIcon name={m.icon} className="text-muted-foreground mt-0.5 size-4" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="font-medium">{m.titel.de}</span>
                      <span className="text-muted-foreground text-sm">{m.titel.fr}</span>
                      <Badge className="ml-auto">{t('modul.phase', { phase: m.phase })}</Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">{m.untertitel.de}</span>
                    <span className="text-muted-foreground text-xs italic">{m.untertitel.fr}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Abschnitt>
  )
}
