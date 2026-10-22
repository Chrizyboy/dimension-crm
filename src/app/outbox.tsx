import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Ausgangskorb, meta } from '@/modules/outbox'
import { useAnmeldung } from '@/stores/anmeldung'

/** Ausgangskorb: offener Eintrag in der Adresse (#/outbox?eintrag=…). */
export const Route = createFileRoute('/outbox')({
  validateSearch: (s: Record<string, unknown>): { eintrag?: string } =>
    typeof s.eintrag === 'string' && s.eintrag ? { eintrag: s.eintrag } : {},
  component: function AusgangSeite() {
    const { eintrag } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Ausgangskorb
          offenId={eintrag ?? null}
          onOeffnen={(id) => void navigate({ search: id ? { eintrag: id } : {} })}
        />
      </Suspense>
    )
  },
})
