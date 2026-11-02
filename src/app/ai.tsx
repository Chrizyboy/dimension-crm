import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, KiSeite, meta, type Ansicht } from '@/modules/ai'
import { useAnmeldung } from '@/stores/anmeldung'

const GUELTIG = new Set<string>(ANSICHTEN)
const UUID = /^[0-9a-f-]{36}$/i

interface Suche {
  ansicht?: Ansicht
  gespraech?: string
}

/** Assistent: Reiter und offenes Gespräch in der Adresse (#/ai?ansicht=verlauf, #/ai?gespraech=…). */
export const Route = createFileRoute('/ai')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(typeof s.gespraech === 'string' && UUID.test(s.gespraech) ? { gespraech: s.gespraech } : {}),
  }),
  component: function AiSeite() {
    const { ansicht, gespraech } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    // Wie bei den anderen Bereichen: ohne «Assistent» in der Rolle (z. B. Montage) kein Zugang über die Adresse.
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <KiSeite
          ansicht={ansicht ?? 'fragen'}
          gespraech={gespraech ?? null}
          onAnsicht={(a, g) => {
            void navigate({
              search: {
                ...(a === 'fragen' ? {} : { ansicht: a }),
                ...(a === 'fragen' && g ? { gespraech: g } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
