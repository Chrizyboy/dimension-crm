import { ArrowUpRight, Search } from 'lucide-react'
import { Suspense, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { useTaste } from '@/hooks/useTaste'
import { hatRecht } from '@/lib/rechte'
import { cn } from '@/lib/utils'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import type { EinstellungsBereich } from '@/types/einstellungen'
import type { ModulMeta } from '@/types/modul'
import { nachGruppen, sichtbareBereiche } from '../lib/bereiche'

/**
 * Einstellungen an einem Ort: links die Bereiche in vier Gruppen mit Suche, rechts der offene Bereich.
 * Bereiche kommen aus diesem Modul und aus den anderen Modulen (gesammelt in der Route).
 * Am Handy wird die Navigation zur Auswahlliste über dem Inhalt.
 */
export default function Einstellungen({
  bereiche,
  module,
  bereich,
  onBereich,
}: {
  bereiche: readonly EinstellungsBereich[]
  module: readonly ModulMeta[]
  /** Offener Bereich aus der Adresse (`?bereich=…`). */
  bereich?: string
  onBereich: (id: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const status = useAnmeldung((z) => z.status)
  const [suche, setSuche] = useState('')
  const sucheRef = useRef<HTMLInputElement>(null)
  useTaste('/', () => sucheRef.current?.focus(), true, t('einstellungen.sucheKuerzel'))

  // Ohne Anmeldung (Vorschau ohne Datenbank) ist alles sichtbar, wie bei den Modulen.
  const darf = (b: EinstellungsBereich) => status !== 'angemeldet' || hatRecht(ich, b.recht)
  const erlaubt = useMemo(() => sichtbareBereiche(bereiche, darf), [bereiche, ich, status]) // eslint-disable-line react-hooks/exhaustive-deps
  const gefunden = useMemo(() => sichtbareBereiche(erlaubt, () => true, suche), [erlaubt, suche])
  const offen = erlaubt.find((b) => b.id === bereich) ?? erlaubt[0]
  const gruppen = nachGruppen(gefunden)

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('einstellungen.titel')} beschreibung={t('einstellungen.beschreibung')} />
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label={t('einstellungen.titel')} className="flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">{t('einstellungen.suche')}</span>
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
            <Input
              ref={sucheRef}
              id="einstellungen-suche"
              value={suche}
              placeholder={t('einstellungen.suchePlatzhalter')}
              className="pl-8"
              autoComplete="off"
              onChange={(e) => {
                setSuche(e.target.value)
              }}
              onKeyDown={(e) => {
                const erster = gefunden[0]
                if (e.key === 'Enter' && erster) onBereich(erster.id)
              }}
            />
          </label>
          {/* Handy: eine Auswahlliste statt der langen Navigation. */}
          <div className="lg:hidden">
            <Auswahl
              id="einstellungen-bereich"
              aria-label={t('einstellungen.bereichWaehlen')}
              value={offen?.id ?? ''}
              onValueChange={onBereich}
              optionen={gefunden.map((b) => ({
                wert: b.id,
                text: `${t(`einstellungen.gruppe.${b.gruppe}`)} › ${b.titel[sprache]}`,
              }))}
            />
          </div>
          <div className="hidden flex-col gap-4 lg:flex">
            {gruppen.map((g) => (
              <div key={g.gruppe} className="flex flex-col gap-0.5">
                <h2 className="text-muted-foreground px-2 pb-1 text-xs font-semibold tracking-wide uppercase">
                  {t(`einstellungen.gruppe.${g.gruppe}`)}
                </h2>
                {g.bereiche.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-current={b.id === offen?.id ? 'page' : undefined}
                    onClick={() => {
                      onBereich(b.id)
                    }}
                    className={cn(
                      'hover:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2',
                      b.id === offen?.id && 'bg-muted font-semibold shadow-[inset_3px_0_0_var(--accent)]',
                    )}
                  >
                    <ModulIcon name={b.icon} className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 truncate">{b.titel[sprache]}</span>
                  </button>
                ))}
              </div>
            ))}
            {gruppen.length === 0 && (
              <p className="text-muted-foreground px-2 text-sm">{t('einstellungen.nichtsGefunden', { suche })}</p>
            )}
          </div>
        </nav>

        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="einstellungen-bereich-titel">
          {offen ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 id="einstellungen-bereich-titel" className="text-lg font-semibold">
                    {offen.titel[sprache]}
                  </h2>
                  <p className="text-muted-foreground max-w-3xl text-sm">{offen.beschreibung[sprache]}</p>
                </div>
                {offen.modulPfad && (
                  <a
                    href={`#${offen.modulPfad}`}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
                  >
                    {t('einstellungen.zumModul')}
                    <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                )}
              </div>
              <Suspense fallback={<Skelett className="h-64" />}>
                <offen.Inhalt key={offen.id} module={module} />
              </Suspense>
            </>
          ) : (
            <Leerzustand
              icon={Search}
              titel={t('einstellungen.keinBereich')}
              text={t('einstellungen.keinBereichText')}
            />
          )}
        </section>
      </div>
    </div>
  )
}
