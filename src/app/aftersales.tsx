import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, REITER, Service, type Reiter } from '@/modules/aftersales'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  fall?: string
  /** Service-Fall aus einer Mail im Posteingang eröffnen. */
  ausMail?: string
}

const GUELTIG = new Set<string>(REITER)

/** Service & Garantie: Reiter und offener Fall in der Adresse (#/aftersales?fall=…). */
export const Route = createFileRoute('/aftersales')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.fall === 'string' && s.fall ? { fall: s.fall } : {}),
    ...(typeof s.ausMail === 'string' && s.ausMail ? { ausMail: s.ausMail } : {}),
  }),
  component: function ServiceSeite() {
    const { reiter, fall, ausMail } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Service
          reiter={reiter ?? 'faelle'}
          fallId={fall ?? null}
          ausMail={ausMail ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? reiter ?? 'faelle'
            const f = z.fall === undefined ? fall : z.fall
            // Jede Navigation schliesst die Übernahme aus dem Posteingang ab (Fall erfasst oder abgebrochen).
            void navigate({ search: { ...(r !== 'faelle' ? { reiter: r } : {}), ...(f ? { fall: f } : {}) } })
          }}
        />
      </Suspense>
    )
  },
})
