import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, Handbuch, meta, type Ansicht } from '@/modules/knowledge'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  kapitel?: string
  stelle?: string
  meldung?: string
  neu?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)
const KENNUNG = /^[a-z0-9-]+$/

/** Alte Links («Anleitung») zeigen auf «Kapitel». */
function ansichtAus(wert: unknown): Ansicht | undefined {
  if (wert === 'anleitung') return 'kapitel'
  return typeof wert === 'string' && GUELTIG.has(wert) ? (wert as Ansicht) : undefined
}

/**
 * Handbuch: Reiter, offenes Kapitel mit Stelle, offene Meldung und «Fehler melden» in der Adresse
 * (#/knowledge?ansicht=kapitel&kapitel=quotes&stelle=so, #/knowledge?ansicht=meldungen&neu=sales).
 */
export const Route = createFileRoute('/knowledge')({
  validateSearch: (s: Record<string, unknown>): Suche => {
    const ansicht = ansichtAus(s.ansicht)
    return {
      ...(ansicht ? { ansicht } : {}),
      ...(typeof s.kapitel === 'string' && KENNUNG.test(s.kapitel) ? { kapitel: s.kapitel } : {}),
      ...(typeof s.stelle === 'string' && KENNUNG.test(s.stelle) ? { stelle: s.stelle } : {}),
      ...(typeof s.meldung === 'string' ? { meldung: s.meldung } : {}),
      ...(typeof s.neu === 'string' ? { neu: s.neu } : {}),
    }
  },
  component: function HandbuchSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const ansicht = suche.ansicht ?? (suche.meldung ? 'meldungen' : suche.kapitel ? 'kapitel' : 'fuerdich')
    return (
      <Suspense>
        <Handbuch
          ansicht={ansicht}
          kapitel={suche.kapitel ?? null}
          stelle={suche.stelle ?? null}
          meldung={suche.meldung ?? null}
          neu={suche.neu ?? null}
          onAdresse={(a) => {
            const wert = <T,>(neu: T | null | undefined, alt: T | undefined): T | undefined =>
              neu === undefined ? alt : (neu ?? undefined)
            const naechste = {
              ansicht: a.ansicht ?? ansicht,
              kapitel: wert(a.kapitel, suche.kapitel),
              stelle: wert(a.stelle, suche.stelle),
              meldung: wert(a.meldung, suche.meldung),
              neu: wert(a.neu, suche.neu),
            }
            void navigate({
              search: {
                ...(naechste.ansicht !== 'fuerdich' ? { ansicht: naechste.ansicht } : {}),
                ...(naechste.kapitel ? { kapitel: naechste.kapitel } : {}),
                ...(naechste.stelle ? { stelle: naechste.stelle } : {}),
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
