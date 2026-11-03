import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ANSICHTEN, Aufgaben, type Ansicht } from '@/modules/tasks'

interface Suche {
  ansicht?: Ansicht
  aufgabe?: string
  person?: string
}

const GUELTIG = new Set<string>(ANSICHTEN)

/**
 * Aufgaben: immer sichtbar wie «Mein Tag». Ansicht, offene Aufgabe und Person in der Adresse
 * (#/tasks?ansicht=vergeben&aufgabe=…); `?wer=vergeben|alle` aus älteren Links gilt weiter.
 */
export const Route = createFileRoute('/tasks')({
  validateSearch: (s: Record<string, unknown>): Suche => {
    const ansicht = typeof s.ansicht === 'string' ? s.ansicht : typeof s.wer === 'string' ? s.wer : null
    return {
      ...(ansicht && GUELTIG.has(ansicht) ? { ansicht: ansicht as Ansicht } : {}),
      ...(typeof s.aufgabe === 'string' && s.aufgabe ? { aufgabe: s.aufgabe } : {}),
      ...(typeof s.person === 'string' && s.person ? { person: s.person } : {}),
    }
  },
  component: function AufgabenSeite() {
    const { ansicht, aufgabe, person } = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <Suspense>
        <Aufgaben
          ansicht={ansicht ?? 'meine'}
          aufgabeId={aufgabe ?? null}
          person={person ?? null}
          onNavigation={(n) => {
            const a = n.ansicht ?? ansicht ?? 'meine'
            const p = n.person === undefined ? person : n.person
            const f = n.aufgabe === undefined ? aufgabe : n.aufgabe
            void navigate({
              search: {
                ...(a !== 'meine' ? { ansicht: a } : {}),
                ...(p ? { person: p } : {}),
                ...(f ? { aufgabe: f } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
