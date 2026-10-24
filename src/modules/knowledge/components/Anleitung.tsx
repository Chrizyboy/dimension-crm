import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Kbd } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { GRUPPEN } from '@/lib/navigation'
import { SPRUENGE } from '@/lib/spruenge'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { useKuerzel } from '@/stores/kuerzel'
import { useUi } from '@/stores/ui'

/**
 * Anleitung (V233 Helpdesk › Anleitung): jeder Bereich, den die Person sehen darf, mit einem Satz, was man
 * dort erledigt, dem Sprung-Kürzel und einem Klick zum Öffnen; dazu die Kürzel, die überall helfen.
 * Wie in der Vorlage sieht jede Person nur die Kapitel zu ihren Bereichen.
 */
export function Anleitung() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const module = useSichtbareModule()
  const [suche, setSuche] = useState('')
  const q = suche.trim().toLowerCase()
  const treffer = module.filter(
    (m) => !q || [m.titel.de, m.titel.fr, m.untertitel.de, m.untertitel.fr].join(' ').toLowerCase().includes(q),
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">{t('handbuch.anleitung.intro')}</p>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            type="search"
            aria-label={t('handbuch.anleitung.suche')}
            placeholder={t('handbuch.anleitung.suche')}
            className="w-64 pl-8"
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </div>
      </div>

      <Karte className="flex flex-col gap-3 p-4">
        <h2 className="font-display text-base font-semibold">{t('handbuch.anleitung.schneller')}</h2>
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippSuche')} <Kbd>{kuerzelText('k')}</Kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippSprung')}
            <span className="flex gap-1">
              <Kbd>G</Kbd>
              <Kbd>K</Kbd>
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippNeu')} <Kbd>N</Kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            {t('handbuch.anleitung.tippFilter')} <Kbd>/</Kbd>
          </li>
        </ul>
        <button
          type="button"
          className="text-primary dark:text-accent self-start text-sm underline-offset-4 hover:underline"
          onClick={() => {
            useKuerzel.getState().setHilfe(true)
          }}
        >
          {t('handbuch.anleitung.alleKuerzel')}
        </button>
      </Karte>

      {treffer.length === 0 ? (
        <Leerzustand icon={Search} titel={t('handbuch.nichtsGefunden')} />
      ) : (
        GRUPPEN.map((g) => {
          const liste = treffer.filter((m) => m.gruppe === g)
          if (!liste.length) return null
          return (
            <section key={g} aria-labelledby={`anleitung-${g}`} className="flex flex-col gap-2">
              <h2 id={`anleitung-${g}`} className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t(`nav.${g}`)}
              </h2>
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {liste.map((m) => {
                  const sprung = SPRUENGE.find((s) => s.modul === m.id)
                  return (
                    <li key={m.id}>
                      <Link
                        to={m.pfad}
                        className="bg-surface hover:bg-muted focus-visible:ring-ring flex h-full items-start gap-3 rounded-lg border p-3 outline-none focus-visible:ring-2"
                      >
                        <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                          <ModulIcon name={m.icon} className="text-muted-foreground size-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="font-medium">{m.titel[sprache]}</span>
                          <span className="text-muted-foreground text-sm">{m.untertitel[sprache]}</span>
                        </span>
                        {sprung && (
                          <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden="true">
                            <Kbd>G</Kbd>
                            <Kbd>{sprung.taste.toUpperCase()}</Kbd>
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
