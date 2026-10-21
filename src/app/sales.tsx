import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Verkauf, VERKAUF_ANSICHTEN, type VerkaufAnsicht } from '@/modules/sales'
import { useAnmeldung } from '@/stores/anmeldung'

interface VerkaufSuche {
  ansicht?: VerkaufAnsicht
  lead?: string
  neu?: boolean
}

const ANSICHTEN = new Set<string>(VERKAUF_ANSICHTEN)

/**
 * Anfragen & Leads: Pipeline, Liste, Tagesroute, Tour, Kalender, Regionen und Monatsbericht.
 * Ansicht und offener Lead stehen in der Adresse (#/sales?ansicht=liste&lead=…), «neu» öffnet das Formular.
 */
export const Route = createFileRoute('/sales')({
  validateSearch: (s: Record<string, unknown>): VerkaufSuche => ({
    ...(typeof s.ansicht === 'string' && ANSICHTEN.has(s.ansicht) ? { ansicht: s.ansicht as VerkaufAnsicht } : {}),
    ...(typeof s.lead === 'string' && s.lead ? { lead: s.lead } : {}),
    ...(s.neu === true || s.neu === 'true' || s.neu === 1 ? { neu: true } : {}),
  }),
  component: function VerkaufSeite() {
    const { ansicht, lead, neu } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const ziel = ansicht ?? 'pipeline'
    return (
      <Suspense>
        <Verkauf
          ansicht={ziel}
          leadId={lead ?? null}
          neu={neu ?? false}
          onAdresse={(a) => {
            const n = { ansicht: ziel, lead: lead ?? null, neu: false, ...a }
            void navigate({
              search: {
                ...(n.ansicht !== 'pipeline' ? { ansicht: n.ansicht } : {}),
                ...(n.lead ? { lead: n.lead } : {}),
                ...(n.neu ? { neu: true } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
