import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useEffect } from 'react'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, Marketing, meta, type Ansicht } from '@/modules/marketing'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  /** Rückkehr von der Anmeldung bei Meta, LinkedIn oder Canva (social-rueckruf). */
  verbunden?: string
  ergebnis?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)

/** Marketing: Reiter in der Adresse (#/marketing?ansicht=social). */
export const Route = createFileRoute('/marketing')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(typeof s.verbunden === 'string' ? { verbunden: s.verbunden } : {}),
    ...(typeof s.ergebnis === 'string' ? { ergebnis: s.ergebnis } : {}),
  }),
  component: function MarketingSeite() {
    const { ansicht, verbunden, ergebnis } = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    // Nach der Anmeldung bei einem Dienst: Ergebnis einmal melden und aus der Adresse entfernen
    useEffect(() => {
      if (!ergebnis) return
      if (ergebnis === 'ok') melde('ok', zweisprachig('marketing.verbindung.verbunden', { dienst: verbunden ?? '' }))
      else melde('kritisch', zweisprachig('marketing.verbindung.fehlgeschlagen', { code: ergebnis }))
      void navigate({ search: { ansicht: 'social' }, replace: true })
    }, [ergebnis, verbunden, navigate])
    if (!darfModul(meta, ich)) return <KeinZugriff />
    return (
      <Suspense>
        <Marketing
          ansicht={ansicht ?? 'anschreiben'}
          onAnsicht={(a) => {
            void navigate({ search: a === 'anschreiben' ? {} : { ansicht: a } })
          }}
        />
      </Suspense>
    )
  },
})
