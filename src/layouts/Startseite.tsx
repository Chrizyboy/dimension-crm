import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, CircleDot } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { BAUPLAN } from '@/lib/bauplan'
import { formatChf, formatDatum, formatTelefon } from '@/lib/format'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { darfModul } from '@/lib/rechte'
import { plattformName } from '@/lib/plattform'
import { ServiceHeute, meta as serviceMeta } from '@/modules/aftersales'
import { WartungHeute, meta as wartungMeta } from '@/modules/contracts'
import { ProjekteHeute, meta as projekteMeta } from '@/modules/projects'
import { EinkaufHeute, meta as einkaufMeta } from '@/modules/purchasing'
import { AusschreibungenHeute, meta as ausschreibungenMeta } from '@/modules/tenders'
import { useAnmeldung } from '@/stores/anmeldung'
import { pruefeVerbindung, supabase } from '@/services/supabase'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'

/** Startseite während des Aufbaus: Systemstatus und Bauplan. Wird in Phase 14 zu «Heute». */
export function Startseite() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const sichtbar = useSichtbareModule()
  const ich = useAnmeldung((z) => z.ich)
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Seitenkopf
        titel={t('start.titel')}
        beschreibung={t('start.lead')}
        aktionen={
          <Link to="/design" className={buttonVariants({ variant: 'primary' })}>
            {t('start.designLink')}
            <ArrowRight />
          </Link>
        }
      />

      <section aria-labelledby="status" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <h2 id="status" className="sr-only">
          {t('start.status')}
        </h2>
        {status.map(([label, wert]) => (
          <div key={label} className="bg-surface flex flex-col gap-1.5 rounded-lg border p-4">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="truncate font-medium">{wert}</div>
          </div>
        ))}
      </section>

      {supabase && ich && darfModul(ausschreibungenMeta, ich) && (
        <Suspense>
          <AusschreibungenHeute />
        </Suspense>
      )}

      {supabase && ich && (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {darfModul(projekteMeta, ich) && (
            <Suspense>
              <ProjekteHeute />
            </Suspense>
          )}
          {darfModul(serviceMeta, ich) && (
            <Suspense>
              <ServiceHeute />
            </Suspense>
          )}
          {darfModul(wartungMeta, ich) && (
            <Suspense>
              <WartungHeute />
            </Suspense>
          )}
          {darfModul(einkaufMeta, ich) && (
            <Suspense>
              <EinkaufHeute />
            </Suspense>
          )}
        </div>
      )}

      <div className="grid items-start gap-6 md:grid-cols-[1.5fr_1fr]">
        <Karte className="overflow-hidden">
          <KarteKopf>
            <KarteTitel>{t('start.plan')}</KarteTitel>
          </KarteKopf>
          <ol className="divide-y">
            {BAUPLAN.map((p) => (
              <li
                key={p.nr}
                className={cn('flex items-center gap-3 px-4 py-2', p.stand === 'aktiv' && 'bg-accent-soft/40')}
              >
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
        </Karte>

        <Karte>
          <KarteKopf>
            <KarteTitel>{t('start.beispiel')}</KarteTitel>
          </KarteKopf>
          <dl className="zahlen grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4">
            <dt className="text-muted-foreground">CHF</dt>
            <dd className="text-right font-mono">{formatChf(1_250_000)}</dd>
            <dt className="text-muted-foreground">{t('design.spalte.datum')}</dt>
            <dd className="text-right font-mono">{formatDatum('2026-10-21')}</dd>
            <dt className="text-muted-foreground">{t('design.feldTelefon')}</dt>
            <dd className="text-right font-mono">{formatTelefon('0761234567')}</dd>
          </dl>
          <p className="text-muted-foreground border-t px-4 py-3 text-xs">{t('start.naechste')}</p>
        </Karte>
      </div>
    </div>
  )
}
