import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, Grossprojekte, meta, type Ansicht } from '@/modules/contracting'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  projekt?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)

/** Grossprojekte (Contracting): Reiter und offene Akte in der Adresse (#/contracting?ansicht=alle&projekt=…). */
export const Route = createFileRoute('/contracting')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(typeof s.projekt === 'string' && s.projekt ? { projekt: s.projekt } : {}),
  }),
  component: function GrossprojekteSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Grossprojekte
          ansicht={suche.ansicht ?? 'pruefen'}
          projektId={suche.projekt ?? null}
          onNavigation={(z) => {
            const a = z.ansicht ?? suche.ansicht ?? 'pruefen'
            const p = z.projekt === undefined ? suche.projekt : z.projekt
            void navigate({ search: { ...(a !== 'pruefen' ? { ansicht: a } : {}), ...(p ? { projekt: p } : {}) } })
          }}
        />
      </Suspense>
    )
  },
})
