import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, Fuhrpark, meta, type Ansicht } from '@/modules/fleet'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  fahrzeug?: string
  geraet?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)
const text = (x: unknown) => (typeof x === 'string' && x ? x : undefined)

/** Fahrzeuge & Geräte: Reiter und offene Akte in der Adresse (#/fleet?fahrzeug=… oder ?ansicht=geraete&geraet=…). */
export const Route = createFileRoute('/fleet')({
  validateSearch: (s: Record<string, unknown>): Suche => {
    const fahrzeug = text(s.fahrzeug)
    const geraet = text(s.geraet)
    return {
      ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
      ...(fahrzeug ? { fahrzeug } : {}),
      ...(geraet ? { geraet } : {}),
    }
  },
  component: function FuhrparkSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Fuhrpark
          ansicht={suche.ansicht ?? 'fahrzeuge'}
          fahrzeugId={suche.fahrzeug ?? null}
          geraetId={suche.geraet ?? null}
          onNavigation={(z) => {
            const a = z.ansicht ?? suche.ansicht ?? 'fahrzeuge'
            const f = z.fahrzeug === undefined ? suche.fahrzeug : z.fahrzeug
            const g = z.geraet === undefined ? suche.geraet : z.geraet
            void navigate({
              search: {
                ...(a !== 'fahrzeuge' ? { ansicht: a } : {}),
                ...(f ? { fahrzeug: f } : {}),
                ...(g ? { geraet: g } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
