import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, createHashHistory, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/i18n'
import './index.css'
import { starteFehlerueberwachung } from '@/services/fehler'
import { starteAnmeldung } from '@/stores/anmeldung'
import { routeTree } from './routeTree.gen'

// Möglichst früh, damit auch Fehler beim Start gemeldet werden. Läuft im Hintergrund, die App wartet nicht darauf.
void starteFehlerueberwachung()
// Sitzung prüfen, bevor die erste Ansicht erscheint (zeigt sonst kurz die Anmeldeseite).
starteAnmeldung()

/**
 * Daten bleiben 30 s frisch und werden beim Zurückkehren ins Fenster still aktualisiert.
 * Ab Phase 3 kommt der lokale Datenbestand mit Realtime-Abgleich dazu.
 */
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

// Hash-Adressen (#/sales) funktionieren überall gleich: in der Windows-App, als PWA und als Datei-Vorschau.
const router = createRouter({ routeTree, history: createHashHistory(), defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('Element #root fehlt in index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
