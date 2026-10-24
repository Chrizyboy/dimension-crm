import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, CircleDot } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { BAUPLAN } from '@/lib/bauplan'
import { plattformName } from '@/lib/plattform'
import { cn } from '@/lib/utils'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { pruefeVerbindung } from '@/services/supabase'
import { useUi } from '@/stores/ui'

/**
 * Systemstatus und Bauplan, früher die ganze Startseite. Jetzt eingeklappt unten auf «Mein Tag», nur für die
 * Administration: wichtig beim Einrichten, im Alltag Nebensache.
 */
export function Systemstatus() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const sichtbar = useSichtbareModule()
  const db = useQuery({ queryKey: ['verbindung'], queryFn: pruefeVerbindung })
  const dbTon = db.data === 'verbunden' ? 'ok' : db.data === 'fehler' ? 'kritisch' : 'neutral'
  const dbText = db.isPending
    ? t('start.pruefe')
    : db.data === 'verbunden'
      ? t('start.verbunden')
      : db.data === 'fehler'
        ? t('start.fehler')
        : t('start.nichtKonfiguriert')

  const status: [string, React.ReactNode][] = [
    [t('start.version'), <span className="zahlen font-mono">{__APP_VERSION__}</span>],
    [t('start.plattform'), t(`start.${plattformName()}`)],
    [
      t('start.datenbank'),
      <Badge ton={dbTon} punkt>
        {dbText}
      </Badge>,
    ],
    [t('start.module'), <span className="zahlen">{sichtbar.length}</span>],
  ]

  return (
    <details className="group bg-surface rounded-lg border">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
        {t('tag.system')}
      </summary>
      <div className="flex flex-col gap-4 border-t p-4">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {status.map(([label, wert]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="truncate font-medium">{wert}</dd>
            </div>
          ))}
        </dl>
        <ol className="grid gap-x-6 sm:grid-cols-2" aria-label={t('start.plan')}>
          {BAUPLAN.map((p) => (
            <li key={p.nr} className="flex items-center gap-3 py-1 text-sm">
              <span className="zahlen text-muted-foreground w-6 text-right font-mono text-xs">{p.nr}</span>
              {p.stand === 'fertig' ? (
                <Check className="text-ok size-4" aria-label={t('start.standFertig')} />
              ) : (
                <CircleDot
                  className={cn('size-4', p.stand === 'aktiv' ? 'text-sun' : 'text-border-strong')}
                  aria-label={p.stand === 'aktiv' ? t('start.standAktiv') : t('start.standOffen')}
                />
              )}
              <span
                className={cn(p.stand === 'offen' && 'text-muted-foreground', p.stand === 'aktiv' && 'font-medium')}
              >
                {p.titel[sprache]}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  )
}
