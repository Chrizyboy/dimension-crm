import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Ausschreibungen, meta, REITER, type Reiter } from '@/modules/tenders'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  dossier?: string
  reiter?: Reiter
}

const GUELTIG = new Set<string>(REITER)

/** Ausschreibungs-Monitor: Reiter und offenes Dossier in der Adresse (#/tenders?reiter=senden&dossier=…). */
export const Route = createFileRoute('/tenders')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.dossier === 'string' && s.dossier ? { dossier: s.dossier } : {}),
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
  }),
  component: function AusschreibungenSeite() {
    const { dossier, reiter } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Ausschreibungen
          dossierId={dossier ?? null}
          reiter={reiter ?? 'pruefen'}
          onNavigation={(z) => {
            const r = z.reiter ?? reiter ?? 'pruefen'
            const d = z.dossier === undefined ? dossier : z.dossier
            void navigate({ search: { ...(r !== 'pruefen' ? { reiter: r } : {}), ...(d ? { dossier: d } : {}) } })
          }}
        />
      </Suspense>
    )
  },
})
