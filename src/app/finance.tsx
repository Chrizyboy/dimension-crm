import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Finanzen, meta, REITER, type Reiter } from '@/modules/finance'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
}

const GUELTIG = new Set<string>(REITER)

/** Finanzen: Reiter in der Adresse (#/finance?reiter=zahlungen). */
export const Route = createFileRoute('/finance')({
  validateSearch: (s: Record<string, unknown>): Suche =>
    typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {},
  component: function FinanzenSeite() {
    const { reiter } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Finanzen
          reiter={reiter ?? 'uebersicht'}
          onReiter={(r) => {
            void navigate({ search: r === 'uebersicht' ? {} : { reiter: r } })
          }}
        />
      </Suspense>
    )
  },
})
