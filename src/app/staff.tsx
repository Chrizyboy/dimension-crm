import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Team } from '@/modules/staff'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  person?: string
}

/** Team & Ausweise: offene Person in der Adresse (#/staff?person=…). */
export const Route = createFileRoute('/staff')({
  validateSearch: (s: Record<string, unknown>): Suche =>
    typeof s.person === 'string' && s.person ? { person: s.person } : {},
  component: function TeamSeite() {
    const { person } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Team
          personId={person ?? null}
          onPerson={(id) => {
            void navigate({ search: id ? { person: id } : {} })
          }}
        />
      </Suspense>
    )
  },
})
