import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { meta, Vertraege, WARTUNG_REITER, type WartungReiter } from '@/modules/contracts'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  vertrag?: string
  reiter?: WartungReiter
}

/** Wartungsverträge: offener Vertrag in der Adresse (#/contracts?vertrag=…). */
export const Route = createFileRoute('/contracts')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.vertrag === 'string' && s.vertrag ? { vertrag: s.vertrag } : {}),
    ...(WARTUNG_REITER.includes(s.reiter as WartungReiter) && s.reiter !== 'vertraege'
      ? { reiter: s.reiter as WartungReiter }
      : {}),
  }),
  component: function VertraegeSeite() {
    const { vertrag, reiter } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Vertraege
          vertragId={vertrag ?? null}
          reiter={reiter ?? 'vertraege'}
          onOeffnen={(id) => {
            void navigate({
              search: (s) => ({ ...(s.reiter ? { reiter: s.reiter } : {}), ...(id ? { vertrag: id } : {}) }),
            })
          }}
          onReiter={(r) => {
            void navigate({ search: r === 'vertraege' ? {} : { reiter: r } })
          }}
        />
      </Suspense>
    )
  },
})
