import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { AUSGANG_ORDNER, Ausgangskorb, meta, type AusgangOrdner } from '@/modules/outbox'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ordner?: AusgangOrdner
  eintrag?: string
}

/** Ausgangskorb: Ordner und offener Eintrag in der Adresse (#/outbox?ordner=fehler&eintrag=…). */
export const Route = createFileRoute('/outbox')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ordner === 'string' && (AUSGANG_ORDNER as readonly string[]).includes(s.ordner)
      ? { ordner: s.ordner as AusgangOrdner }
      : {}),
    ...(typeof s.eintrag === 'string' && s.eintrag ? { eintrag: s.eintrag } : {}),
  }),
  component: function AusgangSeite() {
    const { ordner, eintrag } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Ausgangskorb
          ordner={ordner ?? 'fuer_mich'}
          offenId={eintrag ?? null}
          onNavigation={(z) =>
            void navigate({
              search: (alt) => {
                const o = z.ordner ?? alt.ordner
                const e = z.eintrag === undefined ? alt.eintrag : z.eintrag
                return { ...(o && o !== 'fuer_mich' ? { ordner: o } : {}), ...(e ? { eintrag: e } : {}) }
              },
            })
          }
        />
      </Suspense>
    )
  },
})
