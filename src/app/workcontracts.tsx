import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Werkvertraege } from '@/modules/workcontracts'
import { useAnmeldung } from '@/stores/anmeldung'

interface VertragSuche {
  vertrag?: string
  auftrag?: string
}

/**
 * Werkverträge: Liste, offener Vertrag (?vertrag=…) und «Auftrag erstellen» zu einer Offerte (?auftrag=…).
 */
export const Route = createFileRoute('/workcontracts')({
  validateSearch: (s: Record<string, unknown>): VertragSuche => ({
    ...(typeof s.vertrag === 'string' && s.vertrag ? { vertrag: s.vertrag } : {}),
    ...(typeof s.auftrag === 'string' && s.auftrag ? { auftrag: s.auftrag } : {}),
  }),
  component: function WerkvertraegeSeite() {
    const { vertrag, auftrag } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Werkvertraege
          vertragId={vertrag ?? null}
          auftragOfferteId={auftrag ?? null}
          onAdresse={(a) => {
            const n = { vertrag: vertrag ?? null, auftrag: auftrag ?? null, ...a }
            void navigate({
              search: { ...(n.vertrag ? { vertrag: n.vertrag } : {}), ...(n.auftrag ? { auftrag: n.auftrag } : {}) },
            })
          }}
        />
      </Suspense>
    )
  },
})
