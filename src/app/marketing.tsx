import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useEffect } from 'react'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import { ANSICHTEN, Marketing, meta, type Ansicht, type ZielFilter } from '@/modules/marketing'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  ansicht?: Ansicht
  /** Rückkehr von der Anmeldung bei Meta, LinkedIn oder Canva (social-rueckruf). */
  verbunden?: string
  ergebnis?: string
  /** Aus der Automation «Nachrüstung»: Filter «Kunden ohne Batterie» usw. vorwählen. */
  anlage?: ZielFilter['anlage']
  /** Offene Kampagnen-Akte (ID oder «neu»). */
  kampagne?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)
const ANLAGEN = new Set<string>(['ohne_batterie', 'ohne_wallbox', 'ohne_waermepumpe', 'alt', 'oel_gas'])

/** Marketing: Reiter in der Adresse (#/marketing?ansicht=social). */
export const Route = createFileRoute('/marketing')({
  validateSearch: (s: Record<string, unknown>): Suche => ({
    ...(typeof s.ansicht === 'string' && GUELTIG.has(s.ansicht) ? { ansicht: s.ansicht as Ansicht } : {}),
    ...(typeof s.verbunden === 'string' ? { verbunden: s.verbunden } : {}),
    ...(typeof s.ergebnis === 'string' ? { ergebnis: s.ergebnis } : {}),
    ...(typeof s.anlage === 'string' && ANLAGEN.has(s.anlage) ? { anlage: s.anlage as ZielFilter['anlage'] } : {}),
    ...(typeof s.kampagne === 'string' && /^(neu|[0-9a-f-]{36})$/.test(s.kampagne) ? { kampagne: s.kampagne } : {}),
  }),
  component: function MarketingSeite() {
    const { ansicht, verbunden, ergebnis, anlage, kampagne } = Route.useSearch()
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
          ansicht={ansicht ?? (anlage ? 'anschreiben' : 'uebersicht')}
          {...(anlage ? { anlage } : {})}
          {...(kampagne ? { kampagne } : {})}
          onAnsicht={(a) => {
            void navigate({ search: a === 'uebersicht' ? {} : { ansicht: a } })
          }}
          onKampagne={(id) => {
            void navigate({
              search: (s) => {
                const rest = { ...s }
                delete rest.kampagne
                return id ? { ...rest, kampagne: id } : rest
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
