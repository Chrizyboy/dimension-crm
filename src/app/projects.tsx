import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { AKTE_REITER, meta, Projekte, REITER, type AkteReiter, type Reiter } from '@/modules/projects'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  projekt?: string
  akte?: AkteReiter
}

const GUELTIG = new Set<string>(REITER)
const AKTE = new Set<string>(AKTE_REITER)

/** Projekte & Montage: Reiter, offenes Projekt und Reiter der Akte in der Adresse. */
export const Route = createFileRoute('/projects')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.projekt === 'string' && s.projekt ? { projekt: s.projekt } : {}),
    ...(typeof s.akte === 'string' && AKTE.has(s.akte) ? { akte: s.akte as AkteReiter } : {}),
  }),
  component: function ProjekteSeite() {
    const { reiter, projekt, akte } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Projekte
          reiter={reiter ?? 'baustellen'}
          projektId={projekt ?? null}
          akte={akte ?? 'uebersicht'}
          onNavigation={(z) => {
            const r = z.reiter ?? reiter ?? 'baustellen'
            const p = z.projekt === undefined ? projekt : z.projekt
            const a = z.projekt !== undefined ? undefined : (z.akte ?? akte)
            void navigate({
              search: {
                ...(r !== 'baustellen' ? { reiter: r } : {}),
                ...(p ? { projekt: p } : {}),
                ...(p && a && a !== 'uebersicht' ? { akte: a } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
