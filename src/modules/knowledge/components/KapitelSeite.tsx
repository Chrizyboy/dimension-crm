import { ArrowLeft, BookOpen, ExternalLink, LifeBuoy, Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { useDrucken } from '@/hooks/useDrucken'
import { formatDatum } from '@/lib/format'
import { findeModul } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { useKapitel } from '../hooks/useKapitel'
import { KapitelDruck } from './KapitelDruck'
import { Bloecke } from './KapitelText'
import { Unterlagen } from './Unterlagen'

/** Abschnitte mit eigener Farbe: was die App selbst erledigt, und was zuletzt neu kam. */
const HERVORGEHOBEN: Record<string, string> = {
  automatisch: 'bg-accent-soft border-transparent',
  regeln: 'bg-info-soft border-transparent',
}

/**
 * Ein Kapitel ganz: links das Inhaltsverzeichnis, rechts der Text mit allen Anleitungen, Ständen, Regeln und Fragen,
 * dazu die zugeordneten Prozesse und Videos. «Stelle» springt an eine Anleitung (aus Suche oder Hilfe).
 */
export function KapitelSeite({
  id,
  stelle,
  onZurueck,
  onMelden,
}: {
  id: string
  stelle: string | null
  onZurueck: () => void
  onMelden: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const kapitel = useKapitel(id)
  const modul = findeModul(id)
  const druck = useDrucken()
  const k = kapitel.data

  useEffect(() => {
    if (!k || !stelle) return
    document.getElementById(`stelle-${stelle}`)?.scrollIntoView({ block: 'start' })
  }, [k, stelle])

  if (kapitel.isPending) return <Skelett className="h-96 w-full" />
  if (kapitel.isError) return <Fehlerzustand details={String(kapitel.error)} />
  if (!k)
    return <Leerzustand icon={BookOpen} titel={t('handbuch.kapitel.fehlt')} text={t('handbuch.kapitel.fehltText')} />

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav
        aria-label={t('handbuch.kapitel.inhalt')}
        className="bg-surface flex flex-col gap-1 rounded-lg border p-3 lg:sticky lg:top-4 lg:w-64 lg:shrink-0"
      >
        <button
          type="button"
          onClick={onZurueck}
          className="text-primary dark:text-accent mb-2 flex items-center gap-1 self-start text-sm font-medium hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('handbuch.kapitel.alle')}
        </button>
        {k.abschnitte.map((a) => (
          <a
            key={a.schluessel}
            href={`#stelle-${a.schluessel}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(`stelle-${a.schluessel}`)?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="hover:bg-muted rounded-md px-2 py-1 text-sm"
          >
            {a.titel}
            {a.unter.length > 0 && <span className="text-muted-foreground"> ({a.unter.length})</span>}
          </a>
        ))}
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
          {modul && (
            <a href={`#${modul.pfad}`} className={buttonVariants()}>
              <ExternalLink />
              {t('handbuch.kapitel.oeffnen', { bereich: modul.titel[sprache] })}
            </a>
          )}
          <Button variant="secondary" onClick={druck.drucke}>
            <Printer />
            {t('handbuch.kapitel.drucken')}
          </Button>
        </div>
      </nav>

      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-5">
        <header className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-semibold">{k.titel}</h2>
          <Bloecke bloecke={k.einleitung} className="text-base" />
        </header>
        {k.abschnitte.map((a) => (
          <section
            key={a.schluessel}
            id={`stelle-${a.schluessel}`}
            aria-labelledby={`titel-${a.schluessel}`}
            className={cn('bg-surface scroll-mt-4 rounded-lg border p-5', HERVORGEHOBEN[a.schluessel])}
          >
            <h2 id={`titel-${a.schluessel}`} className="font-display mb-3 text-lg font-semibold">
              {a.titel}
            </h2>
            <Bloecke bloecke={a.bloecke} />
            {a.unter.map((u) => (
              <div key={u.anker} id={`stelle-${u.anker}`} className="mt-4 scroll-mt-4 first:mt-0">
                <h3 className="mb-1.5 text-sm font-semibold">{u.titel}</h3>
                <Bloecke bloecke={u.bloecke} />
              </div>
            ))}
          </section>
        ))}
        <Unterlagen bereich={id} />
        <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
          <span>{k.stand ? t('handbuch.kapitel.stand', { datum: formatDatum(k.stand) }) : ''}</span>
          <Button variant="ghost" onClick={onMelden}>
            <LifeBuoy />
            {t('handbuch.kapitel.melden')}
          </Button>
        </footer>
      </article>
      {druck.aktiv && <KapitelDruck kapitel={k} sprache={sprache} />}
    </div>
  )
}
