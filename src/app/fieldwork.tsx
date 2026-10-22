import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Baustelle, meta, REITER, type Reiter } from '@/modules/fieldwork'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  rapport?: string
}

const GUELTIG = new Set<string>(REITER)

/** Baustelle & Rapporte: Reiter und offener Rapport in der Adresse. */
export const Route = createFileRoute('/fieldwork')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.rapport === 'string' && s.rapport ? { rapport: s.rapport } : {}),
  }),
  component: function BaustelleSeite() {
    const { reiter, rapport } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const aktiv = reiter ?? 'tag'
    return (
      <Suspense>
        <Baustelle
          reiter={aktiv}
          rapportId={rapport ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? aktiv
            const b = z.rapport === undefined ? rapport : z.rapport
            void navigate({ search: { ...(r !== 'tag' ? { reiter: r } : {}), ...(b ? { rapport: b } : {}) } })
          }}
        />
      </Suspense>
    )
  },
})
