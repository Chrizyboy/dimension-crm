import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useState } from 'react'
import { Skelett } from '@/components/ui/diverses'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { Adressbuch, meta, NeuerPartner, PartnerSeite } from '@/modules/contacts'
import { useAnmeldung } from '@/stores/anmeldung'

interface AdressbuchSuche {
  kontakt?: string
}

/**
 * Adressbuch der Geschäftspartner (Entscheid 0045). Der offene Partner steht in der Adresse (#/contacts?kontakt=…)
 * und ist eine ganze Seite; Kunden öffnen sich in ihrer Kundenakte unter «Kunden» (Regel 2: die Route verbindet
 * die Module, sie importieren sich nicht gegenseitig).
 */
export const Route = createFileRoute('/contacts')({
  validateSearch: (s: Record<string, unknown>): AdressbuchSuche =>
    typeof s.kontakt === 'string' && s.kontakt ? { kontakt: s.kontakt } : {},
  component: function AdressbuchSeite() {
    const { kontakt } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    const [neu, setNeu] = useState<{ rolle: string | null } | null>(null)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const oeffne = (id: string | null) => {
      void navigate({ search: id ? { kontakt: id } : {} })
    }
    return (
      <Suspense fallback={<Skelett className="m-6 h-[32rem]" />}>
        {kontakt ? (
          <div className="mx-auto flex w-full max-w-[110rem] flex-col px-4 py-4 sm:px-6">
            <PartnerSeite
              key={kontakt}
              id={kontakt}
              onZurueck={() => {
                oeffne(null)
              }}
            />
          </div>
        ) : (
          <Adressbuch
            aktiveId={null}
            onOeffnen={oeffne}
            onKunde={(id) => void navigate({ to: '/customers', search: { kunde: id } })}
            onNeu={(rolle) => {
              setNeu({ rolle })
            }}
          />
        )}
        {neu && (
          <NeuerPartner
            rolle={neu.rolle}
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
