import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, meta, Spesen, type Ansicht } from '@/modules/expenses'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
}

const GUELTIG = new Set<string>(ANSICHTEN)

/** Spesen: Ansicht in der Adresse (#/expenses?ansicht=alle). */
export const Route = createFileRoute('/expenses')({
  validateSearch: (s: Record<string, unknown>): Suche =>
    typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {},
  component: function SpesenSeite() {
    const { ansicht } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Spesen
          ansicht={ansicht ?? 'meine'}
          onAnsicht={(a) => {
            void navigate({ search: a === 'meine' ? {} : { ansicht: a } })
          }}
        />
      </Suspense>
    )
  },
})
