import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Einkauf, meta, REITER, type Reiter } from '@/modules/purchasing'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  bestellung?: string
  projekt?: string
}

const GUELTIG = new Set<string>(REITER)

/** Einkauf & Material: Reiter, offene Bestellung und Projekt der Materialliste in der Adresse. */
export const Route = createFileRoute('/purchasing')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.bestellung === 'string' && s.bestellung ? { bestellung: s.bestellung } : {}),
    ...(typeof s.projekt === 'string' && s.projekt ? { projekt: s.projekt } : {}),
  }),
  component: function EinkaufSeite() {
    const { reiter, bestellung, projekt } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    // Ein Projekt (Materialliste) gehört zum Reiter «Material», auch wenn es per Link geöffnet wird.
    const aktiv = reiter ?? (projekt ? 'material' : 'bestellungen')
    return (
      <Suspense>
        <Einkauf
          reiter={aktiv}
          bestellungId={bestellung ?? null}
          projektId={projekt ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? aktiv
            const b = z.bestellung === undefined ? bestellung : z.bestellung
            const p = z.projekt === undefined ? projekt : z.projekt
            void navigate({
              search: {
                ...(r !== 'bestellungen' ? { reiter: r } : {}),
                ...(b ? { bestellung: b } : {}),
                ...(p && r === 'material' ? { projekt: p } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
