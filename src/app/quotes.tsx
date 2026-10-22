import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Offerten, OFFERT_ANSICHTEN, type OffertAnsicht } from '@/modules/quotes'
import { useAnmeldung } from '@/stores/anmeldung'

interface OffertSuche {
  ansicht?: OffertAnsicht
  offerte?: string
  lead?: string
}

const ANSICHTEN = new Set<string>(OFFERT_ANSICHTEN)

/**
 * Offerten: Neue Offerten, Offerten Muri und Bulle, Nachfassen und PDF-Import.
 * Reiter und offene Offerte stehen in der Adresse (#/quotes?ansicht=nachfassen&offerte=…).
 */
export const Route = createFileRoute('/quotes')({
  validateSearch: (s: Record<string, unknown>): OffertSuche => ({
    ...(typeof s.ansicht === 'string' && ANSICHTEN.has(s.ansicht) ? { ansicht: s.ansicht as OffertAnsicht } : {}),
    ...(typeof s.offerte === 'string' && s.offerte ? { offerte: s.offerte } : {}),
    ...(typeof s.lead === 'string' && s.lead ? { lead: s.lead } : {}),
  }),
  component: function OffertenSeite() {
    const { ansicht, offerte, lead } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const ziel = ansicht ?? 'eingang'
    return (
      <Suspense>
        <Offerten
          ansicht={ziel}
          offerteId={offerte ?? null}
          leadId={lead ?? null}
          onAdresse={(a) => {
            const n = { ansicht: ziel, offerte: offerte ?? null, lead: lead ?? null, ...a }
            void navigate({
              search: {
                ...(n.ansicht !== 'eingang' ? { ansicht: n.ansicht } : {}),
                ...(n.offerte ? { offerte: n.offerte } : {}),
                ...(n.lead ? { lead: n.lead } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
