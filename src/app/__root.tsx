import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { buttonVariants } from '@/components/ui/button'
import { AnmeldeTor } from '@/layouts/AnmeldeTor'
import { AppShell } from '@/layouts/AppShell'
import { meldeFehler } from '@/services/fehler'

/** Wurzel aller Ansichten: jede Seite liegt im App-Rahmen, auch Fehler- und «nicht gefunden»-Seiten. */
export const Route = createRootRoute({
  component: () => (
    <AnmeldeTor>
      <AppShell>
        <Outlet />
      </AppShell>
    </AnmeldeTor>
  ),
  errorComponent: function FehlerSeite({ error, reset }) {
    const router = useRouter()
    useEffect(() => {
      meldeFehler(error, 'ansicht')
    }, [error])
    return (
      <AppShell>
        <Fehlerzustand
          ebene="h1"
          details={error instanceof Error ? error.message : String(error)}
          onNochmal={() => {
            reset()
            void router.invalidate()
          }}
        />
      </AppShell>
    )
  },
  notFoundComponent: function NichtGefunden() {
    const { t } = useTranslation()
    return (
      <Leerzustand
        className="py-24"
        icon={Compass}
        titel={t('fehler.nichtGefundenTitel')}
        text={t('fehler.nichtGefundenText')}
        aktion={
          <Link to="/" className={buttonVariants({ variant: 'secondary' })}>
            {t('fehler.startseite')}
          </Link>
        }
      />
    )
  },
})
