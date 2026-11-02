import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ALTE_REITER, Finanzen, meta, REITER, type Reiter } from '@/modules/finance'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
}

const GUELTIG = new Set<string>(REITER)

/** Finanzen: Reiter in der Adresse (#/finance?reiter=zahllauf); alte Adressen (?reiter=zahlungen) führen weiter. */
export const Route = createFileRoute('/finance')({
  validateSearch: (s: Record<string, unknown>): Suche => {
    if (typeof s.reiter !== 'string') return {}
    if (GUELTIG.has(s.reiter)) return { reiter: s.reiter as Reiter }
    const neu = ALTE_REITER[s.reiter]
    return neu ? { reiter: neu } : {}
  },
  component: function FinanzenSeite() {
    const { reiter } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Finanzen
          reiter={reiter ?? 'cockpit'}
          onReiter={(r) => {
            void navigate({ search: r === 'cockpit' ? {} : { reiter: r } })
          }}
        />
      </Suspense>
    )
  },
})
