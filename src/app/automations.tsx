import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, Automationen, meta, type Ansicht } from '@/modules/automations'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  automation?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)

/** Automationen: Reiter und gefilterte Automation in der Adresse (#/automations?ansicht=protokoll&automation=…). */
export const Route = createFileRoute('/automations')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(typeof s.automation === 'string' && s.automation ? { automation: s.automation } : {}),
  }),
  component: function AutomationenSeite() {
    const { ansicht, automation } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Automationen
          ansicht={ansicht ?? 'liste'}
          automationId={automation ?? null}
          onAdresse={(a) => {
            void navigate({
              search: {
                ...(a.ansicht === 'liste' ? {} : { ansicht: a.ansicht }),
                ...(a.automation ? { automation: a.automation } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
