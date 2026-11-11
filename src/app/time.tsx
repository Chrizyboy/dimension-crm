import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, REITER, Zeiterfassung, type ZeitReiter } from '@/modules/time'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: ZeitReiter
  person?: string
}

const GUELTIG = new Set<string>(REITER)

/** Zeiterfassung: Reiter und (für die Zeit-Leitung) die gezeigte Person in der Adresse (#/time?reiter=…&person=…). */
export const Route = createFileRoute('/time')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as ZeitReiter } : {}),
    ...(typeof s.person === 'string' && s.person ? { person: s.person } : {}),
  }),
  component: function ZeitSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Zeiterfassung
          reiter={suche.reiter ?? 'meine'}
          personId={suche.person ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? suche.reiter ?? 'meine'
            const p = z.person === undefined ? suche.person : z.person
            void navigate({ search: { ...(r !== 'meine' ? { reiter: r } : {}), ...(p ? { person: p } : {}) } })
          }}
        />
      </Suspense>
    )
  },
})
