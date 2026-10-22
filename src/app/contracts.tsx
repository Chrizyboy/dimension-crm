import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Vertraege } from '@/modules/contracts'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  vertrag?: string
}

/** Wartungsverträge: offener Vertrag in der Adresse (#/contracts?vertrag=…). */
export const Route = createFileRoute('/contracts')({
  validateSearch: (s: Record<string, unknown>): Suche =>
    typeof s.vertrag === 'string' && s.vertrag ? { vertrag: s.vertrag } : {},
  component: function VertraegeSeite() {
    const { vertrag } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Vertraege
          vertragId={vertrag ?? null}
          onOeffnen={(id) => {
            void navigate({ search: id ? { vertrag: id } : {} })
          }}
        />
      </Suspense>
    )
  },
})
