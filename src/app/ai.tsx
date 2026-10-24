import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ANSICHTEN, KiSeite, type Ansicht } from '@/modules/ai'

const GUELTIG = new Set<string>(ANSICHTEN)

/** KI-Assistent: Reiter in der Adresse (#/ai?ansicht=kosten). Einstellungen sieht nur die Administration. */
export const Route = createFileRoute('/ai')({
  validateSearch: (s: Record<string, unknown>): { ansicht?: Ansicht } =>
    typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {},
  component: function AiSeite() {
    const { ansicht } = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <Suspense>
        <KiSeite
          ansicht={ansicht ?? 'assistent'}
          onAnsicht={(a) => {
            void navigate({ search: a === 'assistent' ? {} : { ansicht: a } })
          }}
        />
      </Suspense>
    )
  },
})
