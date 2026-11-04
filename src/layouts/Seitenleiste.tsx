import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, Palette, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Logo, SIGNET } from '@/components/shared/Logo'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Tooltip } from '@/components/ui/tooltip'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { findeModul, GRUPPEN } from '@/lib/navigation'
import { SPRUENGE } from '@/lib/spruenge'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { cn } from '@/lib/utils'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import type { NavGruppe } from '@/types/modul'

const LINK =
  'flex h-[30px] items-center gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-active/70 hover:text-sidebar-active-foreground focus-visible:ring-2 focus-visible:ring-ring'
/** Bis so viele sichtbare Bereiche passt die Leiste auf einen Laptop, ohne dass Gruppen zu sein müssen. */
const ALLES_OFFEN_BIS = 16

/** Ohne eigene Wahl offen je Rolle: die Gruppen, in denen diese Rolle täglich arbeitet (nur Darstellung). */
const OFFEN_JE_ROLLE: Partial<Record<string, readonly NavGruppe[]>> = {
  verkauf: ['kontakte', 'verkauf'],
  innendienst: ['kontakte', 'abwicklung'],
  projektleitung: ['abwicklung'],
  montage: ['abwicklung'],
  buchhaltung: ['finanzen'],
}

// Variante C (Chris 31.10.2026): Blau wie bisher, Orange als Akzent: Linie links am aktiven Punkt, Icon orange.
const AKTIV = {
  className:
    'relative !bg-sidebar-active !text-sidebar-active-foreground font-medium [&_svg]:!text-accent before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:bg-accent',
}

/**
 * Linke Navigation in Marineblau: Module in kleinen Gruppen nach Arbeitsschritt (Entscheid 0058).
 * Jede Gruppe klappt mit einem Klick auf ihren Namen auf und zu; ohne eigene Wahl sind nur «Übersicht» und die Gruppe
 * des offenen Bereichs offen, so passt die Leiste ohne Scrollen auf einen Laptop. Die Wahl bleibt im Gerät gespeichert.
 * Eine zugeklappte Gruppe zeigt den offenen Bereich trotzdem, damit man immer sieht, wo man ist.
 * Eingeklappt bleiben nur die Icons (mit Tooltip), damit mehr Platz für Tabellen bleibt.
 * `imMenue`: Darstellung im Handy-Menü (immer ausgeklappt, schliesst nach dem Klick).
 */
