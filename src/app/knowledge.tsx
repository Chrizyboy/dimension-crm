import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, Handbuch, meta, type Ansicht } from '@/modules/knowledge'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  meldung?: string
  neu?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)

/** Handbuch: Reiter, offene Meldung und «Fehler melden» in der Adresse (#/knowledge?ansicht=meldungen&neu=sales). */
export const Route = createFileRoute('/knowledge')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(typeof s.meldung === 'string' ? { meldung: s.meldung } : {}),
    ...(typeof s.neu === 'string' ? { neu: s.neu } : {}),
  }),
  component: function HandbuchSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const ansicht = suche.ansicht ?? (suche.meldung ? 'meldungen' : 'anleitung')
    return (
      <Suspense>
        <Handbuch
          ansicht={ansicht}
          meldung={suche.meldung ?? null}
          neu={suche.neu ?? null}
          onAdresse={(a) => {
            const naechste = {
              ansicht: a.ansicht ?? ansicht,
              meldung: a.meldung === undefined ? suche.meldung : a.meldung,
              neu: a.neu === undefined ? suche.neu : a.neu,
            }
            void navigate({
              search: {
                ...(naechste.ansicht !== 'anleitung' ? { ansicht: naechste.ansicht } : {}),
                ...(naechste.meldung ? { meldung: naechste.meldung } : {}),
                ...(naechste.neu ? { neu: naechste.neu } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
