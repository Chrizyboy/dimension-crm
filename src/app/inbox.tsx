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
/** Alte Links (vor dem Arbeitsplatz) zeigen weiter auf die passende Ansicht. */
const ALT: Record<string, Ansicht> = { neu: 'warten', meine_offen: 'meine' }
const ansichtAus = (a: unknown): Ansicht | undefined =>
  typeof a !== 'string' ? undefined : ANSICHT_OK.has(a) ? (a as Ansicht) : ALT[a]

/** Posteingang: Reiter, Filter und offene Mail in der Adresse (#/inbox?ansicht=meine&mail=…). */
export const Route = createFileRoute('/inbox')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && REITER_OK.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(ansichtAus(s.ansicht) ? { ansicht: ansichtAus(s.ansicht) as Ansicht } : {}),
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
          ansicht={suche.ansicht ?? 'meine'}
          mailId={suche.mail ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? suche.reiter ?? 'eingang'
            const a = z.ansicht ?? suche.ansicht ?? 'meine'
            const m = z.mail === undefined ? suche.mail : z.mail
            void navigate({
              search: {
                ...(r !== 'eingang' ? { reiter: r } : {}),
                ...(a !== 'meine' ? { ansicht: a } : {}),
                ...(m ? { mail: m } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
