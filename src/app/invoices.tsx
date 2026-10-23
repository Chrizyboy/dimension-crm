import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Rechnungen, REITER, type Reiter } from '@/modules/invoices'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  rechnung?: string
}

const GUELTIG = new Set<string>(REITER)

/** Rechnungen: Reiter und offene Rechnung in der Adresse (#/invoices?reiter=verrechnen&rechnung=…). */
export const Route = createFileRoute('/invoices')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.rechnung === 'string' && s.rechnung ? { rechnung: s.rechnung } : {}),
  }),
  component: function RechnungenSeite() {
    const { reiter, rechnung } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const aktiv = reiter ?? 'rechnungen'
    return (
      <Suspense>
        <Rechnungen
          reiter={aktiv}
          rechnungId={rechnung ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? aktiv
            const id = z.rechnung === undefined ? rechnung : z.rechnung
            void navigate({
              search: {
                ...(r !== 'rechnungen' ? { reiter: r } : {}),
                ...(id ? { rechnung: id } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
