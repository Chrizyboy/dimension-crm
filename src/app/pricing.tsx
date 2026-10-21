import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Preise, PREIS_ANSICHTEN, type PreisAnsicht } from '@/modules/pricing'
import { useAnmeldung } from '@/stores/anmeldung'

interface PreisSuche {
  ansicht?: PreisAnsicht
  artikel?: string
  offerte?: string
}

const ANSICHTEN = new Set<string>(PREIS_ANSICHTEN)

/**
 * Preise: Preisliste, Archiv, Kundenansicht und Kalkulation (#/pricing?ansicht=kalkulation&offerte=…).
 */
export const Route = createFileRoute('/pricing')({
  validateSearch: (s: Record<string, unknown>): PreisSuche => ({
    ...(typeof s.ansicht === 'string' && ANSICHTEN.has(s.ansicht) ? { ansicht: s.ansicht as PreisAnsicht } : {}),
    ...(typeof s.artikel === 'string' && s.artikel ? { artikel: s.artikel } : {}),
    ...(typeof s.offerte === 'string' && s.offerte ? { offerte: s.offerte } : {}),
  }),
  component: function PreiseSeite() {
    const { ansicht, artikel, offerte } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Preise
          ansicht={ansicht ?? null}
          artikelId={artikel ?? null}
          offerteId={offerte ?? null}
          onAdresse={(a) => {
            const n = { ansicht: ansicht ?? null, artikel: artikel ?? null, offerte: offerte ?? null, ...a }
            void navigate({
              search: {
                ...(n.ansicht ? { ansicht: n.ansicht } : {}),
                ...(n.artikel ? { artikel: n.artikel } : {}),
                ...(n.offerte ? { offerte: n.offerte } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