export function Seitenleiste({ imMenue = false, onNavigiert }: { imMenue?: boolean; onNavigiert?: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const sichtbar = useSichtbareModule()
  const eingeklappt = useUi((z) => z.seitenleisteEingeklappt) && !imMenue
  const toggle = useUi((z) => z.toggleSeitenleiste)
  const gruppenOffen = useUi((z) => z.gruppenOffen)
  const setGruppeOffen = useUi((z) => z.setGruppeOffen)
  const pfad = useRouterState({ select: (z) => z.location.pathname })
  const aktiv = findeModul(pfad.split('/')[1] ?? '')
  // Wer wenige Bereiche sieht (z. B. Verkauf), hat ohnehin Platz: dann ist ohne eigene Wahl alles offen.
  const allesOffen = sichtbar.length <= ALLES_OFFEN_BIS
  const rolle = useAnmeldung((z) => z.ich?.rolle ?? '')
  const rollenGruppen = OFFEN_JE_ROLLE[rolle] ?? []

  // Eingeklappt zeigt der Hinweis Name + Erklärung, ausgeklappt nur zusätzlich die Erklärung.
  // Mit Sprung-Taste steht «G K» rechts im Hinweis (nicht im Handy-Menü, dort gibt es keine Tastatur).
  const eintrag = (key: string, inhalt: React.ReactNode, titel: string, untertitel?: string) => {
    const sprung = imMenue ? undefined : SPRUENGE.find((s) => s.modul === key)
    return eingeklappt || untertitel ? (
      <Tooltip
        key={key}
        text={titel}
        {...(untertitel ? { untertitel } : {})}
        {...(sprung ? { kuerzel: `G ${sprung.taste.toUpperCase()}` } : {})}
        seite="right"
      >
        {inhalt}
      </Tooltip>
    ) : (
      inhalt
    )
  }

  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
      <div
        className={cn(
          // Orange Linie unter dem Logo (Variante C); «!», weil die Grundregel «* { border-color }» ausserhalb der Ebenen steht.
          '!border-accent flex h-12 shrink-0 items-center border-b-2',
          eingeklappt ? 'justify-center' : 'px-4',
        )}
      >
        {eingeklappt ? (
          <img src={SIGNET} alt="Dimension Work" className="size-7" />
        ) : (
          <Logo variante="aufDunkel" kurz className="h-7" />
        )}
      </div>

      <nav
        aria-label={t('nav.haupt')}
        className={cn(
          'relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-2.5',
          eingeklappt ? 'px-2' : 'px-3',
        )}
      >
        {GRUPPEN.filter((g) => sichtbar.some((m) => m.gruppe === g)).map((gruppe) => {
          const offen =
            eingeklappt ||
            (gruppenOffen[gruppe] ??
              (allesOffen || gruppe === 'uebersicht' || gruppe === aktiv?.gruppe || rollenGruppen.includes(gruppe)))
          const name = t(`nav.${gruppe}`)
          // Zugeklappt bleibt der offene Bereich stehen, sonst wüsste man nicht mehr, wo man ist.
          const module = sichtbar.filter((m) => m.gruppe === gruppe && (offen || m.id === aktiv?.id))
          return (
            <div key={gruppe} className="flex flex-col gap-0.5">
              {eingeklappt ? (
                <div className="bg-sidebar-border mx-2 mb-1 h-px first:hidden" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  aria-expanded={offen}
                  title={offen ? t('nav.gruppeZu', { gruppe: name }) : t('nav.gruppeAuf', { gruppe: name })}
                  onClick={() => {
                    setGruppeOffen(gruppe, !offen)
                  }}
                  className="text-sidebar-muted hover:text-sidebar-foreground focus-visible:ring-ring group/gruppe flex h-6 items-center gap-1 rounded-md px-2 text-left text-xs font-semibold tracking-[0.08em] uppercase outline-none focus-visible:ring-2"
                >
                  <span className="flex-1 truncate">{name}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className={cn('size-3.5 shrink-0 transition-transform', offen && 'rotate-90')}
                  />
                </button>
              )}
              {module.map((m) =>
                eintrag(
                  m.id,
                  <Link
                    key={m.id}
                    to="/$modul"
                    params={{ modul: m.id }}
                    onClick={onNavigiert}
                    className={cn(LINK, eingeklappt && 'justify-center px-0')}
                    activeProps={AKTIV}
                    aria-label={eingeklappt ? m.titel[sprache] : undefined}
                  >
                    <ModulIcon name={m.icon} className="text-sidebar-muted size-4 shrink-0" />
                    {!eingeklappt && <span className="truncate">{m.titel[sprache]}</span>}
                  </Link>,
                  m.titel[sprache],
                  m.untertitel[sprache],
                ),
              )}
            </div>
          )
        })}
      </nav>

      <div
        className={cn(
          'border-sidebar-border flex shrink-0 flex-col gap-0.5 border-t py-2',
          eingeklappt ? 'px-2' : 'px-3',
        )}
      >
        {/* Design-System ist eine Hilfe für die Entwicklung, im Betrieb braucht sie niemand. */}
        {import.meta.env.DEV &&
          eintrag(
            'design',
            <Link
              to="/design"
              onClick={onNavigiert}
              className={cn(LINK, eingeklappt && 'justify-center px-0')}
              activeProps={AKTIV}
              aria-label={eingeklappt ? t('befehle.design') : undefined}
            >
              <Palette className="text-sidebar-muted size-4 shrink-0" aria-hidden="true" />
              {!eingeklappt && <span className="truncate">{t('befehle.design')}</span>}
            </Link>,
            t('befehle.design'),
          )}
        {!imMenue &&
          eintrag(
            'einklappen',
            <button
              type="button"
              onClick={toggle}
              className={cn(LINK, eingeklappt && 'justify-center px-0')}
              aria-label={eingeklappt ? t('nav.ausklappen') : undefined}
            >
              {eingeklappt ? (
                <PanelLeftOpen className="text-sidebar-muted size-4 shrink-0" />
              ) : (
                <PanelLeftClose className="text-sidebar-muted size-4 shrink-0" />
              )}
              {!eingeklappt && (
                <>
                  <span className="flex-1 truncate text-left">{t('nav.einklappen')}</span>
                  <span className="text-sidebar-muted font-mono text-xs">{kuerzelText('b')}</span>
                </>
              )}
            </button>,
            `${t('nav.ausklappen')} (${kuerzelText('b')})`,
          )}
      </div>
    </div>
  )
}
