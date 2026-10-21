import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Kunden, meta, type AkteReiter } from '@/modules/customers'
import { useAnmeldung } from '@/stores/anmeldung'

interface KundenSuche {
  kunde?: string
  reiter?: AkteReiter
}

const REITER = new Set<string>(['uebersicht', 'zeitachse', 'dokumente'])

/**
 * Kunden: Liste und 360°-Kundenakte. Die offene Akte und ihr Reiter stehen in der Adresse
 * (#/customers?kunde=…&reiter=zeitachse), damit Zurück im Browser und geteilte Links funktionieren.
 */
export const Route = createFileRoute('/customers')({
  validateSearch: (s: Record<string, unknown>): KundenSuche => ({
    ...(typeof s.kunde === 'string' && s.kunde ? { kunde: s.kunde } : {}),
    ...(typeof s.reiter === 'string' && REITER.has(s.reiter) ? { reiter: s.reiter as AkteReiter } : {}),
  }),
  component: function KundenSeite() {
    const { kunde, reiter } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Kunden
          kundeId={kunde ?? null}
          reiter={reiter ?? 'uebersicht'}
          onAkte={(id, r) => {
            void navigate({ search: id ? { kunde: id, ...(r && r !== 'uebersicht' ? { reiter: r } : {}) } : {} })
          }}
        />
      </Suspense>
    )
  },
})
