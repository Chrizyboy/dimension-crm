import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, meta, Posteingang, REITER, type Ansicht, type Reiter } from '@/modules/inbox'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  ansicht?: Ansicht
  mail?: string
}

const REITER_OK = new Set<string>(REITER)
const ANSICHT_OK = new Set<string>(ANSICHTEN)

/** Posteingang: Reiter, Filter und offene Mail in der Adresse (#/inbox?ansicht=meine&mail=…). */
export const Route = createFileRoute('/inbox')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && REITER_OK.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.ansicht === 'string' && ANSICHT_OK.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(typeof s.mail === 'string' && s.mail ? { mail: s.mail } : {}),
  }),
  component: function PosteingangSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Posteingang
          reiter={suche.reiter ?? 'eingang'}
          ansicht={suche.ansicht ?? 'warten'}
          mailId={suche.mail ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? suche.reiter ?? 'eingang'
            const a = z.ansicht ?? suche.ansicht ?? 'warten'
            const m = z.mail === undefined ? suche.mail : z.mail
            void navigate({
              search: {
                ...(r !== 'eingang' ? { reiter: r } : {}),
                ...(a !== 'warten' ? { ansicht: a } : {}),
                ...(m ? { mail: m } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
