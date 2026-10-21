import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/layouts/AppShell'

/** Wurzel aller Ansichten: jede Seite liegt im App-Rahmen. */
export const Route = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
