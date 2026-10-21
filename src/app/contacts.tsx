import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useState } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Adressbuch, meta } from '@/modules/contacts'
import { KontaktDialog, Kundenakte, type AkteReiter } from '@/modules/customers'
import { useAnmeldung } from '@/stores/anmeldung'

interface AdressbuchSuche {
  kontakt?: string
  reiter?: AkteReiter
}

const REITER = new Set<string>(['uebersicht', 'zeitachse', 'dokumente'])

/**
 * Adressbuch: alle Kontakte. Geöffnet wird jeder Kontakt mit derselben Akte wie bei den Kunden;
 * die Route setzt beides zusammen, weil Module sich nicht gegenseitig importieren (CLAUDE.md Regel 2).
 */
export const Route = createFileRoute('/contacts')({
  validateSearch: (s: Record<string, unknown>): AdressbuchSuche => ({
    ...(typeof s.kontakt === 'string' && s.kontakt ? { kontakt: s.kontakt } : {}),
    ...(typeof s.reiter === 'string' && REITER.has(s.reiter) ? { reiter: s.reiter as AkteReiter } : {}),
  }),
  component: function AdressbuchSeite() {
    const { kontakt, reiter } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    const [neu, setNeu] = useState<string | null>(null)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const oeffne = (id: string | null, r?: AkteReiter) => {
      void navigate({ search: id ? { kontakt: id, ...(r && r !== 'uebersicht' ? { reiter: r } : {}) } : {} })
    }
    return (
      <Suspense>
        <Adressbuch aktiveId={kontakt ?? null} onOeffnen={oeffne} onNeu={setNeu} />
        {kontakt && (
          <Kundenakte
            id={kontakt}
            reiter={reiter ?? 'uebersicht'}
            onReiter={(r) => {
              oeffne(kontakt, r)
            }}
            onSchliessen={() => {
              oeffne(null)
            }}
          />
        )}
        {neu && (
          <KontaktDialog
            kontaktart={neu}
            onSchliessen={(id) => {
              setNeu(null)
              if (id) oeffne(id)
            }}
          />
        )}
      </Suspense>
    )
  },
})
