import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul, hatRecht } from '@/lib/rechte'
import { Baustelle, meta, REITER, type Reiter } from '@/modules/fieldwork'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  rapport?: string
  baustelle?: string
}

const GUELTIG = new Set<string>(REITER)

/** Baustelle & Rapporte: Reiter, offener Rapport und offene Baustellen-Akte in der Adresse. */
export const Route = createFileRoute('/fieldwork')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.rapport === 'string' && s.rapport ? { rapport: s.rapport } : {}),
    ...(typeof s.baustelle === 'string' && s.baustelle ? { baustelle: s.baustelle } : {}),
  }),
  component: function BaustelleSeite() {
    const { reiter, rapport, baustelle } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    // Projektleitung und GL beginnen bei «Baustellen heute», Monteure bei «Mein Tag».
    const standard: Reiter = hatRecht(ich, 'preise') ? 'heute' : 'tag'
    const aktiv = reiter ?? standard
    return (
      <Suspense>
        <Baustelle
          reiter={aktiv}
          rapportId={rapport ?? null}
          baustelleId={baustelle ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? aktiv
            const b = z.rapport === undefined ? rapport : z.rapport
            const p = z.baustelle === undefined ? baustelle : z.baustelle
            void navigate({
              search: {
                ...(r !== standard ? { reiter: r } : {}),
                ...(b ? { rapport: b } : {}),
                ...(p ? { baustelle: p } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
