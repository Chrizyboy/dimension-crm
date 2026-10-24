import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { useUi } from '@/stores/ui'
import { Seitenleiste } from './Seitenleiste'

/**
 * Bereiche, die unterwegs am meisten gebraucht werden (Verkauf auf Tour, Monteure auf der Baustelle). Unten
 * stehen die ersten vier, welche die Person sehen darf; alles andere ist eine Berührung weiter unter «Mehr».
 */
const HANDY_MODULE = ['today', 'fieldwork', 'sales', 'projects', 'tasks'] as const

/** Leiste unten am Handy, mit dem Daumen erreichbar. Ab 768 px Breite ausgeblendet. */
export function HandyNavigation() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const sichtbar = useSichtbareModule()
  const offen = useUi((z) => z.handyMenueOffen)
  const setOffen = useUi((z) => z.setHandyMenue)

  const stil =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground outline-none focus-visible:bg-muted'

  return (
    <>
      <nav
        aria-label={t('nav.handy')}
        className="bg-surface fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] border-t pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        {HANDY_MODULE.flatMap((id) => sichtbar.filter((s) => s.id === id))
          .slice(0, 4)
          .map((m) => {
            const id = m.id
            return (
              <Link
                key={id}
                to="/$modul"
                params={{ modul: id }}
                className={stil}
                activeProps={{ className: '!text-foreground [&_svg]:!text-accent' }}
              >
                <ModulIcon name={m.icon} className="size-5" />
                <span className="max-w-full truncate px-1">{m.titel[sprache]}</span>
              </Link>
            )
          })}
        <button
          type="button"
          className={stil}
          onClick={() => {
            setOffen(true)
          }}
          aria-label={t('nav.mehr')}
        >
          <Menu className="size-5" aria-hidden="true" />
          <span>{t('nav.mehr')}</span>
        </button>
      </nav>

      <DialogPrimitive.Root open={offen} onOpenChange={setOffen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="animate-einblenden fixed inset-0 z-50 bg-[rgb(2_10_24/0.5)] md:hidden" />
          <DialogPrimitive.Content
            className="animate-einblenden shadow-pop fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] pt-[env(safe-area-inset-top,0px)] outline-none md:hidden"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">{t('nav.haupt')}</DialogPrimitive.Title>
            <Seitenleiste
              imMenue
              onNavigiert={() => {
                setOffen(false)
              }}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
