import { useQuery } from '@tanstack/react-query'
import { Check, CircleDot } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BAUPLAN } from '@/lib/bauplan'
import { formatChf, formatDatum, formatTelefon } from '@/lib/format'
import { MODULE } from '@/lib/navigation'
import { plattformName } from '@/lib/plattform'
import { cn } from '@/lib/utils'
import { pruefeVerbindung } from '@/services/supabase'
import { useUi } from '@/stores/ui'

/** Startseite von Phase 1: zeigt, dass das Fundament steht, und den Bauplan. Wird in Phase 14 zu «Heute». */
export function Startseite() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const db = useQuery({ queryKey: ['verbindung'], queryFn: pruefeVerbindung })
  const dbText = db.isPending
    ? t('start.pruefe')
    : db.data === 'verbunden'
      ? t('start.verbunden')
      : db.data === 'fehler'
        ? t('start.fehler')
        : t('start.nichtKonfiguriert')

  const status: [string, string][] = [
    [t('start.version'), __APP_VERSION__],
    [t('start.plattform'), t(`start.${plattformName()}`)],
    [t('start.datenbank'), dbText],
    [t('start.module'), String(MODULE.length)],
  ]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('start.titel')}</h1>
        <p className="text-muted-foreground max-w-2xl">{t('start.lead')}</p>
      </header>

      <section aria-labelledby="status" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <h2 id="status" className="sr-only">
          {t('start.status')}
        </h2>
        {status.map(([label, wert]) => (
          <div key={label} className="bg-surface rounded-lg border p-4">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-1 truncate font-medium">{wert}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="bg-surface rounded-lg border">
          <h2 className="border-b px-4 py-3 text-sm font-medium">{t('start.plan')}</h2>
          <ol className="divide-y">
            {BAUPLAN.map((p) => (
              <li key={p.nr} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="text-muted-foreground w-6 text-right tabular-nums">{p.nr}</span>
                {p.stand === 'fertig' ? (
                  <Check className="text-ok size-4" aria-label="fertig" />
                ) : (
                  <CircleDot
                    className={cn('size-4', p.stand === 'aktiv' ? 'text-sun' : 'text-border')}
                    aria-label={p.stand === 'aktiv' ? 'in Arbeit' : 'offen'}
                  />
                )}
                <span className={cn(p.stand === 'offen' && 'text-muted-foreground')}>{p.titel[sprache]}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-surface flex flex-col gap-3 rounded-lg border p-4 text-sm">
          <h2 className="font-medium">{t('start.beispiel')}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-muted-foreground">CHF</dt>
            <dd className="text-right tabular-nums">{formatChf(1_250_000)}</dd>
            <dt className="text-muted-foreground">Datum</dt>
            <dd className="text-right tabular-nums">{formatDatum('2026-10-21')}</dd>
            <dt className="text-muted-foreground">Telefon</dt>
            <dd className="text-right tabular-nums">{formatTelefon('0761234567')}</dd>
          </dl>
          <p className="text-muted-foreground mt-auto border-t pt-3">{t('start.naechste')}</p>
        </section>
      </div>
    </div>
  )
}
