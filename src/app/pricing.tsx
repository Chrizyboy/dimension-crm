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
  kalkulation?: string
}

const ANSICHTEN = new Set<string>(PREIS_ANSICHTEN)

/**
 * Preise: Preisliste, Preisänderungen, Kalkulation, Leistungen & Regeln, Kundenansicht, Archiv
 * (#/pricing?ansicht=kalkulation&offerte=… oder &kalkulation=… aus der Glocke).
 */
export const Route = createFileRoute('/pricing')({
  validateSearch: (s: Record<string, unknown>): PreisSuche => ({
    ...(typeof s.ansicht === 'string' && ANSICHTEN.has(s.ansicht) ? { ansicht: s.ansicht as PreisAnsicht } : {}),
    ...(typeof s.artikel === 'string' && s.artikel ? { artikel: s.artikel } : {}),
    ...(typeof s.offerte === 'string' && s.offerte ? { offerte: s.offerte } : {}),
    ...(typeof s.kalkulation === 'string' && s.kalkulation ? { kalkulation: s.kalkulation } : {}),
  }),
  component: function PreiseSeite() {
    const { ansicht, artikel, offerte, kalkulation } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Preise
          ansicht={ansicht ?? null}
          artikelId={artikel ?? null}
          offerteId={offerte ?? null}
          kalkulationId={kalkulation ?? null}
          onAdresse={(a) => {
            const n = {
              ansicht: ansicht ?? null,
              artikel: artikel ?? null,
              offerte: offerte ?? null,
              kalkulation: kalkulation ?? null,
              ...a,
            }
            void navigate({
              search: {
                ...(n.ansicht ? { ansicht: n.ansicht } : {}),
                ...(n.artikel ? { artikel: n.artikel } : {}),
                ...(n.offerte ? { offerte: n.offerte } : {}),
                ...(n.kalkulation ? { kalkulation: n.kalkulation } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
