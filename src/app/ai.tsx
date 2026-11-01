import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, KiSeite, meta, type Ansicht } from '@/modules/ai'
import { useAnmeldung } from '@/stores/anmeldung'

const GUELTIG = new Set<string>(ANSICHTEN)

/** KI-Assistent: Reiter in der Adresse (#/ai?ansicht=kosten). Einstellungen sieht nur die Administration. */
export const Route = createFileRoute('/ai')({
  validateSearch: (s: Record<string, unknown>): { ansicht?: Ansicht } =>
    typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {},
  component: function AiSeite() {
    const { ansicht } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    // Wie bei den anderen Bereichen: ohne «KI-Assistent» in der Rolle (z. B. Montage) kein Zugang über die Adresse.
    if (!darfModul(meta, ich)) return <KeinZugriff />
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
