import { Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { TooltipAnbieter } from '@/components/ui/tooltip'
import { useOberflaeche } from '@/hooks/useOberflaeche'
import { useTastenkuerzel } from '@/hooks/useTastenkuerzel'
import { useUpdatePruefung } from '@/hooks/useUpdatePruefung'
import { cn } from '@/lib/utils'
import { AssistentFenster } from '@/modules/ai'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { Befehlspalette } from './Befehlspalette'
import { KuerzelHilfe } from './KuerzelHilfe'
import { HandyNavigation } from './HandyNavigation'
import { Kopfzeile } from './Kopfzeile'
import { Seitenleiste } from './Seitenleiste'

/**
 * Rahmen jeder Ansicht: Seitenleiste links (einklappbar), Kopfzeile oben, Inhalt rechts.
 * Am Handy: Leiste unten statt Seitenleiste, Menü über «Mehr».
 * Einfache Ansicht (Monteure): ohne Seitenleiste und Handy-Leiste, nur Kopfzeile und Inhalt.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  useOberflaeche()
  useTastenkuerzel()
  useUpdatePruefung()
  const eingeklappt = useUi((z) => z.seitenleisteEingeklappt)
  const darstellung = useUi((z) => z.darstellung)
  const einfach = useAnmeldung((z) => z.ich?.ansicht === 'einfach')
  // Erst laden, wenn jemand Ctrl J drückt (spart Startzeit).
  const assistent = useUi((z) => z.assistentOffen)

  return (
    <TooltipAnbieter delayDuration={300}>
      <a
        href="#inhalt"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('inhalt')?.focus()
        }}
        className="bg-surface shadow-pop sr-only z-[60] rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('nav.zumInhalt')}
      </a>
      <div className="flex h-full">
        {!einfach && (
          <aside
            className={cn('hidden shrink-0 transition-[width] duration-200 md:block', eingeklappt ? 'w-14' : 'w-60')}
          >
            <Seitenleiste />
          </aside>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <Kopfzeile />
          <main
            id="inhalt"
            tabIndex={-1}
            className={cn(
              // relative: Absolut platzierte Elemente (z. B. sr-only-Texte) bleiben im Scrollbereich,
              // sonst verlängern sie die ganze Seite und das Fenster scrollt mit.
              'relative min-h-0 flex-1 overflow-y-auto outline-none',
              einfach
                ? 'pb-[env(safe-area-inset-bottom,0px)]'
                : 'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0',
            )}
          >
            {children}
          </main>
        </div>
      </div>
      {!einfach && <HandyNavigation />}
      <Befehlspalette />
      {assistent && (
        <Suspense>
          <AssistentFenster />
        </Suspense>
      )}
      <KuerzelHilfe />
      <Toaster
        position="bottom-right"
        theme={darstellung === 'hell' ? 'light' : darstellung === 'dunkel' ? 'dark' : 'system'}
        offset={{ bottom: 16, right: 16 }}
        mobileOffset={{ bottom: 72 }}
        toastOptions={{ className: '!font-sans !rounded-lg !border-border !shadow-pop' }}
        richColors
        closeButton
      />
    </TooltipAnbieter>
  )
}
