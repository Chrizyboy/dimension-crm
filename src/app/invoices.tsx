import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul, hatRecht } from '@/lib/rechte'
import { meta, Rechnungen, REITER, type Reiter } from '@/modules/invoices'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: Reiter
  rechnung?: string
  eingang?: string
}

const GUELTIG = new Set<string>(REITER)

/**
 * Rechnungen: Reiter, offene Rechnung und Eingangsrechnung in der Adresse (#/invoices?reiter=eingang&eingang=…).
 * Erster Reiter: Buchhaltung «Übersicht», alle anderen «Meine Projekte».
 */
export const Route = createFileRoute('/invoices')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.reiter === 'string' && GUELTIG.has(s.reiter) ? { reiter: s.reiter as Reiter } : {}),
    ...(typeof s.rechnung === 'string' && s.rechnung ? { rechnung: s.rechnung } : {}),
    ...(typeof s.eingang === 'string' && s.eingang ? { eingang: s.eingang } : {}),
  }),
  component: function RechnungenSeite() {
    const { reiter, rechnung, eingang } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const standard: Reiter = !ich || hatRecht(ich, 'finanzen') ? 'uebersicht' : 'projekte'
    const aktiv = reiter ?? (eingang ? 'eingang' : standard)
    return (
      <Suspense>
        <Rechnungen
          reiter={aktiv}
          rechnungId={rechnung ?? null}
          eingangId={eingang ?? null}
          onNavigation={(z) => {
            const r = z.reiter ?? aktiv
            const id = z.rechnung === undefined ? rechnung : z.rechnung
            const e = z.eingang === undefined ? eingang : z.eingang
            void navigate({
              search: {
                ...(r !== standard ? { reiter: r } : {}),
                ...(id ? { rechnung: id } : {}),
                ...(e ? { eingang: e } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
