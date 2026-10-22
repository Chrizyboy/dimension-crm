import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useCallback } from 'react'
import { MeinKonto } from '@/modules/settings'

/**
 * «Mein Konto»: eigenes Profil, für jede angemeldete Person (über das Konto-Menü oben rechts).
 * Nach «Mit Microsoft verbinden» kommt man hierher zurück, mit dem Ergebnis in der Adresse (?microsoft=ok).
 */
export const Route = createFileRoute('/konto')({
  validateSearch: (s: Record<string, unknown>): { microsoft?: string } =>
    typeof s.microsoft === 'string' && /^[a-z_.]{1,40}$/.test(s.microsoft) ? { microsoft: s.microsoft } : {},
  component: function KontoSeite() {
    const { microsoft } = Route.useSearch()
    const navigate = Route.useNavigate()
    const gelesen = useCallback(() => void navigate({ search: {}, replace: true }), [navigate])
    return (
      <Suspense>
        <MeinKonto {...(microsoft ? { microsoft } : {})} onMicrosoftGelesen={gelesen} />
      </Suspense>
    )
  },
})
