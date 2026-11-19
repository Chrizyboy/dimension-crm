import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useCallback } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, meta, Spesen, type Ansicht } from '@/modules/expenses'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  /** Erfassen gleich öffnen (Knopf «Spese erfassen» auf «Mein Tag»). */
  neu?: 'beleg' | 'kilometer'
}

const GUELTIG = new Set<string>(ANSICHTEN)

/** Spesen: Ansicht in der Adresse (#/expenses?ansicht=alle), `neu=beleg` öffnet gleich das Erfassen. */
export const Route = createFileRoute('/expenses')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(s.neu === 'beleg' || s.neu === 'kilometer' ? { neu: s.neu } : {}),
  }),
  component: function SpesenSeite() {
    const { ansicht, neu } = Route.useSearch()
    const navigate = Route.useNavigate()
    const zeige = useCallback(
      (a: Ansicht) => {
        void navigate({ search: a === 'meine' ? {} : { ansicht: a }, replace: true })
      },
      [navigate],
    )
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Spesen ansicht={ansicht ?? 'meine'} erfassen={neu ?? null} onAnsicht={zeige} />
      </Suspense>
    )
  },
})
