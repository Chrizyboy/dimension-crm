import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, REITER, Team, type TeamReiter } from '@/modules/staff'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: TeamReiter
  person?: string
  kurs?: string
}

const GUELTIG = new Set<string>(REITER)
const text = (x: unknown) => (typeof x === 'string' && x ? x : undefined)

/** Team & Ausweise: Reiter, offene Person und offener Kurs in der Adresse (#/staff?reiter=kurse&kurs=…). */
export const Route = createFileRoute('/staff')({
  validateSearch: (s: Record<string, unknown>): Suche => {
    const person = text(s.person)
    const kurs = text(s.kurs)
    return {
      ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as TeamReiter } : {}),
      ...(person ? { person } : {}),
      ...(kurs ? { kurs } : {}),
    }
  },
  component: function TeamSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Team
          reiter={suche.reiter ?? 'team'}
          personId={suche.person ?? null}
          kursId={suche.kurs ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? suche.reiter ?? 'team'
            const p = z.person === undefined ? suche.person : z.person
            const k = z.kurs === undefined ? suche.kurs : z.kurs
            void navigate({
              search: {
                ...(r !== 'team' ? { reiter: r } : {}),
                ...(p ? { person: p } : {}),
                ...(k ? { kurs: k } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
